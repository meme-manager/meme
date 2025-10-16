/**
 * 数据一致性检查页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, Trash2, Download, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { dataConsistencyManager } from '../lib/consistency/DataConsistencyManager';
import type { ConsistencyReport } from '../lib/consistency/types';

const LOG_PREFIX = '[ConsistencyCheckPage]';

export function ConsistencyCheckPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // 执行检查
  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await dataConsistencyManager.ensureConsistency({
        downloadMissing: false,
        autoRepair: false,
        cleanupDeleted: false
      });
      setReport(result);
      setLastCheckTime(Date.now());
    } catch (error) {
      alert(`检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setChecking(false);
    }
  };
  
  // 切换展开
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  // 格式化时间
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  };
  
  // 本地文件丢失问题（只统计本地磁盘没有，但 R2 有备份的）
  const localMissingWithR2 = report?.issues.filter(
    i => i.type === 'integrity' && !i.data.exists && i.data.r2_key
  ) || [];
  
  // R2 文件丢失问题（数据库有记录但 R2 没有文件，且本地有文件可以重新上传）
  const r2MissingCanReupload = report?.issues.filter(
    i => i.type === 'integrity' && !i.data.exists && i.data.needsReupload
  ) || [];
  
  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <Button variant="ghost" onClick={() => navigate('/settings')} style={{ marginRight: '16px' }}>
          <ArrowLeft size={20} />
        </Button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>
            数据一致性检查
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            检查和修复本地数据、云端数据、R2 文件的一致性
          </p>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div style={{ marginBottom: '24px' }}>
        <Button onClick={handleCheck} disabled={checking} style={{ width: '100%' }}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          {checking ? '检查中...' : '执行完整性检查'}
        </Button>
      </div>
      
      {/* 检查摘要 */}
      {report && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle>📊 检查摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--background-secondary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>发现问题</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: report.summary.totalIssues > 0 ? '#ef4444' : '#10b981' }}>
                  {report.summary.totalIssues}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--background-secondary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>待处理</div>
                <div style={{ fontSize: '24px', fontWeight: 600' }}>
                  {report.summary.pendingIssues}
                </div>
              </div>
            </div>
            {lastCheckTime && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                最后检查: {formatTime(lastCheckTime)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 健康状态 */}
      {report && report.summary.totalIssues === 0 && (
        <Alert>
          <CheckCircle2 size={16} />
          <AlertDescription>
            <strong>✅ 数据完全健康</strong>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              太棒了！您的数据完全一致，没有发现任何问题。
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {/* 问题详情 */}
      {report && report.summary.totalIssues > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>🔍 问题详情</h2>
          
          {/* 本地文件丢失 (R2 有备份可下载) */}
          {localMissingWithR2.length > 0 && (
            <Card>
              <CardHeader onClick={() => toggleSection('local-missing')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                    📁 本地文件丢失 (R2 有备份)
                    <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                      {localMissingWithR2.length} 个
                    </span>
                  </CardTitle>
                  {expandedSections.has('local-missing') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </CardHeader>
              {expandedSections.has('local-missing') && (
                <CardContent>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    这些资产在数据库中有记录，但本地磁盘文件丢失了。好消息是 R2 云端有备份，可以下载恢复。
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>📋 文件列表:</div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {localMissingWithR2.slice(0, 5).map((issue, idx) => (
                        <div key={idx} style={{ fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          • {issue.data.assetId}
                        </div>
                      ))}
                      {localMissingWithR2.length > 5 && (
                        <div style={{ fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                          ...还有 {localMissingWithR2.length - 5} 个文件
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={async () => {
                    if (!confirm(`确认从 R2 下载 ${localMissingWithR2.length} 个文件？`)) return;
                    try {
                      const result = await dataConsistencyManager.downloader.downloadMissingAssets();
                      alert(`✅ 下载完成\n成功: ${result.downloaded}\n失败: ${result.failed}`);
                      handleCheck();
                    } catch (error) {
                      alert(`下载失败: ${error}`);
                    }
                  }} style={{ width: '100%' }}>
                    <Download size={14} style={{ marginRight: '6px' }} />
                    从 R2 下载这些文件
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          
          {/* R2 文件丢失 (本地有文件可重新上传) */}
          {r2MissingCanReupload.length > 0 && (
            <Card>
              <CardHeader onClick={() => toggleSection('r2-missing')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                    ☁️ R2 文件丢失 (本地有文件)
                    <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                      {r2MissingCanReupload.length} 个
                    </span>
                  </CardTitle>
                  {expandedSections.has('r2-missing') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </CardHeader>
              {expandedSections.has('r2-missing') && (
                <CardContent>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    这些资产的 R2 云端文件丢失了，但本地磁盘还有文件，可以重新上传到 R2。
                  </p>
                  <Button onClick={async () => {
                    if (!confirm(`确认重新上传 ${r2MissingCanReupload.length} 个文件到 R2？`)) return;
                    try {
                      const result = await dataConsistencyManager.repairer.repairMissingFiles(
                        r2MissingCanReupload.map(i => i.data)
                      );
                      alert(`✅ 上传完成\n成功: ${result.repaired}\n失败: ${result.failed.length}`);
                      handleCheck();
                    } catch (error) {
                      alert(`上传失败: ${error}`);
                    }
                  }} style={{ width: '100%' }}>
                    <Upload size={14} style={{ marginRight: '6px' }} />
                    重新上传到 R2
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          
          {/* R2 孤儿文件 */}
          {report.orphans && report.orphans.length > 0 && (
            <Card>
              <CardHeader onClick={() => toggleSection('orphans')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                    🗑️ R2 孤儿文件
                    <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                      {report.orphans.length} 个 · {(report.orphans.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </CardTitle>
                  {expandedSections.has('orphans') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </CardHeader>
              {expandedSections.has('orphans') && (
                <CardContent>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    这些文件存在于 R2 云端，但数据库中找不到对应记录。可能是之前删除资产时没有清理 R2 文件。可以安全删除以释放存储空间。
                  </p>
                  <Button onClick={async () => {
                    const totalSize = (report.orphans!.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2);
                    if (!confirm(`⚠️ 确认删除 ${report.orphans!.length} 个孤儿文件？\n\n将释放空间: ${totalSize} MB\n\n此操作不可恢复！`)) return;
                    try {
                      const result = await dataConsistencyManager.orphanChecker.cleanupOrphans(
                        report.orphans!.map(o => o.r2_key)
                      );
                      alert(`✅ 清理完成\n成功: ${result.deleted}\n失败: ${result.failed}`);
                      handleCheck();
                    } catch (error) {
                      alert(`清理失败: ${error}`);
                    }
                  }} variant="destructive" style={{ width: '100%' }}>
                    <Trash2 size={14} style={{ marginRight: '6px' }} />
                    清理孤儿文件 (释放 {(report.orphans.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB)
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          
          {/* 本地与云端同步差异 */}
          {report.syncDiff && (report.syncDiff.onlyInLocal > 0 || report.syncDiff.onlyInCloud > 0 || report.syncDiff.conflicts > 0) && (
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: '16px' }}>🔄 本地与云端同步差异</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ fontSize: '14px' }}>
                  {report.syncDiff.onlyInLocal > 0 && <div>• 仅本地: {report.syncDiff.onlyInLocal} 个 (未上传到云端)</div>}
                  {report.syncDiff.onlyInCloud > 0 && <div>• 仅云端: {report.syncDiff.onlyInCloud} 个 (本地已删除?)</div>}
                  {report.syncDiff.conflicts > 0 && <div>• 冲突: {report.syncDiff.conflicts} 个 (数据不一致)</div>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
