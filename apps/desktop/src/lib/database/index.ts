/**
 * 数据库操作封装
 * 使用 Tauri SQL 插件操作 SQLite
 */

import Database from '@tauri-apps/plugin-sql';
import { INIT_DATABASE_SQL, SCHEMA_VERSION, MIGRATIONS } from './schema';

let db: Database | null = null;

/**
 * 初始化数据库连接
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    console.log('[Database] ✅ 数据库已初始化，使用现有连接');
    return db;
  }

  try {
    console.log('[Database] 🔄 开始初始化数据库...');
    
    // 连接到 SQLite 数据库
    // 文件位置: ~/Library/Application Support/com.meme-manager/meme.db (macOS)
    db = await Database.load('sqlite:meme.db');
    console.log('[Database] ✅ 数据库连接成功');
    
    // 启用外键约束
    await db.execute('PRAGMA foreign_keys = ON');
    console.log('[Database] ✅ 外键约束已启用');
    
    // 检查数据库版本
    const versionResult = await db.select<Array<{ user_version: number }>>(
      'PRAGMA user_version'
    );
    const currentVersion = versionResult[0]?.user_version || 0;
    console.log(`[Database] 📊 当前数据库版本: ${currentVersion}, 目标版本: ${SCHEMA_VERSION}`);
    
    if (currentVersion === 0) {
      // 首次初始化
      console.log('Initializing database...');
      await db.execute(INIT_DATABASE_SQL);
      await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      console.log('Database initialized successfully');
    } else if (currentVersion < SCHEMA_VERSION) {
      // 需要迁移
      console.log(`Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);
      
      // 逐步应用迁移
      for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
        if (MIGRATIONS[version]) {
          console.log(`Applying migration to version ${version}...`);
          
          // 分割 SQL 语句并逐条执行
          const statements = MIGRATIONS[version]
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));
          
          for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await db.execute(statement);
          }
          
          console.log(`Migration to version ${version} completed`);
        }
      }
      
      // 更新版本号
      await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      console.log(`Database migrated successfully to version ${SCHEMA_VERSION}`);
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
 * 重新初始化数据库（强制重新连接）
 */
export async function reinitDatabase(): Promise<Database> {
  console.log('Forcing database reconnection...');
  db = null;
  return await initDatabase();
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
