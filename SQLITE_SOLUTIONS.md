# SQLite3 在 Electron 中的集成解决方案

## 问题描述
在 Electron + Vite + TypeScript 项目中，使用 Sequelize + SQLite3 时遇到以下错误：
```
Error: Could not dynamically require "sqlite3". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.
```

## 可能的解决方案

### 方案1：使用 better-sqlite3
1. 卸载 sqlite3：
```bash
yarn remove sqlite3
```

2. 安装 better-sqlite3：
```bash
yarn add better-sqlite3
yarn add -D @types/better-sqlite3
```

3. 修改 database.ts：
```typescript
import Database from 'better-sqlite3';
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    dialectModule: require('better-sqlite3')
});
```

4. 修改 vite.config.ts 中的 external：
```typescript
external: ['better-sqlite3']
```

### 方案2：使用 sequelize-electron
1. 安装 sequelize-electron：
```bash
yarn add sequelize-electron
```

2. 修改 database.ts：
```typescript
import SequelizeElectron from 'sequelize-electron';
const sequelize = SequelizeElectron.createInstance({
    dialect: 'sqlite',
    storage: dbPath
});
```

### 方案3：配置 CommonJS 插件
1. 安装 CommonJS 插件：
```bash
yarn add -D @rollup/plugin-commonjs
```

2. 修改 vite.config.ts：
```typescript
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
    plugins: [
        // ... other plugins
    ],
    build: {
        rollupOptions: {
            plugins: [
                commonjs({
                    dynamicRequireTargets: [
                        'node_modules/sqlite3/**/*.js'
                    ]
                })
            ]
        }
    }
});
```

### 方案4：使用 electron-rebuild
1. 安装 electron-rebuild：
```bash
yarn add -D electron-rebuild
```

2. 修改 package.json 的 scripts：
```json
{
    "scripts": {
        "postinstall": "electron-builder install-app-deps && electron-rebuild",
        "dev": "electron-rebuild && vite"
    }
}
```

### 方案5：直接使用原生 SQLite3
1. 保持 sqlite3 安装：
```bash
yarn add sqlite3
```

2. 修改 vite.config.ts：
```typescript
export default defineConfig({
    build: {
        rollupOptions: {
            external: [
                'sqlite3',
                'sequelize'
            ]
        }
    },
    optimizeDeps: {
        exclude: ['sqlite3', 'sequelize']
    }
});
```

3. 修改 database.ts：
```typescript
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    dialectOptions: {
        mode: require('sqlite3').OPEN_READWRITE | require('sqlite3').OPEN_CREATE
    }
});
```

### 方案6：使用 SQLite3 的预编译版本
1. 修改 package.json：
```json
{
    "scripts": {
        "postinstall": "npm rebuild sqlite3 --build-from-source"
    }
}
```

2. 安装编译工具：
```bash
yarn add -D node-gyp
```

## 测试步骤
1. 每次尝试新方案前，先恢复代码到初始状态
2. 按照方案中的步骤逐步执行
3. 运行 `yarn dev:electron` 测试效果
4. 如果失败，记录错误信息并尝试下一个方案 