// 环境配置管理
export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  env: Environment;
  appName: string;
  appVersion: string;
  api: {
    baseUrl: string;
    timeout: number;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    thumbnailSizes: string[];
  };
  cache: {
    ttl: number;
    hotCacheTtl: number;
  };
  rateLimit: {
    requests: number;
    window: number;
  };
  features: {
    enableDevTools: boolean;
    hotReload: boolean;
    mockData: boolean;
    secureHeaders: boolean;
    corsStrict: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
}

// 默认配置
const defaultConfig: AppConfig = {
  env: 'development',
  appName: 'Meme Manager',
  appVersion: '0.1.0',
  api: {
    baseUrl: 'http://localhost:8787',
    timeout: 30000,
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    thumbnailSizes: ['150x150', '300x300', '600x600'],
  },
  cache: {
    ttl: 3600, // 1 hour
    hotCacheTtl: 300, // 5 minutes
  },
  rateLimit: {
    requests: 100,
    window: 60, // 1 minute
  },
  features: {
    enableDevTools: true,
    hotReload: true,
    mockData: false,
    secureHeaders: false,
    corsStrict: false,
  },
  logging: {
    level: 'info',
    format: 'json',
  },
};

// 环境特定配置
const environmentConfigs: Record<Environment, Partial<AppConfig>> = {
  development: {
    env: 'development',
    api: {
      baseUrl: 'http://localhost:8787',
      timeout: 30000,
    },
    features: {
      enableDevTools: true,
      hotReload: true,
      mockData: false,
      secureHeaders: false,
      corsStrict: false,
    },
    logging: {
      level: 'debug',
      format: 'text',
    },
  },
  staging: {
    env: 'staging',
    api: {
      baseUrl: 'https://meme-manager-staging.your-domain.workers.dev',
      timeout: 30000,
    },
    features: {
      enableDevTools: false,
      hotReload: false,
      mockData: false,
      secureHeaders: false,
      corsStrict: false,
    },
    logging: {
      level: 'info',
      format: 'json',
    },
  },
  production: {
    env: 'production',
    api: {
      baseUrl: 'https://meme-manager.your-domain.workers.dev',
      timeout: 30000,
    },
    features: {
      enableDevTools: false,
      hotReload: false,
      mockData: false,
      secureHeaders: true,
      corsStrict: true,
    },
    logging: {
      level: 'warn',
      format: 'json',
    },
  },
};

// 配置加载函数
export function loadConfig(env?: Environment): AppConfig {
  const currentEnv = env || (process.env.NODE_ENV as Environment) || 'development';
  const envConfig = environmentConfigs[currentEnv] || {};
  
  return {
    ...defaultConfig,
    ...envConfig,
    api: {
      ...defaultConfig.api,
      ...envConfig.api,
    },
    upload: {
      ...defaultConfig.upload,
      ...envConfig.upload,
    },
    cache: {
      ...defaultConfig.cache,
      ...envConfig.cache,
    },
    rateLimit: {
      ...defaultConfig.rateLimit,
      ...envConfig.rateLimit,
    },
    features: {
      ...defaultConfig.features,
      ...envConfig.features,
    },
    logging: {
      ...defaultConfig.logging,
      ...envConfig.logging,
    },
  };
}

// 验证配置
export function validateConfig(config: AppConfig): boolean {
  try {
    // 验证必需字段
    if (!config.appName || !config.appVersion) {
      throw new Error('Missing required app info');
    }
    
    if (!config.api.baseUrl) {
      throw new Error('Missing API base URL');
    }
    
    if (config.upload.maxFileSize <= 0) {
      throw new Error('Invalid max file size');
    }
    
    if (config.upload.allowedMimeTypes.length === 0) {
      throw new Error('No allowed MIME types specified');
    }
    
    return true;
  } catch (error) {
    console.error('Config validation failed:', error);
    return false;
  }
}

// 获取当前环境配置
export function getCurrentConfig(): AppConfig {
  const config = loadConfig();
  
  if (!validateConfig(config)) {
    throw new Error('Invalid configuration');
  }
  
  return config;
}