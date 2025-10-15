import { useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Asset } from '../../types/asset';
import './QuickPreview.css';

interface QuickPreviewProps {
  asset: Asset | null;
  onClose: () => void;
}

export function QuickPreview({ asset, onClose }: QuickPreviewProps) {
  useEffect(() => {
    if (!asset) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [asset, onClose]);

  if (!asset) return null;

  const imageSrc = convertFileSrc(asset.file_path);

  return (
    <div className="quick-preview-overlay" onClick={onClose}>
      <div className="quick-preview-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageSrc}
          alt={asset.file_name}
          className="quick-preview-image"
        />
        <div className="quick-preview-info">
          <div className="quick-preview-filename">{asset.file_name}</div>
          <div className="quick-preview-hint">
            按 <kbd>空格</kbd> 或 <kbd>ESC</kbd> 关闭
          </div>
        </div>
      </div>
    </div>
  );
}
