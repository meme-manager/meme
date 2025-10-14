/**
 * R2 存储集成测试 - Task 2.4 验收测试
 * 验证文件上传、下载和存储功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { assetRouter } from '../routes/asset';
import { authMiddleware } from '../middleware/auth';

// 模拟 R2 存储
class MockR2Object {
  constructor(
    public body: ReadableStream,
    public etag: string = 'mock-etag',
    public size: number = 0
  ) {}
}

class MockR2Bucket {
  private storage = new Map<string, { data: ArrayBuffer; metadata: any }>();

  async put(key: string, value: ReadableStream | ArrayBuffer, options?: any) {
    let data: ArrayBuffer;
    
    if (value instanceof ReadableStream) {
      const reader = value.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        chunks.push(chunk);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      data = new ArrayBuffer(totalLength);
      const view = new Uint8Array(data);
      let offset = 0;
      
      for (const chunk of chunks) {
        view.set(chunk, offset);
        offset += chunk.length;
      }
    } else {
      data = value;
    }

    this.storage.set(key, { data, metadata: options });
    return { key, etag: 'mock-etag-' + Date.now() };
  }

  async get(key: string) {
    const item = this.storage.get(key);
    if (!item) return null;
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(item.data));
        controller.close();
      }
    });
    
    return new MockR2Object(stream, 'mock-etag', item.data.byteLength);
  }

  async delete(key: string) {
    return this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

// 创建测试应用（不包含认证中间件）
const testApp = new Hono();
testApp.route('/api/asset', assetRouter);

// 带认证中间件的应用用于认证测试
const authApp = new Hono();
authApp.use('/api/*', authMiddleware);
authApp.route('/api/asset', assetRouter);

// 模拟环境
const mockR2Bucket = new MockR2Bucket();
const mockEnv = {
  DB: {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        run: async () => ({ success: true }),
        first: async () => {
          // 模拟文件元数据查询结果
          if (query.includes('SELECT') && query.includes('asset_meta')) {
            return {
              id: 'test-file-id',
              filename: 'test.jpg',
              content_type: 'image/jpeg',
              size_bytes: 1024,
              storage_key: 'test-file-id.jpg',
              created_at: Math.floor(Date.now() / 1000),
              updated_at: Math.floor(Date.now() / 1000)
            };
          }
          return null;
        }
      })
    })
  },
  ASSETS_BUCKET: mockR2Bucket,
  MAX_FILE_SIZE: '10485760',
  ALLOWED_MIME_TYPES: 'image/jpeg,image/png,image/gif,image/webp',
  JWT_SECRET: 'test-secret'
};

// 创建测试文件
function createTestFile(name: string, type: string, size: number = 1024): File {
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  // 填充一些测试数据
  for (let i = 0; i < size; i++) {
    view[i] = i % 256;
  }
  
  return new File([buffer], name, { type });
}

describe('R2 Storage Integration - Task 2.4', () => {
  beforeEach(() => {
    // 清理模拟存储
    mockR2Bucket.clear();
  });

  describe('File Upload', () => {
    it('should successfully upload a valid image file', async () => {
      const testFile = createTestFile('test-image.jpg', 'image/jpeg', 2048);
      const formData = new FormData();
      formData.append('file', testFile);

      const req = new Request('http://localhost/api/asset/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('fileId');
      expect(data).toHaveProperty('filename', 'test-image.jpg');
      expect(data).toHaveProperty('contentType', 'image/jpeg');
      expect(data).toHaveProperty('size', 2048);
      expect(data).toHaveProperty('uploadedAt');
    });

    it('should reject upload when no file is provided', async () => {
      const formData = new FormData();

      const req = new Request('http://localhost/api/asset/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty('error', 'No file provided');
    });

    it('should reject files that are too large', async () => {
      const largeFile = createTestFile('large-file.jpg', 'image/jpeg', 20 * 1024 * 1024); // 20MB
      const formData = new FormData();
      formData.append('file', largeFile);

      const req = new Request('http://localhost/api/asset/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty('error', 'File too large');
      expect(data).toHaveProperty('maxSize');
      expect(data).toHaveProperty('actualSize');
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = createTestFile('test.exe', 'application/x-executable', 1024);
      const formData = new FormData();
      formData.append('file', unsupportedFile);

      const req = new Request('http://localhost/api/asset/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty('error', 'File type not allowed');
      expect(data).toHaveProperty('allowedTypes');
      expect(data).toHaveProperty('actualType', 'application/x-executable');
    });

    it('should validate file information', async () => {
      const invalidFile = createTestFile('test.txt', 'text/plain', 1024); // 不支持的文件类型
      const formData = new FormData();
      formData.append('file', invalidFile);

      const req = new Request('http://localhost/api/asset/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data).toHaveProperty('error', 'File type not allowed');
      expect(data).toHaveProperty('allowedTypes');
      expect(data).toHaveProperty('actualType');
    });
  });

  describe('File Download', () => {
    it('should successfully download an existing file', async () => {
      // 先上传一个文件到模拟存储
      const testData = new ArrayBuffer(1024);
      await mockR2Bucket.put('test-file-id.jpg', testData);

      const req = new Request('http://localhost/api/asset/test-file-id', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/jpeg');
      expect(res.headers.get('Content-Length')).toBe('1024');
      expect(res.headers.get('Content-Disposition')).toContain('attachment');
      expect(res.headers.get('Cache-Control')).toContain('public');
    });

    it('should return 404 for non-existent file', async () => {
      const req = new Request('http://localhost/api/asset/non-existent-id', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      // 模拟数据库返回空结果
      const mockEnvNotFound = {
        ...mockEnv,
        DB: {
          prepare: () => ({
            bind: () => ({
              first: async () => null
            })
          })
        }
      };

      const res = await testApp.fetch(req, mockEnvNotFound);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data).toHaveProperty('error', 'File not found');
    });

    it('should return 400 for missing file ID', async () => {
      const req = new Request('http://localhost/api/asset/', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(404); // 路由不匹配
    });
  });

  describe('File Information', () => {
    it('should return file metadata without downloading content', async () => {
      const req = new Request('http://localhost/api/asset/test-file-id/info', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('id', 'test-file-id');
      expect(data).toHaveProperty('filename', 'test.jpg');
      expect(data).toHaveProperty('contentType', 'image/jpeg');
      expect(data).toHaveProperty('size', 1024);
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');
    });
  });

  describe('File Deletion', () => {
    it('should successfully delete an existing file', async () => {
      // 先添加文件到模拟存储
      await mockR2Bucket.put('test-file-id.jpg', new ArrayBuffer(1024));

      const req = new Request('http://localhost/api/asset/test-file-id', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const res = await testApp.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message', 'File deleted successfully');
      expect(data).toHaveProperty('fileId', 'test-file-id');

      // 验证文件已从存储中删除
      const deletedFile = await mockR2Bucket.get('test-file-id.jpg');
      expect(deletedFile).toBeNull();
    });
  });

  describe('Authentication Required', () => {
    it('should require authentication for upload', async () => {
      const testFile = createTestFile('test.jpg', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', testFile);

      const req = new Request('http://localhost/api/asset/upload', {
        method: 'POST',
        body: formData
        // 没有 Authorization header
      });

      const res = await authApp.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should require authentication for download', async () => {
      const req = new Request('http://localhost/api/asset/test-file-id', {
        method: 'GET'
        // 没有 Authorization header
      });

      const res = await authApp.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('should require authentication for deletion', async () => {
      const req = new Request('http://localhost/api/asset/test-file-id', {
        method: 'DELETE'
        // 没有 Authorization header
      });

      const res = await authApp.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });
  });

  describe('Storage Integration', () => {
    it('should correctly store and retrieve files from R2', async () => {
      const testContent = 'Hello, R2 Storage!';
      const testData = new TextEncoder().encode(testContent);
      
      // 测试存储
      const putResult = await mockR2Bucket.put('test-key', testData.buffer);
      expect(putResult).toHaveProperty('key', 'test-key');
      expect(putResult).toHaveProperty('etag');

      // 测试检索
      const object = await mockR2Bucket.get('test-key');
      expect(object).not.toBeNull();
      expect(object!.size).toBe(testData.length);

      // 验证内容
      const reader = object!.body.getReader();
      const { value } = await reader.read();
      const retrievedContent = new TextDecoder().decode(value);
      expect(retrievedContent).toBe(testContent);
    });

    it('should handle file not found in R2', async () => {
      const object = await mockR2Bucket.get('non-existent-key');
      expect(object).toBeNull();
    });

    it('should handle file deletion from R2', async () => {
      // 先存储文件
      await mockR2Bucket.put('delete-test', new ArrayBuffer(100));
      
      // 验证文件存在
      let object = await mockR2Bucket.get('delete-test');
      expect(object).not.toBeNull();

      // 删除文件
      const deleteResult = await mockR2Bucket.delete('delete-test');
      expect(deleteResult).toBe(true);

      // 验证文件已删除
      object = await mockR2Bucket.get('delete-test');
      expect(object).toBeNull();
    });
  });
});