mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::save_asset_file,
            commands::generate_thumbnails,
            commands::import_from_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
