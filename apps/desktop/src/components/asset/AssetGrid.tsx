import { useAssetStore } from '../../stores/assetStore';
import { AssetCard } from './AssetCard';
import { DropZone } from './DropZone';
import './AssetGrid.css';

export function AssetGrid() {
  const { assets, selectedAssetIds, selectAsset, deselectAsset } = useAssetStore();

  if (assets.length === 0) {
    return (
      <div className="asset-grid-empty">
        <DropZone />
      </div>
    );
  }

  return (
    <div className="asset-grid">
      {assets.map(asset => (
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
