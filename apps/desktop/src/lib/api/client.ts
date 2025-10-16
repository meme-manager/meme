/**
 * API 客户端
 * 封装所有与 Cloudflare Workers 的 API 交互
 */

import type { 
  AuthResponse, 
  DeviceInfo, 
  PullRequest, 
  PullResponse, 
  PushRequest, 
  PushResponse 
} from '../../types/sync';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const API_TIMEOUT = 30000; // 30秒超时

// 日志前缀
const LOG_PREFIX = '[API Client]';

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 客户端类
 */
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    console.log(`${LOG_PREFIX} 初始化,API 地址: ${this.baseUrl}`);
  }

  /**
   * 设置 API 基础地址
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
    console.log(`${LOG_PREFIX} API 地址已更新: ${this.baseUrl}`);
  }

  /**
   * 获取当前 API 地址
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 设置认证 Token
   */
  setToken(token: string | null) {
    this.token = token;
    console.log(`${LOG_PREFIX} Token ${token ? '已设置' : '已清除'}`);
  }

  /**
   * 获取当前 Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // 添加认证 Token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log(`${LOG_PREFIX} 请求: ${options.method || 'GET'} ${endpoint}`);

    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`${LOG_PREFIX} 请求失败:`, response.status, errorData);
        throw new ApiError(
          errorData.error || `请求失败: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      console.log(`${LOG_PREFIX} 响应成功:`, endpoint);
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`${LOG_PREFIX} 请求超时:`, endpoint);
          throw new ApiError('请求超时,请检查网络连接');
        }
        console.error(`${LOG_PREFIX} 网络错误:`, error.message);
        throw new ApiError(`网络错误: ${error.message}`);
      }
      
      throw new ApiError('未知错误');
    }
  }

  // ==================== 认证相关 API ====================

  /**
   * 设备注册/登录
   */
  async deviceRegister(deviceInfo: DeviceInfo): Promise<AuthResponse> {
    console.log(`${LOG_PREFIX} 设备注册:`, deviceInfo.device_name);
    const response = await this.request<{ success: boolean; data: AuthResponse; message: string }>('/auth/device-register', {
      method: 'POST',
      body: JSON.stringify(deviceInfo),
    });
    return response.data;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.request('/health');
  }

  // ==================== 同步相关 API ====================

  /**
   * 拉取云端更新
   */
  async syncPull(request: PullRequest): Promise<PullResponse> {
    console.log(`${LOG_PREFIX} 拉取更新,since: ${new Date(request.since).toISOString()}`);
    const response = await this.request<{ success: boolean; data: PullResponse }>('/sync/pull', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data;
  }

  /**
   * 推送本地更改
   */
  async syncPush(request: PushRequest): Promise<PushResponse> {
    console.log(`${LOG_PREFIX} 推送更改,资产数: ${request.assets?.length || 0}`);
    
    // 🔍 检查资产中的 undefined 字段
    if (request.assets && request.assets.length > 0) {
      const firstAsset = request.assets[0];
      console.log(`${LOG_PREFIX} 第一个资产示例:`, firstAsset);
      
      const undefinedFields: string[] = [];
      for (const [key, value] of Object.entries(firstAsset)) {
        if (value === undefined) {
          undefinedFields.push(key);
        }
      }
      
      if (undefinedFields.length > 0) {
        console.error(`${LOG_PREFIX} ⚠️ 发现 undefined 字段:`, undefinedFields);
      }
    }
    
    // 序列化并检查
    const jsonString = JSON.stringify(request);
    console.log(`${LOG_PREFIX} JSON 长度: ${jsonString.length} 字符`);
    
    // 检查 JSON 中是否包含 "undefined" 字符串
    if (jsonString.includes('undefined')) {
      console.error(`${LOG_PREFIX} ⚠️ JSON 中包含 undefined 字符串！`);
      const match = jsonString.match(/.{0,50}undefined.{0,50}/);
      if (match) {
        console.error(`${LOG_PREFIX} 上下文:`, match[0]);
      }
    }
    
    const response = await this.request<{ success: boolean; data: PushResponse; message: string }>('/sync/push', {
      method: 'POST',
      body: jsonString,
    });
    return response.data;
  }

  // ==================== 文件上传 API ====================

  /**
   * 上传资产文件到 R2
   */
  async uploadAsset(
    file: Blob,
    metadata: {
      file_name: string;
      mime_type: string;
      content_hash: string;
    }
  ): Promise<{
    success: boolean;
    r2_key: string;
    thumb_r2_key: string;
    r2_url: string;
  }> {
    console.log(`${LOG_PREFIX} 上传文件: ${metadata.file_name}`);
    
    const formData = new FormData();
    formData.append('file', file, metadata.file_name);
    formData.append('metadata', JSON.stringify(metadata));

    const url = `${this.baseUrl}/asset/upload`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || '文件上传失败',
        response.status,
        errorData
      );
    }

    return response.json();
  }

  // ==================== 分享相关 API ====================

  /**
   * 创建分享
   */
  async createShare(request: {
    asset_ids: string[];
    title?: string;
    description?: string;
    expires_in?: number;
    max_downloads?: number;
    password?: string;
  }): Promise<{
    share_id: string;
    share_url: string;
    expires_at?: number;
  }> {
    console.log(`${LOG_PREFIX} 创建分享,资产数: ${request.asset_ids.length}`);
    const response = await this.request<{ success: boolean; data: { share_id: string; share_url: string; expires_at?: number } }>('/share/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data;
  }

  /**
   * 获取分享详情
   */
  async getShare(shareId: string, password?: string): Promise<{
    title: string;
    description: string;
    assets: Array<{
      id: string;
      file_name: string;
      mime_type: string;
      width: number;
      height: number;
      thumb_url: string;
      download_url: string;
    }>;
    expires_at?: number;
    view_count: number;
  }> {
    console.log(`${LOG_PREFIX} 获取分享: ${shareId}`);
    const url = password ? `/share/${shareId}?password=${encodeURIComponent(password)}` : `/share/${shareId}`;
    const response = await this.request<{ success: boolean; data: any }>(url);
    return response.data;
  }

  /**
   * 获取我的分享列表
   */
  async listShares(): Promise<{
    shares: Array<{
      share_id: string;
      title: string;
      asset_count: number;
      view_count: number;
      download_count: number;
      created_at: number;
      expires_at?: number;
    }>;
  }> {
    console.log(`${LOG_PREFIX} 获取分享列表`);
    const response = await this.request<{ success: boolean; data: any }>('/share/list');
    return response.data;
  }

  /**
   * 删除分享
   */
  async deleteShare(shareId: string): Promise<{ success: boolean }> {
    console.log(`${LOG_PREFIX} 删除分享: ${shareId}`);
    const response = await this.request<{ success: boolean; data: { success: boolean } }>(`/share/${shareId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  /**
   * 导入分享
   */
  async importShare(shareId: string): Promise<{
    success: boolean;
    imported_count: number;
    assets: Array<{
      id: string;
      download_url: string;
    }>;
  }> {
    console.log(`${LOG_PREFIX} 导入分享: ${shareId}`);
    const response = await this.request<{ success: boolean; data: any }>(`/share/${shareId}/import`, {
      method: 'POST',
    });
    return response.data;
  }

  // ==================== 文件上传 API ====================

  /**
   * 上传文件到 R2
   */
  async uploadFile(
    fileData: ArrayBuffer,
    options: {
      fileName: string;
      contentType: string;
      contentHash: string;
    }
  ): Promise<{
    r2_key: string;
    thumb_r2_key: string;
    r2_url: string;
  }> {
    console.log(`${LOG_PREFIX} 上传文件: ${options.fileName}`);
    console.log(`${LOG_PREFIX} 🔑 Token 状态: ${this.token ? `存在 (${this.token.substring(0, 20)}...)` : '❌ 不存在'}`);
    console.log(`${LOG_PREFIX} 🌐 API URL: ${this.baseUrl}`);
    console.log(`${LOG_PREFIX} 📋 请求头:`, {
      'Authorization': this.token ? `Bearer ${this.token.substring(0, 20)}...` : '❌ 无',
      'Content-Type': options.contentType,
      'X-Content-Hash': options.contentHash,
      'X-File-Name': options.fileName,
    });
    
    const response = await fetch(`${this.baseUrl}/r2/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': options.contentType,
        'X-Content-Hash': options.contentHash,
        'X-File-Name': options.fileName,
      },
      body: fileData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '上传失败');
    }

    const result = await response.json();
    return result.data;
  }

  // ==================== 配额相关 API ====================

  /**
   * 获取配额信息
   */
  async getQuota(): Promise<{
    assets: { used: number; limit: number; percentage: number };
    storage: { used: number; limit: number; percentage: number };
    shares: { used: number; limit: number; percentage: number };
  }> {
    console.log(`${LOG_PREFIX} 获取配额信息`);
    const response = await this.request<{ success: boolean; data: any }>('/quota/info');
    return response.data;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
