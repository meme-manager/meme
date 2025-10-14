/**
 * 数据库操作封装
 * 使用 Tauri SQL 插件操作 SQLite
 */

import Database from '@tauri-apps/plugin-sql';
import { INIT_DATABASE_SQL, SCHEMA_VERSION } from './schema';

let db: Database | null = null;

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    // 连接到 SQLite 数据库
    // 文件位置: ~/Library/Application Support/com.meme-manager/meme.db (macOS)
    db = await Database.load('sqlite:meme.db');
    
    // 启用外键约束
    await db.execute('PRAGMA foreign_keys = ON');
    
    // 检查数据库版本
    const versionResult = await db.select<Array<{ user_version: number }>>(
      'PRAGMA user_version'
    );
    const currentVersion = versionResult[0]?.user_version || 0;
    
    if (currentVersion === 0) {
      // 首次初始化
      console.log('Initializing database...');
      await db.execute(INIT_DATABASE_SQL);
      await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      console.log('Database initialized successfully');
    } else if (currentVersion < SCHEMA_VERSION) {
      // 需要迁移
      console.log(`Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);
      // TODO: 实现数据库迁移逻辑
      await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * 获取数据库实例
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * 执行事务
 */
export async function transaction<T>(
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const database = await getDatabase();
  
  try {
    await database.execute('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.execute('COMMIT');
    return result;
  } catch (error) {
    await database.execute('ROLLBACK');
    throw error;
  }
}

/**
 * 生成UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 获取当前时间戳（毫秒）
 */
export function now(): number {
  return Date.now();
}
