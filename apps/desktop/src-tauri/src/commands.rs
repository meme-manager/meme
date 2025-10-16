use std::path::{Path, PathBuf};
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use image::imageops::FilterType;

#[cfg(not(target_os = "macos"))]
use arboard::{Clipboard, ImageData};
#[cfg(not(target_os = "macos"))]
use std::borrow::Cow;

#[cfg(target_os = "macos")]
fn create_tiff_data(width: u32, height: u32, rgba_data: &[u8]) -> Vec<u8> {
    // 简单的未压缩TIFF格式
    let mut tiff = Vec::new();
    
    // TIFF Header (Little Endian)
    tiff.extend_from_slice(&[0x49, 0x49]); // "II" - Little Endian
    tiff.extend_from_slice(&[0x2A, 0x00]); // TIFF magic number
    tiff.extend_from_slice(&[0x08, 0x00, 0x00, 0x00]); // Offset to first IFD
    
    // Image data starts at offset 8 + IFD size
    let ifd_size: u32 = 2 + 12 * 11 + 4; // tag count + 11 tags * 12 bytes + next IFD offset
    let data_offset: u32 = 8 + ifd_size;
    
    // IFD (Image File Directory)
    tiff.extend_from_slice(&[0x0B, 0x00]); // 11 tags
    
    // Tag 1: ImageWidth
    tiff.extend_from_slice(&[0x00, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00]);
    tiff.extend_from_slice(&width.to_le_bytes());
    
    // Tag 2: ImageLength
    tiff.extend_from_slice(&[0x01, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00]);
    tiff.extend_from_slice(&height.to_le_bytes());
    
    // Tag 3: BitsPerSample (8,8,8,8 for RGBA)
    tiff.extend_from_slice(&[0x02, 0x01, 0x03, 0x00, 0x04, 0x00, 0x00, 0x00]);
    tiff.extend_from_slice(&[0x08, 0x00, 0x08, 0x00, 0x08, 0x00, 0x08, 0x00]);
    
    // Tag 4: Compression (1 = no compression)
    tiff.extend_from_slice(&[0x03, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
    
    // Tag 5: PhotometricInterpretation (2 = RGB)
    tiff.extend_from_slice(&[0x06, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
    
    // Tag 6: StripOffsets
    tiff.extend_from_slice(&[0x11, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00]);
    tiff.extend_from_slice(&data_offset.to_le_bytes());
    
    // Tag 7: SamplesPerPixel (4 for RGBA)
    tiff.extend_from_slice(&[0x15, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    
    // Tag 8: RowsPerStrip
    tiff.extend_from_slice(&[0x16, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00]);
    tiff.extend_from_slice(&height.to_le_bytes());
    
    // Tag 9: StripByteCounts
    let byte_count = (width * height * 4) as u32;
    tiff.extend_from_slice(&[0x17, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00]);
    tiff.extend_from_slice(&byte_count.to_le_bytes());
    
    // Tag 10: PlanarConfiguration (1 = chunky)
    tiff.extend_from_slice(&[0x1C, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
    
    // Tag 11: ExtraSamples (2 = unassociated alpha)
    tiff.extend_from_slice(&[0x52, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
    
    // Next IFD offset (0 = no more IFDs)
    tiff.extend_from_slice(&[0x00, 0x00, 0x00, 0x00]);
    
    // Image data
    tiff.extend_from_slice(rgba_data);
    
    tiff
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThumbnailSizes {
    pub small: u32,
    pub medium: u32,
    pub large: u32,
}

/// 保存资产文件到本地
#[tauri::command]
pub async fn save_asset_file(
    app: AppHandle,
    file_data: Vec<u8>,
    file_name: String,
    hash: String,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let assets_dir = app_data_dir.join("assets");
    std::fs::create_dir_all(&assets_dir)
        .map_err(|e| format!("Failed to create assets dir: {}", e))?;
    
    let path_buf = PathBuf::from(&file_name);
    let extension = path_buf
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png");
    
    let file_path = assets_dir.join(format!("{}.{}", hash, extension));
    
    std::fs::write(&file_path, file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

/// 生成缩略图
#[tauri::command]
pub async fn generate_thumbnails(
    app: AppHandle,
    source_path: String,
    sizes: ThumbnailSizes,
) -> Result<HashMap<String, String>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let thumbs_dir = app_data_dir.join("thumbs");
    std::fs::create_dir_all(&thumbs_dir)
        .map_err(|e| format!("Failed to create thumbs dir: {}", e))?;
    
    let img = image::open(&source_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;
    
    let source_path_buf = PathBuf::from(&source_path);
    let hash = source_path_buf
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid file name")?;
    
    let mut results = HashMap::new();
    
    // 生成小尺寸缩略图
    let thumb_small = img.resize(sizes.small, sizes.small, FilterType::Lanczos3);
    let small_path = thumbs_dir.join(format!("{}_{}.webp", hash, sizes.small));
    thumb_small.save(&small_path)
        .map_err(|e| format!("Failed to save small thumbnail: {}", e))?;
    results.insert("small".to_string(), small_path.to_string_lossy().to_string());
    
    // 生成中尺寸缩略图
    let thumb_medium = img.resize(sizes.medium, sizes.medium, FilterType::Lanczos3);
    let medium_path = thumbs_dir.join(format!("{}_{}.webp", hash, sizes.medium));
    thumb_medium.save(&medium_path)
        .map_err(|e| format!("Failed to save medium thumbnail: {}", e))?;
    results.insert("medium".to_string(), medium_path.to_string_lossy().to_string());
    
    // 生成大尺寸缩略图
    let thumb_large = img.resize(sizes.large, sizes.large, FilterType::Lanczos3);
    let large_path = thumbs_dir.join(format!("{}_{}.webp", hash, sizes.large));
    thumb_large.save(&large_path)
        .map_err(|e| format!("Failed to save large thumbnail: {}", e))?;
    results.insert("large".to_string(), large_path.to_string_lossy().to_string());
    
    Ok(results)
}

/// 从URL导入图片
#[tauri::command]
pub async fn import_from_url(
    app: AppHandle,
    url: String,
) -> Result<HashMap<String, String>, String> {
    // 下载图片
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read bytes: {}", e))?;
    
    // 计算哈希
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = format!("{:x}", hasher.finalize());
    
    // 提取文件名
    let file_name = url.split('/').last()
        .unwrap_or("image.png")
        .to_string();
    
    // 保存文件
    let file_path = save_asset_file(app.clone(), bytes.to_vec(), file_name.clone(), hash.clone()).await?;
    
    // 生成缩略图
    let sizes = ThumbnailSizes {
        small: 128,
        medium: 256,
        large: 512,
    };
    let thumbnails = generate_thumbnails(app, file_path.clone(), sizes).await?;
    
    // 返回文件信息
    let mut result = HashMap::new();
    result.insert("file_path".to_string(), file_path);
    result.insert("file_name".to_string(), file_name);
    result.insert("hash".to_string(), hash);
    result.insert("thumb_small".to_string(), thumbnails.get("small").cloned().unwrap_or_default());
    result.insert("thumb_medium".to_string(), thumbnails.get("medium").cloned().unwrap_or_default());
    result.insert("thumb_large".to_string(), thumbnails.get("large").cloned().unwrap_or_default());
    
    Ok(result)
}

/// 删除资产文件（包括原图和缩略图）
#[tauri::command]
pub async fn delete_asset_files(
    app: AppHandle,
    file_path: String,
) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    
    println!("[Rust] 开始删除文件: {}", file_path);
    
    // 删除原图文件
    let path = Path::new(&file_path);
    if path.exists() {
        println!("[Rust] 文件存在，正在删除...");
        fs::remove_file(path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
        println!("[Rust] 原图文件删除成功");
    } else {
        println!("[Rust] 警告：文件不存在: {}", file_path);
    }
    
    // 删除缩略图
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let thumbs_dir = app_data_dir.join("thumbs");
    println!("[Rust] 缩略图目录: {:?}", thumbs_dir);
    
    // 从文件路径提取哈希值
    if let Some(file_stem) = path.file_stem().and_then(|s| s.to_str()) {
        println!("[Rust] 文件哈希: {}", file_stem);
        // 删除所有尺寸的缩略图
        for size in &["128", "256", "512"] {
            let thumb_path = thumbs_dir.join(format!("{}_{}.webp", file_stem, size));
            if thumb_path.exists() {
                match fs::remove_file(&thumb_path) {
                    Ok(_) => println!("[Rust] 删除缩略图成功: {:?}", thumb_path),
                    Err(e) => println!("[Rust] 删除缩略图失败: {:?}, 错误: {}", thumb_path, e),
                }
            } else {
                println!("[Rust] 缩略图不存在: {:?}", thumb_path);
            }
        }
    }
    
    println!("[Rust] 文件删除完成");
    Ok(())
}

/// 导出资产到 ZIP 压缩包
#[tauri::command]
pub async fn export_assets(
    asset_paths: Vec<String>,
    export_path: String,
) -> Result<usize, String> {
    use std::fs::{self, File};
    use std::io::{Write, Read};
    use std::path::Path;
    use zip::write::FileOptions;
    use zip::ZipWriter;
    
    // export_path 应该是一个 .zip 文件路径
    let zip_path = if export_path.ends_with(".zip") {
        export_path
    } else {
        // 如果用户选择的是文件夹，生成一个默认的 zip 文件名
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        format!("{}/meme_export_{}.zip", export_path, timestamp)
    };
    
    println!("[Export] 创建 ZIP 文件: {}", zip_path);
    
    let file = File::create(&zip_path)
        .map_err(|e| format!("无法创建 ZIP 文件: {}", e))?;
    
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);
    
    let mut success_count = 0;
    
    for asset_path in asset_paths {
        let source = Path::new(&asset_path);
        if !source.exists() {
            println!("[Export] 文件不存在，跳过: {}", asset_path);
            continue;
        }
        
        // 获取文件名
        let file_name = source.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| format!("无效的文件名: {}", asset_path))?;
        
        // 读取文件内容
        match fs::read(&source) {
            Ok(content) => {
                // 添加到 ZIP
                match zip.start_file(file_name, options) {
                    Ok(_) => {
                        match zip.write_all(&content) {
                            Ok(_) => {
                                println!("[Export] 添加到 ZIP 成功: {}", file_name);
                                success_count += 1;
                            }
                            Err(e) => {
                                println!("[Export] 写入 ZIP 失败: {}, 错误: {}", file_name, e);
                            }
                        }
                    }
                    Err(e) => {
                        println!("[Export] 创建 ZIP 条目失败: {}, 错误: {}", file_name, e);
                    }
                }
            }
            Err(e) => {
                println!("[Export] 读取文件失败: {}, 错误: {}", asset_path, e);
            }
        }
    }
    
    // 完成 ZIP 文件
    zip.finish()
        .map_err(|e| format!("完成 ZIP 文件失败: {}", e))?;
    
    println!("[Export] ZIP 文件创建完成: {}", zip_path);
    Ok(success_count)
}

/// 复制图片到剪贴板
#[tauri::command]
pub async fn copy_image_to_clipboard(
    file_path: String,
) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::fs;
        use cocoa::base::{nil, id};
        use cocoa::foundation::{NSData, NSString};
        use objc::{class, msg_send, sel, sel_impl};
        
        unsafe {
            // 读取文件数据
            let file_data = fs::read(&file_path)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            
            // 创建NSData
            let ns_data: id = NSData::dataWithBytes_length_(
                nil,
                file_data.as_ptr() as *const std::ffi::c_void,
                file_data.len() as u64,
            );
            
            // 获取通用剪贴板
            let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];
            
            // 清空剪贴板
            let _: () = msg_send![pasteboard, clearContents];
            
            // 根据文件扩展名设置正确的剪贴板类型
            let path = std::path::Path::new(&file_path);
            let extension = path.extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            
            // 对于GIF，同时提供GIF数据和TIFF数据
            if extension == "gif" {
                // 1. 先设置GIF数据（支持动画的应用会使用这个）
                let gif_type = NSString::alloc(nil);
                let gif_type = NSString::init_str(gif_type, "com.compuserve.gif");
                let _: bool = msg_send![pasteboard, setData:ns_data forType:gif_type];
                
                // 2. 再添加TIFF数据作为备选（不支持GIF的应用会使用这个）
                // 使用image库读取第一帧
                let img = image::open(&file_path)
                    .map_err(|e| format!("Failed to open GIF: {}", e))?;
                let rgba = img.to_rgba8();
                let (width, height) = rgba.dimensions();
                
                // 转换为TIFF格式（macOS剪贴板的标准格式）
                let tiff_type = NSString::alloc(nil);
                let tiff_type = NSString::init_str(tiff_type, "public.tiff");
                
                // 创建TIFF数据
                let tiff_data = create_tiff_data(width, height, rgba.as_raw());
                let ns_tiff_data: id = NSData::dataWithBytes_length_(
                    nil,
                    tiff_data.as_ptr() as *const std::ffi::c_void,
                    tiff_data.len() as u64,
                );
                let _: bool = msg_send![pasteboard, setData:ns_tiff_data forType:tiff_type];
                
                Ok("success".to_string())
            } else {
                // 对于其他格式，直接设置原始数据
                let uti_type = match extension.as_str() {
                    "png" => "public.png",
                    "jpg" | "jpeg" => "public.jpeg",
                    _ => "public.png",
                };
                
                let ns_type = NSString::alloc(nil);
                let ns_type = NSString::init_str(ns_type, uti_type);
                let success: bool = msg_send![pasteboard, setData:ns_data forType:ns_type];
                
                if success {
                    Ok("success".to_string())
                } else {
                    Err("Failed to set clipboard data".to_string())
                }
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        use std::path::Path;
        
        let path = Path::new(&file_path);
        let extension = path.extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        
        // 读取并解码图片
        let img = image::open(&file_path)
            .map_err(|e| format!("Failed to open image: {}", e))?;
        
        // 转换为RGBA格式
        let rgba = img.to_rgba8();
        let (width, height) = rgba.dimensions();
        
        // 创建ImageData
        let image_data = ImageData {
            width: width as usize,
            height: height as usize,
            bytes: Cow::from(rgba.as_raw().as_slice()),
        };
        
        // 复制到剪贴板
        let mut clipboard = Clipboard::new()
            .map_err(|e| format!("Failed to access clipboard: {}", e))?;
        
        clipboard.set_image(image_data)
            .map_err(|e| format!("Failed to copy image: {}", e))?;
        
        // 如果是GIF，返回提示信息
        if extension == "gif" {
            Ok("gif_warning".to_string())
        } else {
            Ok("success".to_string())
        }
    }
}

/// 读取文件的二进制数据
#[tauri::command]
pub fn read_file_binary(file_path: String) -> Result<Vec<u8>, String> {
    fs::read(&file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))
}

/// 检查文件是否存在
#[tauri::command]
pub fn file_exists(file_path: String) -> bool {
    Path::new(&file_path).exists()
}