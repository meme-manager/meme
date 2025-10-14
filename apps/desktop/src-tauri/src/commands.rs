use std::path::PathBuf;
use std::collections::HashMap;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use image::imageops::FilterType;

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
) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read bytes: {}", e))?;
    
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = format!("{:x}", hasher.finalize());
    
    let file_name = url.split('/').last()
        .unwrap_or("image.png")
        .to_string();
    
    save_asset_file(app, bytes.to_vec(), file_name, hash).await
}