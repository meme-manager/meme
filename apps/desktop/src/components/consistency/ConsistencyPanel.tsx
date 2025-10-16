/**
 * 数据一致性管理面板
 */

import { useState, useEffect } from 'react';
import { dataConsistencyManager } from '../../lib/consistency';
import type { HealthScore, ConsistencyReport } from '../../lib/consistency/types';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  RefreshCw,
  Shield,
  CheckCircle2
} from '../ui';
import { ConsistencyReportView } from './ConsistencyReportView';

export function ConsistencyPanel() {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 加载健康度
  useEffect(() => {
    loadHealthScore();
  }, []);
  
  const loadHealthScore = async () => {
    setLoading(true);
    try {
      const score = await dataConsistencyManager.getHealthScore();
      setHealthScore(score);
      
      // 尝试加载最新报告
      const latestReportStr = localStorage.getItem('consistency_latest_report');
      if (latestReportStr) {
        const latestReport = JSON.parse(latestReportStr);
        setReport(latestReport);
      }
    } catch (error) {
      console.error('[ConsistencyPanel] 加载健康度失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 执行完整检查
  const handleCheckConsistency = async () => {
    setChecking(true);
    try {
      console.log('[ConsistencyPanel] 开始完整性检查...');
      const newReport = await dataConsistencyManager.ensureConsistency({
        downloadMissing: true,
        autoRepair: false,  // 不自动修复
        cleanupDeleted: false  // 不自动清理
      });
      
      console.log('[ConsistencyPanel] 检查完成:', newReport);
      setReport(newReport);
      
      // 重新加载健康度
      await loadHealthScore();
      
      // 显示提示
      if (newReport.summary.totalIssues === 0) {
        alert('✅ 太棒了！没有发现任何问题，数据完全一致。');
      }
    } catch (error) {
      console.error('[ConsistencyPanel] 检查失败:', error);
      alert('❌ 检查失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setChecking(false);
    }
  };
  
  // 获取评分样式
  const getScoreVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 95) return 'default';
    if (score >= 80) return 'secondary';
    return 'destructive';
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            数据一致性
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>数据一致性</span>
          </div>
          {healthScore && (
            <Badge variant={getScoreVariant(healthScore.score)}>
              {healthScore.grade} {healthScore.score}分
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          检查和修复本地与云端数据的一致性问题
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 健康度概览 */}
        {healthScore && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">总资产数</span>
              <span className="font-medium">{healthScore.totalAssets}</span>
            </div>
            
            <div className="flex justify-between text-sm p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <span className="text-green-700 dark:text-green-300">健康资产</span>
              <span className="font-medium text-green-700 dark:text-green-300">
                {healthScore.healthyAssets}
              </span>
            </div>
            
            {healthScore.issues.notSynced > 0 && (
              <div className="flex justify-between text-sm p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <span className="text-orange-700 dark:text-orange-300">未同步</span>
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  {healthScore.issues.notSynced}
                </span>
              </div>
            )}
            
            {healthScore.issues.missingR2 > 0 && (
              <div className="flex justify-between text-sm p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <span className="text-red-700 dark:text-red-300">R2文件丢失</span>
                <span className="font-medium text-red-700 dark:text-red-300">
                  {healthScore.issues.missingR2}
                </span>
              </div>
            )}
            
            {healthScore.issues.missingLocal > 0 && (
              <div className="flex justify-between text-sm p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <span className="text-red-700 dark:text-red-300">本地文件丢失</span>
                <span className="font-medium text-red-700 dark:text-red-300">
                  {healthScore.issues.missingLocal}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* 健康度良好提示 */}
        {healthScore && healthScore.score >= 95 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              太棒了！您的数据完全健康，没有发现任何一致性问题。
            </AlertDescription>
          </Alert>
        )}
        
        {/* 操作按钮 */}
        <Button
          onClick={handleCheckConsistency}
          disabled={checking}
          className="w-full"
          variant="outline"
        >
          {checking ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              检查中...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              执行完整性检查
            </>
          )}
        </Button>
        
        {/* 检查报告 */}
        {report && report.summary.totalIssues > 0 && (
          <ConsistencyReportView 
            report={report} 
            onRefresh={loadHealthScore}
          />
        )}
      </CardContent>
    </Card>
  );
}
