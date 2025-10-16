/**
 * 一致性检查报告视图
 */

import { useState } from 'react';
import type { ConsistencyReport } from '../../lib/consistency/types';
import {
  Alert,
  AlertDescription,
  AlertCircle,
  Badge,
  Button,
  Download,
  Upload,
  Trash2,
  AlertTriangle
} from '../ui';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { AutoRepairDialog } from './AutoRepairDialog';

interface ConsistencyReportViewProps {
  report: ConsistencyReport;
  onRefresh: () => Promise<void>;
}

export function ConsistencyReportView({ report, onRefresh }: ConsistencyReportViewProps) {
  const [showConflicts, setShowConflicts] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  
  // 获取修复类型标签
  const getRepairTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      download: '下载缺失文件',
      reupload: '重新上传到R2',
      cleanup: '清理过期删除'
    };
    return labels[type] || type;
  };
  
  // 获取修复类型图标
  const getRepairTypeIcon = (type: string) => {
    switch (type) {
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'reupload':
        return <Upload className="w-4 h-4" />;
      case 'cleanup':
        return <Trash2 className="w-4 h-4" />;
      default:
        return null;
    }
  };
  
  // 格式化时间
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };
  
  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">检查报告</h3>
        <span className="text-xs text-muted-foreground">
          {formatTime(report.timestamp)}
        </span>
      </div>
      
      {/* 摘要 */}
      <Alert variant={report.summary.pendingIssues > 0 ? 'destructive' : 'default'}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          发现 <strong>{report.summary.totalIssues}</strong> 个问题，
          已修复 <strong>{report.summary.fixedIssues}</strong> 个，
          待处理 <strong>{report.summary.pendingIssues}</strong> 个
        </AlertDescription>
      </Alert>
      
      {/* 修复统计 */}
      {report.repairs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">修复统计</h4>
          <div className="space-y-2">
            {report.repairs.map((repair, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between text-sm p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {getRepairTypeIcon(repair.type)}
                  <span>{getRepairTypeLabel(repair.type)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {repair.succeeded > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      ✅ {repair.succeeded}
                    </span>
                  )}
                  {repair.failed > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      ❌ {repair.failed}
                    </span>
                  )}
                  {repair.skipped && repair.skipped > 0 && (
                    <span className="text-muted-foreground">
                      ⏭️ {repair.skipped}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 冲突列表 */}
      {report.conflicts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">发现冲突</h4>
            <Badge variant="destructive">{report.conflicts.length}</Badge>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowConflicts(true)}
            className="w-full"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            解决 {report.conflicts.length} 个冲突
          </Button>
          
          {showConflicts && (
            <ConflictResolutionDialog
              conflicts={report.conflicts}
              open={showConflicts}
              onClose={() => setShowConflicts(false)}
              onResolved={onRefresh}
            />
          )}
        </div>
      )}
      
      {/* 待处理问题 */}
      {report.issues.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">待处理问题</h4>
            <Badge variant="secondary">{report.issues.length}</Badge>
          </div>
          
          {/* 可修复的问题 */}
          {report.issues.some(i => i.type === 'integrity' && i.data.needsReupload) && (
            <Button
              variant="outline"
              onClick={() => setShowRepair(true)}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              修复可恢复的文件
            </Button>
          )}
          
          {showRepair && (
            <AutoRepairDialog
              issues={report.issues.filter(i => i.type === 'integrity' && i.data.needsReupload)}
              open={showRepair}
              onClose={() => setShowRepair(false)}
              onRepaired={onRefresh}
            />
          )}
          
          {/* 问题列表 */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {report.issues.slice(0, 10).map((issue, i) => (
              <div 
                key={i}
                className="text-xs p-2 bg-muted rounded flex items-center justify-between"
              >
                <span className="truncate flex-1">
                  {issue.type === 'integrity' ? (
                    <>资产 {issue.data.assetId.substring(0, 8)}...</>
                  ) : (
                    <>问题: {issue.type}</>
                  )}
                </span>
                <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
                  {issue.severity}
                </Badge>
              </div>
            ))}
            {report.issues.length > 10 && (
              <div className="text-xs text-center text-muted-foreground py-1">
                还有 {report.issues.length - 10} 个问题...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
