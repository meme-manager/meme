import { convertFileSrc } from '@tauri-apps/api/core';
import type { Asset } from '../../types/asset';
import './AssetCard.css';

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
}

export function AssetCard({ asset, selected, onSelect, onClick }: AssetCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      onSelect?.();
    } else {
      onClick?.();
    }
  };
  
  // 转换文件路径为Tauri可访问的URL
  const imageSrc = convertFileSrc(asset.thumb_medium || asset.file_path);

  return (
    <div
      className={`asset-card ${selected ? 'asset-card-selected' : ''}`}
      onClick={handleClick}
    >
      <div className="asset-card-image">
        <img
          src={imageSrc}
          alt={asset.file_name}
          loading="lazy"
        />
      </div>
      
      <div className="asset-card-info">
        <div className="asset-card-name" title={asset.file_name}>
          {asset.file_name}
        </div>
        <div className="asset-card-meta">
          {asset.width} × {asset.height}
        </div>
      </div>
      
      {selected && (
        <div className="asset-card-check">✓</div>
      )}
    </div>
  );
}
