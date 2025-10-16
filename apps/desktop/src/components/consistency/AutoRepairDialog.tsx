/**
 * 自动修复对话框
 */

import { useState } from 'react';
import { dataConsistencyManager } from '../../lib/consistency';
import {
  Dialog,
  Button,
  Alert,
  AlertDescription,
  AlertCircle,
  CheckCircle2
} from '../ui';

interface AutoRepairDialogProps {
  issues: Array<{
    type: string;
    severity: string;
    data: any;
  }>;
  open: boolean;
  onClose: () => void;
  onRepaired: () => Promise<void>;
}

export function AutoRepairDialog({ 
  issues, 
  open, 
  onClose,
  onRepaired 
}: AutoRepairDialogProps) {
  const [repairing, setRepairing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  
  const handleRepair = async () => {
    setRepairing(true);
    
    // 提取可修复的问题
    const repairableIssues = issues
      .filter(i => i.type === 'integrity' && i.data.needsReupload)
      .map(i => i.data);
    
    setProgress({
      current: 0,
      total: repairableIssues.length,
      succeeded: 0,
      failed: 0
    });
    
    try {
      console.log('[AutoRepair] 开始修复:', repairableIssues);
      const result = await dataConsistencyManager.repairer.repairMissingFiles(repairableIssues);
      
      setProgress({
        current: repairableIssues.length,
        total: repairableIssues.length,
        succeeded: result.repaired,
        failed: result.failed.length
      });
      
      // 等待一下让用户看到结果
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`✅ 修复完成\n成功: ${result.repaired}\n失败: ${result.failed.length}`);
      await onRepaired();
      onClose();
    } catch (error) {
      console.error('[AutoRepair] 修复失败:', error);
      alert('❌ 修复失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setRepairing(false);
      setProgress(null);
    }
  };
  
  const repairableCount = issues.filter(i => i.type === 'integrity' && i.data.needsReupload).length;
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      title="🔧 自动修复文件"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={repairing}>
            {progress ? '关闭' : '取消'}
          </Button>
          {!progress && (
            <Button onClick={handleRepair} disabled={repairing || repairableCount === 0}>
              {repairing ? '修复中...' : `开始修复 (${repairableCount})`}
            </Button>
          )}
        </div>
      }
    >
      <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        将重新上传本地文件到云端 R2 存储
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
        <Alert>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={16} />
            <AlertDescription style={{ fontSize: '14px' }}>
              发现 <strong>{repairableCount}</strong> 个可修复的文件。
              这些文件在本地存在但 R2 中丢失，将被重新上传。
            </AlertDescription>
          </div>
        </Alert>
          
        {progress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>修复进度</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            
            <div style={{ width: '100%', backgroundColor: 'var(--background-secondary)', borderRadius: '9999px', height: '8px' }}>
              <div 
                style={{ 
                  backgroundColor: 'var(--primary)', 
                  height: '8px', 
                  borderRadius: '9999px', 
                  transition: 'width 0.3s',
                  width: `${(progress.current / progress.total) * 100}%`
                }}
              />
            </div>
            
            {progress.current === progress.total && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgb(34, 197, 94)' }}>
                  <CheckCircle2 size={16} />
                  <span>成功 {progress.succeeded}</span>
                </div>
                {progress.failed > 0 && (
                  <div style={{ color: 'rgb(239, 68, 68)' }}>
                    失败 {progress.failed}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          
        {!progress && (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '8px' }}>修复将执行以下操作：</p>
            <ul style={{ listStyle: 'disc', listStylePosition: 'inside', marginLeft: '8px' }}>
              <li style={{ marginBottom: '4px' }}>从本地读取文件内容</li>
              <li style={{ marginBottom: '4px' }}>重新上传到 R2 存储</li>
              <li style={{ marginBottom: '4px' }}>更新资产的 R2 引用</li>
            </ul>
            <p style={{ fontSize: '12px', color: 'rgb(245, 158, 11)', marginTop: '12px' }}>
              ⚠️ 注意：此操作会消耗网络流量和存储配额
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
