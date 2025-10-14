use std::path::PathBuf;
use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use image::imageops::FilterType;
use arboard::{Clipboard, ImageData};
use std::borrow::Cow;

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
            
            // 根据文件扩展名设置正确的UTI类型
            let path = std::path::Path::new(&file_path);
            let extension = path.extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            
            let uti_type = match extension.as_str() {
                "gif" => "com.compuserve.gif",
                "png" => "public.png",
                "jpg" | "jpeg" => "public.jpeg",
                "webp" => "org.webmproject.webp",
                _ => "public.png",
            };
            
            // 创建NSString类型
            let ns_type = NSString::alloc(nil);
            let ns_type = NSString::init_str(ns_type, uti_type);
            
            // 设置数据到剪贴板
            let success: bool = msg_send![pasteboard, setData:ns_data forType:ns_type];
            
            if success {
                Ok("success".to_string())
            } else {
                Err("Failed to set clipboard data".to_string())
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