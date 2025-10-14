// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            tauri_app_lib::commands::save_asset_file,
            tauri_app_lib::commands::generate_thumbnails,
            tauri_app_lib::commands::import_from_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
