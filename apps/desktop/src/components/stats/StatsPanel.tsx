import { useEffect, useState } from 'react';
import { useAssetStore } from '../../stores/assetStore';
import { useTagStore } from '../../stores/tagStore';
import { Dialog } from '../ui/Dialog';
import './StatsPanel.css';

interface StatsData {
  totalAssets: number;
  totalTags: number;
  totalSize: number; // bytes
  favoriteCount: number;
  mostUsedAssets: Array<{ id: string; name: string; count: number }>;
  recentAssets: number; // 最近7天添加的
  avgUseCount: number;
}

interface StatsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function StatsPanel({ open, onClose }: StatsPanelProps) {
  const { assets, favoriteAssetIds } = useAssetStore();
  const { tags } = useTagStore();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!open) return;

    // 计算统计数据
    const totalSize = assets.reduce((sum, asset) => sum + asset.file_size, 0);
    const favoriteCount = assets.filter(a => favoriteAssetIds.has(a.id)).length;
    
    // 最近7天添加的资产
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentAssets = assets.filter(a => a.created_at >= sevenDaysAgo).length;
    
    // 最常使用的资产（前5个）
    const mostUsedAssets = [...assets]
      .filter(a => a.use_count > 0)
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.file_name,
        count: a.use_count,
      }));
    
    // 平均使用次数
    const totalUseCount = assets.reduce((sum, a) => sum + a.use_count, 0);
    const avgUseCount = assets.length > 0 ? totalUseCount / assets.length : 0;

    setStats({
      totalAssets: assets.length,
      totalTags: tags.length,
      totalSize,
      favoriteCount,
      mostUsedAssets,
      recentAssets,
      avgUseCount,
    });
  }, [open, assets, tags, favoriteAssetIds]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!stats) return null;

  return (
    <Dialog open={open} onClose={onClose} title="📊 统计信息">
      <div className="stats-panel">
        {/* 概览卡片 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🖼️</div>
            <div className="stat-value">{stats.totalAssets}</div>
            <div className="stat-label">总资产数</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏷️</div>
            <div className="stat-value">{stats.totalTags}</div>
            <div className="stat-label">标签数</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{stats.favoriteCount}</div>
            <div className="stat-label">收藏数</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💾</div>
            <div className="stat-value">{formatSize(stats.totalSize)}</div>
            <div className="stat-label">总大小</div>
          </div>
        </div>

        {/* 详细统计 */}
        <div className="stats-details">
          <div className="stats-section">
            <h3 className="stats-section-title">📈 使用统计</h3>
            <div className="stats-row">
              <span className="stats-row-label">最近7天新增</span>
              <span className="stats-row-value">{stats.recentAssets} 张</span>
            </div>
            <div className="stats-row">
              <span className="stats-row-label">平均使用次数</span>
              <span className="stats-row-value">{stats.avgUseCount.toFixed(1)} 次</span>
            </div>
          </div>

          {stats.mostUsedAssets.length > 0 && (
            <div className="stats-section">
              <h3 className="stats-section-title">🔥 最常使用</h3>
              <div className="most-used-list">
                {stats.mostUsedAssets.map((item, index) => (
                  <div key={item.id} className="most-used-item">
                    <span className="most-used-rank">#{index + 1}</span>
                    <span className="most-used-name">{item.name}</span>
                    <span className="most-used-count">{item.count} 次</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
