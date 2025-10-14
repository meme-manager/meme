import { useState, DragEvent } from 'react';
import { AssetGrid } from '../asset/AssetGrid';
import { useAssetStore } from '../../stores/assetStore';
import './MainContent.css';

export function MainContent() {
  const [isDragging, setIsDragging] = useState(false);
  const { importMultipleAssets } = useAssetStore();
  
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有离开主容器时才取消拖拽状态
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
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
  
  return (
    <main 
      className={`main-content ${isDragging ? 'main-content-dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-overlay-icon">📁</div>
            <div className="drag-overlay-text">释放以导入图片</div>
          </div>
        </div>
      )}
      <AssetGrid />
    </main>
  );
}
