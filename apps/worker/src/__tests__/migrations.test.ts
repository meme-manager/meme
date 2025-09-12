import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 迁移文件目录
const MIGRATIONS_DIR = join(__dirname, '../../migrations');

describe('D1 Database Migrations', () => {
  let migrationFiles: string[];

  beforeEach(() => {
    // 获取所有迁移文件
    migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
  });

  describe('Migration Files Structure', () => {
    it('should have at least one migration file', () => {
      expect(migrationFiles.length).toBeGreaterThan(0);
    });

    it('should follow naming convention', () => {
      migrationFiles.forEach(file => {
        // 检查文件名格式：NNNN_description.sql
        expect(file).toMatch(/^\d{4}_[a-z_]+\.sql$/);
      });
    });

    it('should have sequential numbering', () => {
      const numbers = migrationFiles.map(file => {
        const match = file.match(/^(\d{4})/);
        return match ? parseInt(match[1], 10) : 0;
      });

      // 检查编号是否连续
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBe(numbers[i - 1] + 1);
      }
    });
  });

  describe('Migration Content Validation', () => {
    it('should have valid SQL syntax structure', () => {
      migrationFiles.forEach(file => {
        const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
        
        // 基本 SQL 语法检查
        expect(content).toBeTruthy();
        expect(content.trim()).not.toBe('');
        
        // 检查是否包含必要的 SQL 语句
        const hasCreateTable = /CREATE TABLE/i.test(content);
        const hasCreateIndex = /CREATE INDEX/i.test(content);
        
        // 至少应该有创建表或索引的语句
        expect(hasCreateTable || hasCreateIndex).toBe(true);
      });
    });

    it('should have proper migration headers', () => {
      migrationFiles.forEach(file => {
        const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
        const lines = content.split('\n');
        
        // 检查迁移头部注释
        const migrationLine = lines.find(line => line.startsWith('-- Migration:'));
        const descriptionLine = lines.find(line => line.startsWith('-- Description:'));
        
        expect(migrationLine).toBeTruthy();
        expect(descriptionLine).toBeTruthy();
        
        // 检查迁移名称不为空
        const migrationName = migrationLine?.replace('-- Migration:', '').trim();
        expect(migrationName).toBeTruthy();
        expect(migrationName?.length).toBeGreaterThan(0);
      });
    });

    it('should use IF NOT EXISTS for idempotent operations', () => {
      migrationFiles.forEach(file => {
        const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
        
        // 检查 CREATE TABLE 语句是否使用 IF NOT EXISTS
        const createTableMatches = content.match(/CREATE TABLE\s+(?!IF NOT EXISTS)/gi);
        if (createTableMatches) {
          // 如果有 CREATE TABLE 但没有 IF NOT EXISTS，应该失败
          const hasIfNotExists = /CREATE TABLE IF NOT EXISTS/gi.test(content);
          expect(hasIfNotExists).toBe(true);
        }
        
        // 检查 CREATE INDEX 语句是否使用 IF NOT EXISTS
        const createIndexMatches = content.match(/CREATE INDEX\s+(?!IF NOT EXISTS)/gi);
        if (createIndexMatches) {
          const hasIfNotExists = /CREATE INDEX IF NOT EXISTS/gi.test(content);
          expect(hasIfNotExists).toBe(true);
        }
      });
    });
  });

  describe('Initial Schema Validation', () => {
    it('should create all required tables', () => {
      const initialMigration = migrationFiles[0];
      expect(initialMigration).toBe('0001_initial_schema.sql');
      
      const content = readFileSync(join(MIGRATIONS_DIR, initialMigration), 'utf-8');
      
      // 检查必需的表
      const requiredTables = [
        'events',
        'devices', 
        'users',
        'asset_meta',
        'index_state'
      ];
      
      requiredTables.forEach(table => {
        const regex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i');
        expect(content).toMatch(regex);
      });
    });

    it('should have proper table relationships', () => {
      const initialMigration = migrationFiles[0];
      const content = readFileSync(join(MIGRATIONS_DIR, initialMigration), 'utf-8');
      
      // 检查外键约束
      expect(content).toMatch(/FOREIGN KEY.*REFERENCES/i);
      
      // 检查设备表和用户表的关系
      expect(content).toMatch(/deviceId.*REFERENCES devices/i);
      expect(content).toMatch(/userId.*REFERENCES users/i);
    });

    it('should have proper indexes for performance', () => {
      const initialMigration = migrationFiles[0];
      const content = readFileSync(join(MIGRATIONS_DIR, initialMigration), 'utf-8');
      
      // 检查重要字段的索引
      const importantIndexes = [
        'idx_events_device_clock',
        'idx_events_timestamp',
        'idx_events_type',
        'idx_devices_user',
        'idx_asset_meta_hash'
      ];
      
      importantIndexes.forEach(index => {
        const regex = new RegExp(`CREATE INDEX IF NOT EXISTS ${index}`, 'i');
        expect(content).toMatch(regex);
      });
    });

    it('should have proper data types and constraints', () => {
      const initialMigration = migrationFiles[0];
      const content = readFileSync(join(MIGRATIONS_DIR, initialMigration), 'utf-8');
      
      // 检查主键定义
      expect(content).toMatch(/PRIMARY KEY/i);
      
      // 检查 NOT NULL 约束
      expect(content).toMatch(/NOT NULL/i);
      
      // 检查 UNIQUE 约束
      expect(content).toMatch(/UNIQUE/i);
      
      // 检查时间戳字段
      expect(content).toMatch(/clientTimestamp INTEGER|serverTimestamp INTEGER/i);
      
      // 检查 JSON 字段（用于存储事件数据）
      expect(content).toMatch(/payload TEXT NOT NULL/i);
    });
  });

  describe('Migration Script Validation', () => {
    it('should have executable migration script', () => {
      const migrationScript = join(__dirname, '../../scripts/migrate.js');
      
      // 检查文件是否存在
      expect(() => {
        readFileSync(migrationScript, 'utf-8');
      }).not.toThrow();
    });

    it('should have proper script structure', () => {
      const migrationScript = join(__dirname, '../../scripts/migrate.js');
      const content = readFileSync(migrationScript, 'utf-8');
      
      // 检查必要的函数
      expect(content).toMatch(/function migrate/);
      expect(content).toMatch(/function status/);
      expect(content).toMatch(/function rollback/);
      
      // 检查 CLI 处理
      expect(content).toMatch(/process\.argv/);
      
      // 检查错误处理
      expect(content).toMatch(/catch.*err/);
    });
  });

  describe('Wrangler Configuration', () => {
    it('should have proper D1 database bindings', () => {
      const wranglerConfig = join(__dirname, '../../wrangler.toml');
      const content = readFileSync(wranglerConfig, 'utf-8');
      
      // 检查 D1 数据库绑定
      expect(content).toMatch(/\[\[d1_databases\]\]/);
      expect(content).toMatch(/binding = "DB"/);
      expect(content).toMatch(/database_name = "meme-manager-db"/);
      
      // 检查环境配置
      expect(content).toMatch(/\[env\.dev\]/);
      expect(content).toMatch(/\[env\.staging\]/);
      expect(content).toMatch(/\[env\.production\]/);
    });
  });

  describe('Package Scripts', () => {
    it('should have migration scripts in package.json', () => {
      const packageJson = join(__dirname, '../../package.json');
      const content = JSON.parse(readFileSync(packageJson, 'utf-8'));
      
      // 检查迁移脚本
      expect(content.scripts).toHaveProperty('db:migrate');
      expect(content.scripts).toHaveProperty('db:migrate:dev');
      expect(content.scripts).toHaveProperty('db:migrate:staging');
      expect(content.scripts).toHaveProperty('db:migrate:production');
      expect(content.scripts).toHaveProperty('db:status');
    });
  });

  describe('Migration Repeatability', () => {
    it('should be safe to run migrations multiple times', () => {
      migrationFiles.forEach(file => {
        const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
        
        // 检查幂等性 - 所有 CREATE 语句都应该使用 IF NOT EXISTS
        const createStatements = content.match(/CREATE\s+(TABLE|INDEX|TRIGGER|VIEW)/gi);
        
        if (createStatements) {
          createStatements.forEach(statement => {
            // 检查这个 CREATE 语句是否包含 IF NOT EXISTS
            const statementType = statement.match(/CREATE\s+(\w+)/i)?.[1];
            const pattern = new RegExp(`CREATE\\s+${statementType}\\s+IF\\s+NOT\\s+EXISTS`, 'i');
            const hasIfNotExists = pattern.test(content);
            
            expect(hasIfNotExists).toBe(true);
          });
        }
      });
    });

    it('should handle migration state tracking', () => {
      const migrationScript = join(__dirname, '../../scripts/migrate.js');
      const content = readFileSync(migrationScript, 'utf-8');
      
      // 检查迁移状态跟踪
      expect(content).toMatch(/_migrations/);
      expect(content).toMatch(/CREATE TABLE IF NOT EXISTS _migrations/);
      expect(content).toMatch(/filename.*UNIQUE.*NOT NULL/);
      expect(content).toMatch(/migration_name.*NOT NULL/);
      expect(content).toMatch(/checksum.*NOT NULL/);
      expect(content).toMatch(/executed_at.*NOT NULL/);
    });
  });

  describe('Error Handling', () => {
    it('should have proper error handling in migration script', () => {
      const migrationScript = join(__dirname, '../../scripts/migrate.js');
      const content = readFileSync(migrationScript, 'utf-8');
      
      // 检查错误处理
      expect(content).toMatch(/catch.*err/);
      expect(content).toMatch(/process\.exit\(1\)/);
      expect(content).toMatch(/error.*message/);
    });

    it('should validate migration checksums', () => {
      const migrationScript = join(__dirname, '../../scripts/migrate.js');
      const content = readFileSync(migrationScript, 'utf-8');
      
      // 检查校验和计算
      expect(content).toMatch(/checksum/);
      expect(content).toMatch(/sha256/);
      expect(content).toMatch(/calculateChecksum/);
    });
  });
});