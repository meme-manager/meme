import { useState, DragEvent } from 'react';
import { useAssetStore } from '../../stores/assetStore';
import './DropZone.css';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { importMultipleAssets } = useAssetStore();

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      await importMultipleAssets(files, {
        source_platform: 'drag',
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await importMultipleAssets(files, {
        source_platform: 'file',
      });
    }
    // 重置input，允许再次选择相同文件
    e.target.value = '';
  };

  return (
    <div
      className={`drop-zone ${isDragging ? 'drop-zone-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="drop-zone-content">
        <div className="drop-zone-icon">📁</div>
        <h3 className="drop-zone-title">拖拽图片到这里</h3>
        <p className="drop-zone-description">
          或者
        </p>
        <label className="drop-zone-button">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          选择文件
        </label>
        <p className="drop-zone-hint">
          支持 PNG, JPG, GIF, WebP 格式
        </p>
      </div>
    </div>
  );
}
