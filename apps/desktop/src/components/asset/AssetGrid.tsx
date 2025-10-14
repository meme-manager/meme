import { useAssetStore } from '../../stores/assetStore';
import { useSearchStore } from '../../stores/searchStore';
import { AssetCard } from './AssetCard';
import { DropZone } from './DropZone';
import './AssetGrid.css';

export function AssetGrid() {
  const { assets, selectedAssetIds, selectAsset, deselectAsset } = useAssetStore();
  const { query, results } = useSearchStore();
  
  // 使用搜索结果或全部资产
  const displayAssets = query && results ? results.assets : assets;

  if (displayAssets.length === 0 && !query) {
    return (
      <div className="asset-grid-empty">
        <DropZone />
      </div>
    );
  }
  
  if (displayAssets.length === 0 && query) {
    return (
      <div className="asset-grid-empty">
        <div className="empty-search">
          <div className="empty-search-icon">🔍</div>
          <h3>未找到匹配的表情包</h3>
          <p>尝试使用不同的关键词搜索</p>
        </div>
      </div>
    );
  }

  return (
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
          onClick={() => {
            // TODO: 打开资产详情
            console.log('Open asset:', asset.id);
          }}
        />
      ))}
    </div>
  );
}
