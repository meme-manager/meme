import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import './TagCreateDialog.css';

interface TagCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string) => Promise<void>;
}

const PRESET_COLORS = [
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '黄色', value: '#eab308' },
  { name: '绿色', value: '#22c55e' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#a855f7' },
  { name: '棕色', value: '#92400e' },
  { name: '灰色', value: '#6b7280' },
];

export function TagCreateDialog({ open, onClose, onConfirm }: TagCreateDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    console.log('[TagCreateDialog] 提交，name:', name, 'color:', color);
    
    if (!name.trim()) {
      setError('请输入标签名称');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onConfirm(name.trim(), color);
      console.log('[TagCreateDialog] 创建成功');
      // 重置表单
      setName('');
      setColor(PRESET_COLORS[0].value);
      onClose();
    } catch (err) {
      console.error('[TagCreateDialog] 创建失败:', err);
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setColor(PRESET_COLORS[0].value);
      setError('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="新建标签"
      footer={
        <div className="tag-create-dialog-footer">
          {error && <span className="error-message">{error}</span>}
          <Button onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? '创建中...' : '创建'}
          </Button>
        </div>
      }
    >
      <div className="tag-create-dialog-content">
        <div className="form-group">
          <label className="form-label">标签名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="请输入标签名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                handleSubmit();
              }
            }}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">标签颜色</label>
          <div className="color-picker">
            {PRESET_COLORS.map((c) => (
              <div
                key={c.value}
                className={`color-option ${color === c.value ? 'color-option-selected' : ''}`}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">预览</label>
          <div className="tag-preview">
            <div
              className="tag-preview-dot"
              style={{ background: color }}
            />
            <span className="tag-preview-name">{name || '标签名称'}</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
