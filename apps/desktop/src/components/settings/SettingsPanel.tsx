import { useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Dialog } from '../ui/Dialog';
import { StatsPanel } from '../stats/StatsPanel';
import './SettingsPanel.css';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { autoPlayGif, setAutoPlayGif } = useSettingsStore();
  const [showStats, setShowStats] = useState(false);

  return (
    <>
      <Dialog open={open} onClose={onClose} title="⚙️ 设置">
        <div className="settings-panel">
          {/* 外观设置 */}
          <div className="settings-section">
            <h3 className="settings-section-title">🎨 外观</h3>
            
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">深色模式</div>
                <div className="settings-item-desc">切换浅色/深色主题</div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* 播放设置 */}
          <div className="settings-section">
            <h3 className="settings-section-title">🎬 播放</h3>
            
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">GIF 自动播放</div>
                <div className="settings-item-desc">在可视区域内自动播放动图</div>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={autoPlayGif}
                  onChange={(e) => setAutoPlayGif(e.target.checked)}
                />
                <span className="settings-toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* 其他功能 */}
          <div className="settings-section">
            <h3 className="settings-section-title">📊 其他</h3>
            
            <button 
              className="settings-link-btn"
              onClick={() => {
                onClose();
                setShowStats(true);
              }}
            >
              <span className="settings-link-icon">📊</span>
              <div className="settings-link-info">
                <div className="settings-link-label">统计信息</div>
                <div className="settings-link-desc">查看资产库统计数据</div>
              </div>
              <span className="settings-link-arrow">›</span>
            </button>
          </div>
        </div>
      </Dialog>

      <StatsPanel
        open={showStats}
        onClose={() => setShowStats(false)}
      />
    </>
  );
}
