/**
 * 冲突解决对话框
 */

import { useState } from 'react';
import type { ConflictInfo } from '../../lib/consistency/types';
import { dataConsistencyManager } from '../../lib/consistency';
import {
  Dialog,
  Button,
  Card,
  CardContent,
  Badge,
  SimpleSelect,
  AlertTriangle,
  Trash2,
  Edit3
} from '../ui';

interface ConflictResolutionDialogProps {
  conflicts: ConflictInfo[];
  open: boolean;
  onClose: () => void;
  onResolved: () => Promise<void>;
}

export function ConflictResolutionDialog({ 
  conflicts, 
  open, 
  onClose,
  onResolved 
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, 'use_cloud' | 'use_local' | 'merge'>>(
    new Map(conflicts.map(c => [c.assetId, c.recommendation as any]))
  );
  const [resolving, setResolving] = useState(false);
  
  const handleResolveAll = async () => {
    setResolving(true);
    try {
      console.log('[ConflictDialog] 解决冲突:', resolutions);
      await dataConsistencyManager.resolveConflicts(conflicts, resolutions);
      alert('✅ 所有冲突已解决');
      await onResolved();
      onClose();
    } catch (error) {
      console.error('[ConflictDialog] 解决冲突失败:', error);
      alert('❌ 解决冲突失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setResolving(false);
    }
  };
  
  const updateResolution = (assetId: string, value: string) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(assetId, value as 'use_cloud' | 'use_local' | 'merge');
    setResolutions(newResolutions);
  };
  
  const getConflictTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      modified: '修改冲突',
      deleted: '删除冲突',
      r2_key_mismatch: 'R2引用不一致'
    };
    return labels[type] || type;
  };
  
  const getConflictBadgeVariant = (type: string): 'default' | 'destructive' | 'secondary' => {
    if (type === 'r2_key_mismatch') return 'destructive';
    if (type === 'deleted') return 'secondary';
    return 'default';
  };
  
  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'deleted':
        return <Trash2 className="w-4 h-4" />;
      case 'modified':
        return <Edit3 className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };
  
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      title="⚠️ 解决同步冲突"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={resolving}>
            取消
          </Button>
          <Button onClick={handleResolveAll} disabled={resolving}>
            {resolving ? '解决中...' : `解决所有冲突 (${conflicts.length})`}
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        检测到 {conflicts.length} 个冲突，请选择保留哪个版本
      </div>
        
        <div className="space-y-4 py-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.assetId}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* 冲突信息头部 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        {getConflictIcon(conflict.type)}
                        {conflict.local.file_name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {conflict.reason}
                      </div>
                    </div>
                    <Badge variant={getConflictBadgeVariant(conflict.type)}>
                      {getConflictTypeLabel(conflict.type)}
                    </Badge>
                  </div>
                  
                  {/* 版本对比 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 本地版本 */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="font-medium text-sm flex items-center justify-between">
                        <span>📱 本地版本</span>
                        {conflict.local.updated_at > conflict.cloud.updated_at && (
                          <Badge variant="default" className="text-xs">更新</Badge>
                        )}
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div>更新: {formatDate(conflict.local.updated_at)}</div>
                        <div>大小: {formatBytes(conflict.local.file_size)}</div>
                        <div>使用次数: {conflict.local.use_count}</div>
                        {conflict.local.deleted === 1 && (
                          <Badge variant="destructive" className="text-xs mt-2">
                            已删除
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* 云端版本 */}
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="font-medium text-sm flex items-center justify-between">
                        <span>☁️ 云端版本</span>
                        {conflict.cloud.updated_at > conflict.local.updated_at && (
                          <Badge variant="default" className="text-xs">更新</Badge>
                        )}
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div>更新: {formatDate(conflict.cloud.updated_at)}</div>
                        <div>大小: {formatBytes(conflict.cloud.file_size)}</div>
                        <div>使用次数: {conflict.cloud.use_count}</div>
                        {conflict.cloud.deleted === 1 && (
                          <Badge variant="destructive" className="text-xs mt-2">
                            已删除
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 解决方案选择 */}
                  <SimpleSelect
                    value={resolutions.get(conflict.assetId) || conflict.recommendation}
                    onValueChange={(value) => updateResolution(conflict.assetId, value)}
                  >
                    <option value="use_local">📱 使用本地版本</option>
                    <option value="use_cloud">☁️ 使用云端版本</option>
                    {conflict.type === 'modified' && (
                      <option value="merge">🔄 智能合并（保留两者的使用统计）</option>
                    )}
                  </SimpleSelect>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </Dialog>
  );
}
