#!/usr/bin/env node

/**
 * D1 数据库迁移脚本
 * 支持本地和远程环境的数据库迁移
 */

import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const MIGRATIONS_DIR = join(__dirname, '../migrations');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 获取迁移文件列表
function getMigrationFiles() {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files.map(file => {
      const filePath = join(MIGRATIONS_DIR, file);
      const content = readFileSync(filePath, 'utf-8');
      const stats = statSync(filePath);
      
      // 解析迁移文件头部注释
      const lines = content.split('\n');
      const migrationMatch = lines.find(line => line.startsWith('-- Migration:'));
      const descriptionMatch = lines.find(line => line.startsWith('-- Description:'));
      
      return {
        filename: file,
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtime,
        migration: migrationMatch ? migrationMatch.replace('-- Migration:', '').trim() : file,
        description: descriptionMatch ? descriptionMatch.replace('-- Description:', '').trim() : '',
      };
    });
  } catch (err) {
    error(`Failed to read migrations directory: ${err.message}`);
    process.exit(1);
  }
}

// 执行 wrangler 命令
function executeWrangler(command, env = 'dev') {
  try {
    info(`Executing: wrangler ${command} --env ${env}`);
    const output = execSync(`npx wrangler ${command} --env ${env}`, {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return output;
  } catch (err) {
    error(`Wrangler command failed: ${err.message}`);
    throw err;
  }
}

// 创建迁移表
async function createMigrationTable(env) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      migration_name TEXT NOT NULL,
      description TEXT,
      checksum TEXT NOT NULL,
      executed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      execution_time_ms INTEGER
    );
    
    CREATE INDEX IF NOT EXISTS idx_migrations_filename ON _migrations(filename);
    CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON _migrations(executed_at);
  `;
  
  try {
    const tempFile = join(__dirname, '../temp_create_migrations_table.sql');
    writeFileSync(tempFile, createTableSQL);
    
    executeWrangler(`d1 execute meme-manager-db --file temp_create_migrations_table.sql`, env);
    
    unlinkSync(tempFile);
    success('Migration table created successfully');
  } catch (err) {
    error(`Failed to create migration table: ${err.message}`);
    throw err;
  }
}

// 计算文件校验和
function calculateChecksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

// 执行单个迁移
async function executeMigration(migration, env) {
  const startTime = Date.now();
  
  try {
    info(`Executing migration: ${migration.migration}`);
    
    const tempFile = join(__dirname, `../temp_migration_${Date.now()}.sql`);
    writeFileSync(tempFile, migration.content);
    
    executeWrangler(`d1 execute meme-manager-db --file ${tempFile.split('/').pop()}`, env);
    
    unlinkSync(tempFile);
    
    const executionTime = Date.now() - startTime;
    const checksum = calculateChecksum(migration.content);
    
    const recordSQL = `
      INSERT INTO _migrations (filename, migration_name, description, checksum, execution_time_ms)
      VALUES ('${migration.filename}', '${migration.migration}', '${migration.description}', '${checksum}', ${executionTime});
    `;
    
    const recordFile = join(__dirname, '../temp_record_migration.sql');
    writeFileSync(recordFile, recordSQL);
    
    executeWrangler(`d1 execute meme-manager-db --file temp_record_migration.sql`, env);
    
    unlinkSync(recordFile);
    
    success(`Migration ${migration.migration} executed successfully (${executionTime}ms)`);
    
  } catch (err) {
    error(`Failed to execute migration ${migration.migration}: ${err.message}`);
    throw err;
  }
}

// 主迁移函数
async function migrate(env = 'dev', options = {}) {
  const { dryRun = false } = options;
  
  info(`Starting migration for environment: ${env}`);
  
  if (dryRun) {
    warn('DRY RUN MODE - No changes will be made');
  }
  
  try {
    const migrations = getMigrationFiles();
    info(`Found ${migrations.length} migration files`);
    
    if (migrations.length === 0) {
      warn('No migration files found');
      return;
    }
    
    if (!dryRun) {
      await createMigrationTable(env);
    }
    
    if (dryRun) {
      info('DRY RUN: Would execute the following migrations:');
      migrations.forEach(m => {
        console.log(`  - ${m.migration}: ${m.description}`);
      });
      return;
    }
    
    for (const migration of migrations) {
      await executeMigration(migration, env);
    }
    
    success(`Successfully executed ${migrations.length} migrations`);
    
  } catch (err) {
    error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// 显示迁移状态
async function status(env = 'dev') {
  info(`Migration status for environment: ${env}`);
  
  try {
    const migrations = getMigrationFiles();
    
    console.log('\nMigration Status:');
    console.log('─'.repeat(80));
    
    migrations.forEach(migration => {
      console.log(`⏳ Pending ${migration.migration}`);
      console.log(`   File: ${migration.filename}`);
      console.log(`   Description: ${migration.description}`);
      console.log('');
    });
    
  } catch (err) {
    error(`Failed to get migration status: ${err.message}`);
    process.exit(1);
  }
}

// 回滚迁移（简单实现）
async function rollback(env = 'dev', steps = 1) {
  warn(`Rollback is not implemented yet. This would rollback ${steps} migrations in ${env} environment.`);
  warn('Manual rollback may be required by running reverse SQL statements.');
}

// CLI 处理
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'dev';
  const dryRun = args.includes('--dry-run');
  
  switch (command) {
    case 'migrate':
    case 'up':
      migrate(env, { dryRun });
      break;
      
    case 'status':
      status(env);
      break;
      
    case 'rollback':
    case 'down':
      const steps = parseInt(args.find(arg => arg.startsWith('--steps='))?.split('=')[1]) || 1;
      rollback(env, steps);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
D1 Migration Tool

Usage:
  node migrate.js [command] [options]

Commands:
  migrate, up     Run pending migrations (default)
  status          Show migration status
  rollback, down  Rollback migrations (not implemented)
  help            Show this help

Options:
  --env=<env>     Environment (dev, staging, production) [default: dev]
  --dry-run       Show what would be executed without making changes

Examples:
  node migrate.js                           # Run migrations in dev environment
  node migrate.js --env=production          # Run migrations in production
  node migrate.js status --env=staging      # Check status in staging
  node migrate.js --dry-run                 # Preview what would be executed
      `);
      break;
      
    default:
      error(`Unknown command: ${command}`);
      console.log('Run "node migrate.js help" for usage information.');
      process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrate, status, rollback };