import { invoke } from '@tauri-apps/api/core';

export interface Asset {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface CreateAssetRequest {
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export class DatabaseAPI {
  // Asset 操作
  static async createAsset(request: CreateAssetRequest): Promise<Asset> {
    return await invoke('create_asset', { request });
  }

  static async getAsset(id: string): Promise<Asset | null> {
    return await invoke('get_asset', { id });
  }

  static async listAssets(limit?: number, offset?: number): Promise<Asset[]> {
    return await invoke('list_assets', { limit, offset });
  }

  static async deleteAsset(id: string): Promise<boolean> {
    return await invoke('delete_asset', { id });
  }

  // Tag 操作
  static async createTag(request: CreateTagRequest): Promise<Tag> {
    return await invoke('create_tag', { request });
  }

  static async listTags(): Promise<Tag[]> {
    return await invoke('list_tags');
  }

  static async deleteTag(id: string): Promise<boolean> {
    return await invoke('delete_tag', { id });
  }

  // Asset-Tag 关联操作
  static async addTagToAsset(assetId: string, tagId: string): Promise<void> {
    return await invoke('add_tag_to_asset', { asset_id: assetId, tag_id: tagId });
  }

  static async removeTagFromAsset(assetId: string, tagId: string): Promise<boolean> {
    return await invoke('remove_tag_from_asset', { asset_id: assetId, tag_id: tagId });
  }

  static async getAssetTags(assetId: string): Promise<Tag[]> {
    return await invoke('get_asset_tags', { asset_id: assetId });
  }
}