use crate::database::{Asset, CreateAssetRequest, CreateTagRequest, Database, Tag};
use anyhow::Result;
use std::sync::Arc;
use tauri::State;

pub type DatabaseState = Arc<Database>;

#[tauri::command]
pub async fn create_asset(
    db: State<'_, DatabaseState>,
    request: CreateAssetRequest,
) -> Result<Asset, String> {
    db.create_asset(request)
        .await
        .map_err(|e| format!("Failed to create asset: {}", e))
}

#[tauri::command]
pub async fn get_asset(db: State<'_, DatabaseState>, id: String) -> Result<Option<Asset>, String> {
    db.get_asset(&id)
        .await
        .map_err(|e| format!("Failed to get asset: {}", e))
}

#[tauri::command]
pub async fn list_assets(
    db: State<'_, DatabaseState>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Asset>, String> {
    db.list_assets(limit, offset)
        .await
        .map_err(|e| format!("Failed to list assets: {}", e))
}

#[tauri::command]
pub async fn delete_asset(db: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    db.delete_asset(&id)
        .await
        .map_err(|e| format!("Failed to delete asset: {}", e))
}

#[tauri::command]
pub async fn create_tag(
    db: State<'_, DatabaseState>,
    request: CreateTagRequest,
) -> Result<Tag, String> {
    db.create_tag(request)
        .await
        .map_err(|e| format!("Failed to create tag: {}", e))
}

#[tauri::command]
pub async fn list_tags(db: State<'_, DatabaseState>) -> Result<Vec<Tag>, String> {
    db.list_tags()
        .await
        .map_err(|e| format!("Failed to list tags: {}", e))
}

#[tauri::command]
pub async fn delete_tag(db: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    db.delete_tag(&id)
        .await
        .map_err(|e| format!("Failed to delete tag: {}", e))
}

#[tauri::command]
pub async fn add_tag_to_asset(
    db: State<'_, DatabaseState>,
    asset_id: String,
    tag_id: String,
) -> Result<(), String> {
    db.add_tag_to_asset(&asset_id, &tag_id)
        .await
        .map_err(|e| format!("Failed to add tag to asset: {}", e))
}

#[tauri::command]
pub async fn remove_tag_from_asset(
    db: State<'_, DatabaseState>,
    asset_id: String,
    tag_id: String,
) -> Result<bool, String> {
    db.remove_tag_from_asset(&asset_id, &tag_id)
        .await
        .map_err(|e| format!("Failed to remove tag from asset: {}", e))
}

#[tauri::command]
pub async fn get_asset_tags(
    db: State<'_, DatabaseState>,
    asset_id: String,
) -> Result<Vec<Tag>, String> {
    db.get_asset_tags(&asset_id)
        .await
        .map_err(|e| format!("Failed to get asset tags: {}", e))
}