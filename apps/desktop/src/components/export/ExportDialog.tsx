import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToastStore } from '../ui/Toast';
import './ExportDialog.css';

interface ExportDialogProps {
  open: boolean;
  assetIds: string[];
  assetPaths: string[];
  onClose: () => void;
}

export function ExportDialog({ open, assetIds, assetPaths, onClose }: ExportDialogProps) {
  const [exporting, setExporting] = useState(false);
  const [exportPath, setExportPath] = useState<string>('');
  const { addToast } = useToastStore.getState();

  const handleSelectFile = async () => {
    try {
      const timestamp = Date.now();
      const defaultName = `meme_export_${timestamp}.zip`;
      
      const selected = await save({
        defaultPath: defaultName,
        filters: [{
          name: 'ZIP 压缩包',
          extensions: ['zip']
        }],
        title: '保存导出文件',
      });

      if (selected) {
        setExportPath(selected);
      }
    } catch (error) {
      console.error('选择保存位置失败:', error);
      addToast('❌ 选择保存位置失败', 'error');
    }
  };

  const handleExport = async () => {
    if (!exportPath) {
      addToast('⚠️ 请先选择保存位置', 'warning');
      return;
    }

    setExporting(true);
    try {
      // 调用后端导出功能
      const successCount = await invoke<number>('export_assets', {
        assetPaths,
        exportPath,
      });

      if (successCount === assetIds.length) {
        addToast(`✅ 成功导出 ${successCount} 张图片`, 'success');
      } else {
        addToast(`⚠️ 导出完成：成功 ${successCount} 张，失败 ${assetIds.length - successCount} 张`, 'warning');
      }
      onClose();
    } catch (error) {
      console.error('导出失败:', error);
      addToast(`❌ 导出失败: ${error}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="📤 导出图片"
      footer={
        <div className="export-dialog-footer">
          <Button onClick={onClose} disabled={exporting}>
            取消
          </Button>
          <Button onClick={handleExport} disabled={exporting || !exportPath}>
            {exporting ? '导出中...' : '开始导出'}
          </Button>
        </div>
      }
    >
      <div className="export-dialog-content">
        <div className="export-info">
          <div className="export-info-item">
            <span className="export-info-label">选中图片：</span>
            <span className="export-info-value">{assetIds.length} 张</span>
          </div>
        </div>

        <div className="export-path-selector">
          <label className="export-label">保存位置：</label>
          <div className="export-path-input-group">
            <input
              type="text"
              className="export-path-input"
              value={exportPath}
              readOnly
              placeholder="点击选择保存位置..."
            />
            <Button onClick={handleSelectFile}>
              选择位置
            </Button>
          </div>
        </div>

        <div className="export-note">
          💡 提示：图片将打包成 ZIP 压缩包，保持原文件名
        </div>
      </div>
    </Dialog>
  );
}
