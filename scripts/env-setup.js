#!/usr/bin/env node

/**
 * 环境配置设置脚本
 * 用于初始化不同环境的配置文件
 */

const fs = require('fs');
const path = require('path');

const environments = ['development', 'staging', 'production'];

function createEnvFile(env) {
  const envFile = `.env.${env}`;
  const exampleFile = '.env.example';
  
  if (!fs.existsSync(exampleFile)) {
    console.error(`❌ ${exampleFile} not found`);
    return false;
  }
  
  if (fs.existsSync(envFile)) {
    console.log(`⚠️  ${envFile} already exists, skipping...`);
    return true;
  }
  
  try {
    const exampleContent = fs.readFileSync(exampleFile, 'utf8');
    
    // 根据环境调整配置
    let envContent = exampleContent;
    
    if (env === 'development') {
      envContent = envContent.replace(/APP_ENV=.*/g, 'APP_ENV=development');
      envContent = envContent.replace(/LOG_LEVEL=.*/g, 'LOG_LEVEL=debug');
      envContent = envContent.replace(/API_BASE_URL=.*/g, 'API_BASE_URL=http://localhost:8787');
    } else if (env === 'staging') {
      envContent = envContent.replace(/APP_ENV=.*/g, 'APP_ENV=staging');
      envContent = envContent.replace(/LOG_LEVEL=.*/g, 'LOG_LEVEL=info');
      envContent = envContent.replace(/API_BASE_URL=.*/g, 'API_BASE_URL=https://meme-manager-staging.your-domain.workers.dev');
      envContent = envContent.replace(/meme-manager-db/g, 'meme-manager-db-staging');
      envContent = envContent.replace(/meme-manager-assets/g, 'meme-manager-assets-staging');
      envContent = envContent.replace(/meme-manager-cache/g, 'meme-manager-cache-staging');
    } else if (env === 'production') {
      envContent = envContent.replace(/APP_ENV=.*/g, 'APP_ENV=production');
      envContent = envContent.replace(/LOG_LEVEL=.*/g, 'LOG_LEVEL=warn');
      envContent = envContent.replace(/API_BASE_URL=.*/g, 'API_BASE_URL=https://meme-manager.your-domain.workers.dev');
      envContent = envContent.replace(/meme-manager-db/g, 'meme-manager-db-prod');
      envContent = envContent.replace(/meme-manager-assets/g, 'meme-manager-assets-prod');
      envContent = envContent.replace(/meme-manager-cache/g, 'meme-manager-cache-prod');
    }
    
    fs.writeFileSync(envFile, envContent);
    console.log(`✅ Created ${envFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${envFile}:`, error.message);
    return false;
  }
}

function validateEnvFile(env) {
  const envFile = `.env.${env}`;
  
  if (!fs.existsSync(envFile)) {
    console.error(`❌ ${envFile} not found`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(envFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const requiredVars = [
      'APP_ENV',
      'API_BASE_URL',
      'LOG_LEVEL'
    ];
    
    const missingVars = [];
    
    for (const varName of requiredVars) {
      const found = lines.some(line => line.startsWith(`${varName}=`));
      if (!found) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      console.error(`❌ ${envFile} missing required variables: ${missingVars.join(', ')}`);
      return false;
    }
    
    console.log(`✅ ${envFile} validation passed`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to validate ${envFile}:`, error.message);
    return false;
  }
}

function main() {
  const command = process.argv[2];
  const env = process.argv[3];
  
  if (command === 'init') {
    if (env && environments.includes(env)) {
      createEnvFile(env);
    } else {
      console.log('🚀 Initializing environment files...');
      let success = true;
      for (const environment of environments) {
        if (!createEnvFile(environment)) {
          success = false;
        }
      }
      if (success) {
        console.log('✅ All environment files created successfully');
      }
    }
  } else if (command === 'validate') {
    if (env && environments.includes(env)) {
      validateEnvFile(env);
    } else {
      console.log('🔍 Validating environment files...');
      let success = true;
      for (const environment of environments) {
        if (!validateEnvFile(environment)) {
          success = false;
        }
      }
      if (success) {
        console.log('✅ All environment files validated successfully');
      }
    }
  } else {
    console.log(`
Usage: node scripts/env-setup.js <command> [environment]

Commands:
  init [env]      Initialize environment files
  validate [env]  Validate environment files

Environments: ${environments.join(', ')}

Examples:
  node scripts/env-setup.js init
  node scripts/env-setup.js init development
  node scripts/env-setup.js validate
  node scripts/env-setup.js validate production
    `);
  }
}

main();