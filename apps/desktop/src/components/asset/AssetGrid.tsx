import { useState } from 'react';
import { ask } from '@tauri-apps/plugin-dialog';
import { useAssetStore } from '../../stores/assetStore';
import { useSearchStore } from '../../stores/searchStore';
import { useToastStore } from '../ui/Toast';
import { AssetCard } from './AssetCard';
import { AssetDetail } from './AssetDetail';
import { DropZone } from './DropZone';
import { Button } from '../ui/Button';
import type { Asset } from '../../types/asset';
import './AssetGrid.css';

export function AssetGrid() {
  const { assets, selectedAssetIds, selectAsset, deselectAsset, clearSelection, selectAll, deleteAssetById } = useAssetStore();
  const { query, results, filters } = useSearchStore();
  const { addToast } = useToastStore.getState();
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  
  // 使用搜索结果或全部资产
  // 当有搜索结果时（无论是关键词搜索还是筛选），都使用搜索结果
  const displayAssets = results ? results.assets : assets;
  
  const handleBatchDelete = async () => {
    if (selectedAssetIds.size === 0) return;
    
    const confirmed = await ask(`确定要删除选中的 ${selectedAssetIds.size} 张图片吗？`, {
      title: '确认批量删除',
      kind: 'warning',
    });
    
    if (!confirmed) return;
    
    const ids = Array.from(selectedAssetIds);
    let successCount = 0;
    
    for (const id of ids) {
      try {
        await deleteAssetById(id);
        successCount++;
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
    
    clearSelection();
    addToast(`成功删除 ${successCount} 张图片`, 'success');
  };

  // 判断是否有搜索或筛选条件
  const hasSearchOrFilter = query || Object.keys(filters).length > 0;
  
  if (displayAssets.length === 0 && !hasSearchOrFilter) {
    return (
      <div className="asset-grid-empty">
        <DropZone />
      </div>
    );
  }
  
  if (displayAssets.length === 0 && hasSearchOrFilter) {
    return (
      <div className="asset-grid-empty">
        <div className="empty-search">
          <div className="empty-search-icon">🔍</div>
          <h3>未找到匹配的表情包</h3>
          <p>尝试使用不同的关键词或筛选条件</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {selectedAssetIds.size > 0 && (
        <div className="batch-actions-bar">
          <div className="batch-info">
            已选择 {selectedAssetIds.size} 张图片
          </div>
          <div className="batch-buttons">
            <Button onClick={selectAll}>全选</Button>
            <Button onClick={clearSelection}>取消选择</Button>
            <Button onClick={handleBatchDelete}>批量删除</Button>
          </div>
        </div>
      )}
      
      <div className="asset-grid">
        {displayAssets.map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selected={selectedAssetIds.has(asset.id)}
            onSelect={() => {
              if (selectedAssetIds.has(asset.id)) {
                deselectAsset(asset.id);
              } else {
                selectAsset(asset.id);
              }
            }}
            onOpenDetail={() => setDetailAsset(asset)}
          />
        ))}
      </div>
      
      {detailAsset && (
        <AssetDetail
          asset={detailAsset}
          open={true}
          onClose={() => setDetailAsset(null)}
        />
      )}
    </>
  );
}
