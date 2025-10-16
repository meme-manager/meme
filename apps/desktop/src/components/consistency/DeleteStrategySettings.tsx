/**
 * 删除策略设置
 */

import { useState, useEffect } from 'react';
import type { DeleteSyncStrategy } from '../../lib/consistency/types';
import { dataConsistencyManager } from '../../lib/consistency';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Alert,
  AlertDescription,
  AlertCircle,
  Trash2,
  Save
} from '../ui';

export function DeleteStrategySettings() {
  const [strategy, setStrategy] = useState<DeleteSyncStrategy>({
    localDelete: 'soft',
    cloudDelete: 'soft',
    deleteR2: false,
    retentionDays: 30
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // 加载保存的策略
  useEffect(() => {
    const saved = localStorage.getItem('delete_strategy');
    if (saved) {
      try {
        const parsedStrategy = JSON.parse(saved);
        setStrategy(parsedStrategy);
        // 应用到删除管理器
        dataConsistencyManager.deleteManager.setStrategy(parsedStrategy);
      } catch (error) {
        console.error('[DeleteStrategy] 加载策略失败:', error);
      }
    }
  }, []);
  
  const handleSave = () => {
    setSaving(true);
    try {
      // 保存到 localStorage
      localStorage.setItem('delete_strategy', JSON.stringify(strategy));
      
      // 应用到删除管理器
      dataConsistencyManager.deleteManager.setStrategy(strategy);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      console.log('[DeleteStrategy] 策略已保存:', strategy);
    } catch (error) {
      console.error('[DeleteStrategy] 保存失败:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          删除行为设置
        </CardTitle>
        <CardDescription>
          配置资产删除时的行为方式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 删除方式 */}
        <div className="space-y-2">
          <Label htmlFor="delete-mode">删除方式</Label>
          <Select
            value={strategy.localDelete}
            onValueChange={(value) =>
              setStrategy({ ...strategy, localDelete: value as 'soft' | 'hard' })
            }
          >
            <SelectTrigger id="delete-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">
                <div className="flex flex-col items-start">
                  <span>软删除（推荐）</span>
                  <span className="text-xs text-muted-foreground">
                    只标记为已删除，数据仍保留
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="hard">
                <div className="flex flex-col items-start">
                  <span>永久删除</span>
                  <span className="text-xs text-muted-foreground">
                    立即删除所有数据和文件
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            软删除更安全，可以防止误删除，并且支持数据恢复
          </p>
        </div>
        
        {/* 软删除保留天数 */}
        {strategy.localDelete === 'soft' && (
          <div className="space-y-2">
            <Label htmlFor="retention-days">软删除保留天数</Label>
            <Input
              id="retention-days"
              type="number"
              value={strategy.retentionDays}
              onChange={(e) =>
                setStrategy({ ...strategy, retentionDays: parseInt(e.target.value) || 30 })
              }
              min={1}
              max={365}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              超过此天数的软删除记录将被永久清理。推荐 30-90 天。
            </p>
          </div>
        )}
        
        {/* 删除 R2 文件选项 */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="delete-r2">同时删除云端 R2 文件</Label>
              <p className="text-xs text-muted-foreground">
                删除资产时是否同时删除云端存储的文件
              </p>
            </div>
            <Switch
              checked={strategy.deleteR2}
              onCheckedChange={(checked) =>
                setStrategy({ ...strategy, deleteR2: checked })
              }
            />
          </div>
          
          {strategy.deleteR2 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>⚠️ 警告：</strong>开启此选项后，删除资产会同时删除云端文件。
                这意味着：
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>其他设备将无法访问该文件</li>
                  <li>文件将永久从云端删除</li>
                  <li>无法通过重新同步恢复</li>
                </ul>
                <p className="mt-2">
                  <strong>推荐：</strong>保持关闭，除非您确定要释放云端存储空间。
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* 策略预览 */}
        <div className="space-y-2 border-t pt-4">
          <Label>当前策略预览</Label>
          <div className="text-xs space-y-1 bg-muted p-3 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">本地删除：</span>
              <span className="font-medium">
                {strategy.localDelete === 'soft' ? '软删除' : '永久删除'}
              </span>
            </div>
            {strategy.localDelete === 'soft' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">保留天数：</span>
                <span className="font-medium">{strategy.retentionDays} 天</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">删除 R2 文件：</span>
              <span className="font-medium">
                {strategy.deleteR2 ? '是' : '否'}
              </span>
            </div>
          </div>
        </div>
        
        {/* 保存按钮 */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            '保存中...'
          ) : saved ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              已保存 ✓
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
