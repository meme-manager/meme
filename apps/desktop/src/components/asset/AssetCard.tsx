import { convertFileSrc } from '@tauri-apps/api/core';
import type { Asset } from '../../types/asset';
import './AssetCard.css';

interface AssetCardProps {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

export function AssetCard({ asset, selected, onSelect, onClick }: AssetCardProps) {
  const imageSrc = convertFileSrc(asset.thumb_medium || asset.file_path);
  
  const handleDragStart = (e: React.DragEvent) => {
    // 设置拖拽数据为文件路径
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/uri-list', `file://${asset.file_path}`);
    e.dataTransfer.setData('text/plain', asset.file_path);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      onSelect?.();
    } else {
      onClick?.();
    }
  };

  return (
    <div
      className={`asset-card ${selected ? 'asset-card-selected' : ''}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      title="可以拖拽到其他应用"
    >
      <div className="asset-card-image">
        <img
          src={imageSrc}
          alt={asset.file_name}
          loading="lazy"
          draggable={false}
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
