use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetTag {
    pub asset_id: String,
    pub tag_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAssetRequest {
    pub file_path: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub color: Option<String>,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(db_path: PathBuf) -> Result<Self> {
        // 确保数据库目录存在
        if let Some(parent) = db_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let database_url = format!("sqlite://{}?mode=rwc", db_path.display());
        let pool = SqlitePool::connect(&database_url).await?;

        let db = Database { pool };
        db.migrate().await?;
        Ok(db)
    }

    async fn migrate(&self) -> Result<()> {
        // 创建 assets 表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS assets (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL UNIQUE,
                file_name TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type TEXT NOT NULL,
                width INTEGER,
                height INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 创建 tags 表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                color TEXT,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 创建 asset_tags 关联表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS asset_tags (
                asset_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (asset_id, tag_id),
                FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // 创建索引
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets (created_at)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_assets_file_name ON assets (file_name)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // Asset 操作
    pub async fn create_asset(&self, req: CreateAssetRequest) -> Result<Asset> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let asset = Asset {
            id: id.clone(),
            file_path: req.file_path,
            file_name: req.file_name,
            file_size: req.file_size,
            mime_type: req.mime_type,
            width: req.width,
            height: req.height,
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            r#"
            INSERT INTO assets (id, file_path, file_name, file_size, mime_type, width, height, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&asset.id)
        .bind(&asset.file_path)
        .bind(&asset.file_name)
        .bind(asset.file_size)
        .bind(&asset.mime_type)
        .bind(asset.width)
        .bind(asset.height)
        .bind(asset.created_at.to_rfc3339())
        .bind(asset.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(asset)
    }

    pub async fn get_asset(&self, id: &str) -> Result<Option<Asset>> {
        let row = sqlx::query("SELECT * FROM assets WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(Asset {
                id: row.get("id"),
                file_path: row.get("file_path"),
                file_name: row.get("file_name"),
                file_size: row.get("file_size"),
                mime_type: row.get("mime_type"),
                width: row.get("width"),
                height: row.get("height"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?
                    .with_timezone(&Utc),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn list_assets(&self, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Asset>> {
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let rows = sqlx::query("SELECT * FROM assets ORDER BY created_at DESC LIMIT ? OFFSET ?")
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

        let mut assets = Vec::new();
        for row in rows {
            assets.push(Asset {
                id: row.get("id"),
                file_path: row.get("file_path"),
                file_name: row.get("file_name"),
                file_size: row.get("file_size"),
                mime_type: row.get("mime_type"),
                width: row.get("width"),
                height: row.get("height"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("updated_at"))?
                    .with_timezone(&Utc),
            });
        }

        Ok(assets)
    }

    pub async fn delete_asset(&self, id: &str) -> Result<bool> {
        let result = sqlx::query("DELETE FROM assets WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // Tag 操作
    pub async fn create_tag(&self, req: CreateTagRequest) -> Result<Tag> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let tag = Tag {
            id: id.clone(),
            name: req.name,
            color: req.color,
            created_at: now,
        };

        sqlx::query(
            r#"
            INSERT INTO tags (id, name, color, created_at)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(&tag.id)
        .bind(&tag.name)
        .bind(&tag.color)
        .bind(tag.created_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(tag)
    }

    pub async fn list_tags(&self) -> Result<Vec<Tag>> {
        let rows = sqlx::query("SELECT * FROM tags ORDER BY name")
            .fetch_all(&self.pool)
            .await?;

        let mut tags = Vec::new();
        for row in rows {
            tags.push(Tag {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?
                    .with_timezone(&Utc),
            });
        }

        Ok(tags)
    }

    pub async fn delete_tag(&self, id: &str) -> Result<bool> {
        let result = sqlx::query("DELETE FROM tags WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // Asset-Tag 关联操作
    pub async fn add_tag_to_asset(&self, asset_id: &str, tag_id: &str) -> Result<()> {
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT OR IGNORE INTO asset_tags (asset_id, tag_id, created_at)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(asset_id)
        .bind(tag_id)
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn remove_tag_from_asset(&self, asset_id: &str, tag_id: &str) -> Result<bool> {
        let result = sqlx::query("DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?")
            .bind(asset_id)
            .bind(tag_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_asset_tags(&self, asset_id: &str) -> Result<Vec<Tag>> {
        let rows = sqlx::query(
            r#"
            SELECT t.* FROM tags t
            INNER JOIN asset_tags at ON t.id = at.tag_id
            WHERE at.asset_id = ?
            ORDER BY t.name
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await?;

        let mut tags = Vec::new();
        for row in rows {
            tags.push(Tag {
                id: row.get("id"),
                name: row.get("name"),
                color: row.get("color"),
                created_at: DateTime::parse_from_rfc3339(&row.get::<String, _>("created_at"))?
                    .with_timezone(&Utc),
            });
        }

        Ok(tags)
    }
}