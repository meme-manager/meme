import { useState, useEffect } from 'react';
import { useTagStore } from '../../stores/tagStore';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import './TagManager.css';

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export function TagManager({ open, onClose }: TagManagerProps) {
  const { tags, loading, loadTags, createNewTag, deleteTagById } = useTagStore();
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open, loadTags]);
  
  const handleCreate = async () => {
    if (!newTagName.trim()) {
      setError('请输入标签名称');
      return;
    }
    
    const tag = await createNewTag(newTagName.trim(), selectedColor);
    if (tag) {
      setNewTagName('');
      setSelectedColor(PRESET_COLORS[0]);
      setError('');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个标签吗？')) {
      await deleteTagById(id);
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="标签管理"
      footer={
        <Button onClick={onClose}>关闭</Button>
      }
    >
      <div className="tag-manager">
        <div className="tag-create">
          <h3>创建新标签</h3>
          <Input
            placeholder="标签名称"
            value={newTagName}
            onChange={(e) => {
              setNewTagName(e.target.value);
              setError('');
            }}
            error={error}
          />
          
          <div className="color-picker">
            <label>选择颜色</label>
            <div className="color-grid">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setSelectedColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <Button onClick={handleCreate} disabled={loading}>
            创建标签
          </Button>
        </div>
        
        <div className="tag-list">
          <h3>已有标签 ({tags.length})</h3>
          {loading && <div className="loading">加载中...</div>}
          {!loading && tags.length === 0 && (
            <div className="empty">暂无标签</div>
          )}
          {!loading && tags.length > 0 && (
            <div className="tags">
              {tags.map(tag => (
                <div key={tag.id} className="tag-item">
                  <span
                    className="tag-color"
                    style={{ background: tag.color || '#6b7280' }}
                  />
                  <span className="tag-name">{tag.name}</span>
                  <span className="tag-count">{tag.use_count}</span>
                  <button
                    className="tag-delete"
                    onClick={() => handleDelete(tag.id)}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
