use std::sync::Arc;
use tauri::Manager;

mod database;
mod commands;

use commands::DatabaseState;
use database::Database;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 初始化数据库
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            
            // 确保应用数据目录存在
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");
            
            let db_path = app_data_dir.join("meme_manager.db");
            
            // 使用 tokio runtime 初始化数据库
            let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
            let database = rt.block_on(async {
                Database::new(db_path).await.expect("Failed to initialize database")
            });
            
            // 将数据库实例存储到应用状态中
            app.manage(Arc::new(database) as DatabaseState);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::create_asset,
            commands::get_asset,
            commands::list_assets,
            commands::delete_asset,
            commands::create_tag,
            commands::list_tags,
            commands::delete_tag,
            commands::add_tag_to_asset,
            commands::remove_tag_from_asset,
            commands::get_asset_tags,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
