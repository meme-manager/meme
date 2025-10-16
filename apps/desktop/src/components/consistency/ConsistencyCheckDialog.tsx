/**
 * 数据一致性检查对话框
 */

import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { dataConsistencyManager } from '../../lib/consistency/DataConsistencyManager';
import type { ConsistencyReport } from '../../lib/consistency/types';
import { useAssetStore } from '../../stores/assetStore';
import './ConsistencyCheckDialog.css';

interface ConsistencyCheckDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ConsistencyCheckDialog({ open, onClose }: ConsistencyCheckDialogProps) {
  console.log('[ConsistencyCheckDialog] 渲染，open:', open);
  const { assets } = useAssetStore();  // 获取已加载的资产数据
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<ConsistencyReport | null>(null);
  const [dbStats, setDbStats] = useState<{
    localTotal: number;      // 本地数据库总资产数
    r2Total: number;         // R2 实际文件数
    d1Total: number;         // D1 云端数据库总资产数
  }>({ localTotal: 0, r2Total: 0, d1Total: 0 });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stats']));
  
  // 执行检查
  const handleCheck = async () => {
    setChecking(true);
    try {
      console.log('[ConsistencyCheckDialog] 开始检查...');
      
      // 1. 先直接查询数据库，看看数据库里到底有什么
      console.log('[ConsistencyCheckDialog] === 步骤1: 直接查询数据库 ===');
      const { getDatabase } = await import('../../lib/database/index');
      const db = await getDatabase();
      const allDbAssets = await db.select<Array<any>>('SELECT * FROM assets ORDER BY created_at DESC');
      console.log('[ConsistencyCheckDialog] 数据库中所有资产（包括已删除）:', allDbAssets);
      console.log('[ConsistencyCheckDialog] 数据库中资产总数:', allDbAssets.length);
      
      // 检查每个资产的 deleted 状态
      const deletedAssets = allDbAssets.filter((a: any) => a.deleted === 1);
      const activeDbAssets = allDbAssets.filter((a: any) => a.deleted === 0);
      
      console.log(`[ConsistencyCheckDialog] 已删除的资产: ${deletedAssets.length} 个`);
      console.log(`[ConsistencyCheckDialog] 活跃的资产: ${activeDbAssets.length} 个`);
      
      allDbAssets.forEach((asset: any, index: number) => {
        console.log(`[ConsistencyCheckDialog] 资产 ${index + 1}:`, {
          id: asset.id,
          file_name: asset.file_name,
          file_path: asset.file_path,
          deleted: asset.deleted,
          created_at: new Date(asset.created_at).toLocaleString(),
        });
      });
      
      // 如果有已删除的资产，提供恢复选项（只在第一次检查时提示）
      if (deletedAssets.length > 0 && !report) {
        // 使用 Tauri 的对话框 API
        const { ask } = await import('@tauri-apps/plugin-dialog');
        
        const shouldRestore = await ask(
          `这些资产的文件还在，但被软删除了。\n\n是否恢复这些资产？\n\n` +
          deletedAssets.map((a: any, i: number) => 
            `${i + 1}. ${a.file_name}`
          ).join('\n'),
          {
            title: `⚠️ 发现 ${deletedAssets.length} 个被标记为已删除的资产`,
            kind: 'warning',
            okLabel: '恢复',
            cancelLabel: '取消'
          }
        );
        
        if (shouldRestore) {
          console.log('[ConsistencyCheckDialog] 开始恢复已删除的资产...');
          for (const asset of deletedAssets) {
            await db.execute(
              'UPDATE assets SET deleted = 0, updated_at = ? WHERE id = ?',
              [Date.now(), asset.id]
            );
            console.log(`[ConsistencyCheckDialog] ✅ 已恢复: ${asset.file_name}`);
          }
          
          // 刷新 assetStore
          const { refreshAssets } = useAssetStore.getState();
          await refreshAssets();
          
          alert(`✅ 成功恢复 ${deletedAssets.length} 个资产！\n\n请关闭此对话框查看主界面。`);
          
          // 直接返回，不继续后续检查
          setChecking(false);
          return;
        }
      }
      
      // 2. 使用 assetStore 中已加载的资产数据
      console.log('[ConsistencyCheckDialog] === 步骤2: 检查 assetStore ===');
      console.log('[ConsistencyCheckDialog] 从 assetStore 获取的资产数:', assets.length);
      console.log('[ConsistencyCheckDialog] 资产列表:', assets);
      
      // 3. 检查每个资产的文件是否存在
      console.log('[ConsistencyCheckDialog] === 步骤3: 检查文件是否存在 ===');
      const { invoke } = await import('@tauri-apps/api/core');
      for (const asset of allDbAssets) {
        try {
          const exists = await invoke('file_exists', { filePath: asset.file_path });
          console.log(`[ConsistencyCheckDialog] 文件检查: ${asset.file_path} -> ${exists ? '存在' : '不存在'}`);
        } catch (error) {
          console.error(`[ConsistencyCheckDialog] 检查文件失败: ${asset.file_path}`, error);
        }
      }
      
      // 执行完整性检查
      const result = await dataConsistencyManager.ensureConsistency({
        downloadMissing: false,
        autoRepair: false,
        cleanupDeleted: false
      });
      console.log('[ConsistencyCheckDialog] 检查完成，结果:', result);
      
      // 计算 R2 文件总数（有 r2_key 的资产数）
      const r2TotalCount = assets.filter(a => a.r2_key).length;
      
      // 计算 D1 云端数据库总数
      // D1 总数 = 仅云端 + 本地也有的（本地总数 - 仅本地）
      const d1TotalCount = result.syncDiff ? 
        (result.syncDiff.onlyInCloud + (assets.length - result.syncDiff.onlyInLocal)) : 0;
      
      console.log('[ConsistencyCheckDialog] 统计:', {
        local: assets.length,
        r2: r2TotalCount,
        d1: d1TotalCount,
        syncDiff: result.syncDiff
      });
      
      setDbStats({
        localTotal: assets.length,
        r2Total: r2TotalCount,
        d1Total: d1TotalCount
      });
      
      setReport(result);
    } catch (error) {
      console.error('[ConsistencyCheckDialog] 检查失败:', error);
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
  
  // 统计不同类型的问题
  // 1. 本地文件丢失（R2 有备份）：R2 存在，本地不存在
  const localMissingWithR2 = report?.issues.filter(
    i => i.type === 'integrity' && i.data.exists && !i.data.localExists
  ) || [];
  
  // 2. R2 文件丢失（本地有文件）：R2 不存在，本地存在，可以重新上传
  const r2MissingCanReupload = report?.issues.filter(
    i => i.type === 'integrity' && !i.data.exists && i.data.localExists && i.data.needsReupload
  ) || [];
  
  // 3. 两边都丢失：R2 和本地都不存在
  const bothMissing = report?.issues.filter(
    i => i.type === 'integrity' && !i.data.exists && !i.data.localExists
  ) || [];
  
  console.log('[ConsistencyCheckDialog] 返回 JSX');
  console.log('[ConsistencyCheckDialog] - 本地文件丢失(R2有备份):', localMissingWithR2.length);
  console.log('[ConsistencyCheckDialog] - R2文件丢失(本地有):', r2MissingCanReupload.length);
  console.log('[ConsistencyCheckDialog] - 文件完全丢失:', bothMissing.length);
  console.log('[ConsistencyCheckDialog] - 报告详情:', report);
  
  return (
    <Dialog open={open} onClose={onClose} title="📊 数据一致性检查">
      <div className="consistency-check-dialog">
        {/* 操作按钮 */}
        <div className="check-actions">
          <button
            className="check-btn primary"
            onClick={handleCheck}
            disabled={checking}
          >
            {checking ? '🔄 检查中...（可能需要几秒钟）' : '🔍 执行完整性检查'}
          </button>
          {checking && (
            <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              正在检查本地资产、R2 文件、D1 数据库和同步状态...
            </div>
          )}
        </div>
        
        {/* 检查摘要 */}
        {report && (
          <div className="check-summary">
            <div className="summary-stats">
              <div className="consistency-stat-card">
                <div className="consistency-stat-label">发现问题</div>
                <div className="consistency-stat-value" style={{ color: report.summary.totalIssues > 0 ? '#ef4444' : '#10b981' }}>
                  {report.summary.totalIssues}
                </div>
              </div>
              <div className="consistency-stat-card">
                <div className="consistency-stat-label">待处理</div>
                <div className="consistency-stat-value">
                  {report.summary.pendingIssues}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 检查统计信息 */}
        {report && (
          <div className="check-summary" style={{ marginTop: '16px' }}>
            <div className="issue-card">
              <div className="issue-header" onClick={() => toggleSection('stats')}>
                <div className="issue-title">📊 检查统计</div>
                <div className="expand-icon">{expandedSections.has('stats') ? '▲' : '▼'}</div>
              </div>
              {expandedSections.has('stats') && (
                <div className="issue-content">
                  {/* 数据源统计 */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>💾 数据源统计</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>💻 本地数据库</div>
                        <div style={{ fontSize: '28px', fontWeight: 700 }}>{dbStats.localTotal}</div>
                      </div>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>☁️ R2 文件存储</div>
                        <div style={{ fontSize: '28px', fontWeight: 700 }}>{dbStats.r2Total}</div>
                      </div>
                      <div style={{ padding: '16px', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>🗄️ D1 云端库</div>
                        <div style={{ fontSize: '28px', fontWeight: 700 }}>
                          {report.syncDiff !== undefined ? dbStats.d1Total : '-'}
                        </div>
                        {report.syncDiff === undefined && (
                          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>未启用云同步</div>
                        )}
                      </div>
                    </div>
                    {dbStats.localTotal === 0 ? (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                        ⚠️ 本地数据库暂无资产，请先添加图片或表情包
                      </div>
                    ) : dbStats.localTotal > 0 && report.summary.totalIssues === 0 ? (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                        ✨ 所有资产都很健康，没有发现任何问题
                      </div>
                    ) : null}
                  </div>
                  
                  {/* 文件完整性统计 */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>📁 文件完整性</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <div className="stat-item">
                        <div className="stat-item-label">本地文件丢失</div>
                        <div className="stat-item-value">{localMissingWithR2.length}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-item-label">R2 文件丢失</div>
                        <div className="stat-item-value">{r2MissingCanReupload.length}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-item-label">文件完全丢失</div>
                        <div className="stat-item-value">{bothMissing.length}</div>
                      </div>
                      {report.orphans !== undefined && (
                        <div className="stat-item">
                          <div className="stat-item-label">R2 孤儿文件</div>
                          <div className="stat-item-value">
                            {report.orphans.length}
                            {report.orphans.length > 0 && (
                              <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '4px' }}>
                                ({(report.orphans.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)}MB)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 云端数据库统计 */}
                  {report.d1Missing !== undefined && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>☁️ 云端数据库</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div className="stat-item">
                          <div className="stat-item-label">D1 文件缺失</div>
                          <div className="stat-item-value">{report.d1Missing.length}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 同步状态统计 */}
                  {report.syncDiff !== undefined && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>🔄 同步状态</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div className="stat-item">
                          <div className="stat-item-label">仅本地</div>
                          <div className="stat-item-value">{report.syncDiff.onlyInLocal}</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-item-label">仅云端</div>
                          <div className="stat-item-value">{report.syncDiff.onlyInCloud}</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-item-label">数据冲突</div>
                          <div className="stat-item-value">{report.syncDiff.conflicts}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 检查时间 */}
                  <div style={{ padding: '12px', background: 'var(--background-secondary)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong>检查时间：</strong>{new Date(report.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 健康状态 */}
        {report && report.summary.totalIssues === 0 && (
          <div className="health-status success">
            <div className="status-icon">✅</div>
            <div>
              <div className="status-title">数据完全健康</div>
              <div className="status-desc">太棒了！您的数据完全一致，没有发现任何问题。</div>
            </div>
          </div>
        )}
        
        {/* 问题详情 */}
        {report && report.summary.totalIssues > 0 && (
          <div className="issues-list">
            <h3 className="issues-title">🔍 问题详情</h3>
            
            {/* 本地文件丢失 (R2 有备份可下载) */}
            {localMissingWithR2.length > 0 && (
              <div className="issue-card">
                <div className="issue-header" onClick={() => toggleSection('local-missing')}>
                  <div className="issue-title">
                    📁 本地文件丢失 (R2 有备份)
                    <span className="issue-count">{localMissingWithR2.length} 个</span>
                  </div>
                  <div className="expand-icon">{expandedSections.has('local-missing') ? '▲' : '▼'}</div>
                </div>
                {expandedSections.has('local-missing') && (
                  <div className="issue-content">
                    <p className="issue-desc">
                      这些资产在数据库中有记录，但本地磁盘文件丢失了。好消息是 R2 云端有备份，可以下载恢复。
                    </p>
                    <button
                      className="action-btn"
                      onClick={async () => {
                        if (!confirm(`确认从 R2 下载 ${localMissingWithR2.length} 个文件？`)) return;
                        try {
                          const result = await dataConsistencyManager.downloader.downloadMissingAssets();
                          alert(`✅ 下载完成\n成功: ${result.downloaded}\n失败: ${result.failed}`);
                          handleCheck();
                        } catch (error) {
                          alert(`下载失败: ${error}`);
                        }
                      }}
                    >
                      ☁️ 从 R2 下载这些文件
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* R2 文件丢失 (本地有文件可重新上传) */}
            {r2MissingCanReupload.length > 0 && (
              <div className="issue-card">
                <div className="issue-header" onClick={() => toggleSection('r2-missing')}>
                  <div className="issue-title">
                    ☁️ R2 文件丢失 (本地有文件)
                    <span className="issue-count">{r2MissingCanReupload.length} 个</span>
                  </div>
                  <div className="expand-icon">{expandedSections.has('r2-missing') ? '▲' : '▼'}</div>
                </div>
                {expandedSections.has('r2-missing') && (
                  <div className="issue-content">
                    <p className="issue-desc">
                      这些资产的 R2 云端文件丢失了，但本地磁盘还有文件，可以重新上传到 R2。
                    </p>
                    <button
                      className="action-btn"
                      onClick={async () => {
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
                      }}
                    >
                      📤 重新上传到 R2
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* 文件完全丢失（两边都没有） */}
            {bothMissing.length > 0 && (
              <div className="issue-card">
                <div className="issue-header" onClick={() => toggleSection('both-missing')}>
                  <div className="issue-title">
                    ❌ 文件完全丢失
                    <span className="issue-count">{bothMissing.length} 个</span>
                  </div>
                  <div className="expand-icon">{expandedSections.has('both-missing') ? '▲' : '▼'}</div>
                </div>
                {expandedSections.has('both-missing') && (
                  <div className="issue-content">
                    <p className="issue-desc">
                      这些资产的文件在 R2 云端和本地磁盘都不存在了，无法恢复。建议从数据库中删除这些资产记录以清理数据库。
                    </p>
                    <button
                      className="action-btn danger"
                      onClick={async () => {
                        if (!confirm(`⚠️ 确认删除 ${bothMissing.length} 个资产记录？\n\n这些资产的文件已完全丢失，删除记录不会影响任何实际文件。\n\n此操作不可恢复！`)) return;
                        try {
                          // 批量删除资产记录
                          const { deleteAsset } = await import('../../lib/database/operations');
                          const assetIds = bothMissing.map(issue => issue.data.assetId);
                          let deleted = 0;
                          for (const id of assetIds) {
                            const success = await deleteAsset(id);
                            if (success) deleted++;
                          }
                          alert(`✅ 清理完成\n已删除 ${deleted}/${assetIds.length} 个资产记录`);
                          handleCheck();
                        } catch (error) {
                          alert(`删除失败: ${error}`);
                        }
                      }}
                    >
                      🗑️ 清理这些资产记录
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* R2 孤儿文件 */}
            {report.orphans && report.orphans.length > 0 && (
              <div className="issue-card">
                <div className="issue-header" onClick={() => toggleSection('orphans')}>
                  <div className="issue-title">
                    🗑️ R2 孤儿文件
                    <span className="issue-count">
                      {report.orphans.length} 个 · {(report.orphans.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="expand-icon">{expandedSections.has('orphans') ? '▲' : '▼'}</div>
                </div>
                {expandedSections.has('orphans') && (
                  <div className="issue-content">
                    <p className="issue-desc">
                      这些文件存在于 R2 云端，但数据库中找不到对应记录。可能是之前删除资产时没有清理 R2 文件。可以安全删除以释放存储空间。
                    </p>
                    <button
                      className="action-btn danger"
                      onClick={async () => {
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
                      }}
                    >
                      🗑️ 清理孤儿文件 (释放 {(report.orphans.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB)
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* D1 缺失文件 */}
            {report.d1Missing && report.d1Missing.length > 0 && (
              <div className="issue-card">
                <div className="issue-header" onClick={() => toggleSection('d1-missing')}>
                  <div className="issue-title">
                    ⚠️ 云端数据库文件缺失
                    <span className="issue-count">{report.d1Missing.length} 个</span>
                  </div>
                  <div className="expand-icon">{expandedSections.has('d1-missing') ? '▲' : '▼'}</div>
                </div>
                {expandedSections.has('d1-missing') && (
                  <div className="issue-content">
                    <p className="issue-desc">
                      云端数据库(D1)中有这些资产记录，但对应的 R2 文件不存在。这可能是 R2 文件被意外删除导致的。
                    </p>
                    <p className="issue-desc" style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>
                      建议：如果本地有对应文件，可以通过"R2 文件丢失"功能重新上传；否则需要从云端数据库删除这些记录。
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* 同步差异 */}
            {report.syncDiff && (report.syncDiff.onlyInLocal > 0 || report.syncDiff.onlyInCloud > 0 || report.syncDiff.conflicts > 0) && (
              <div className="issue-card">
                <div className="issue-header" onClick={() => toggleSection('sync-diff')}>
                  <div className="issue-title">
                    🔄 本地与云端同步差异
                    <span className="issue-count">
                      {report.syncDiff.onlyInLocal + report.syncDiff.onlyInCloud + report.syncDiff.conflicts} 个
                    </span>
                  </div>
                  <div className="expand-icon">{expandedSections.has('sync-diff') ? '▲' : '▼'}</div>
                </div>
                {expandedSections.has('sync-diff') && (
                  <div className="issue-content">
                    {report.syncDiff.onlyInLocal > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>• 仅本地: {report.syncDiff.onlyInLocal} 个</div>
                        <div style={{ fontSize: '13px', opacity: 0.8, paddingLeft: '16px' }}>
                          这些资产只在本地数据库中存在，还未上传到云端。建议启用云同步将它们上传。
                        </div>
                      </div>
                    )}
                    {report.syncDiff.onlyInCloud > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>• 仅云端: {report.syncDiff.onlyInCloud} 个</div>
                        <div style={{ fontSize: '13px', opacity: 0.8, paddingLeft: '16px' }}>
                          这些资产只在云端数据库中存在，本地数据库中找不到。可能是本地数据被删除或清空了。
                        </div>
                      </div>
                    )}
                    {report.syncDiff.conflicts > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>• 冲突: {report.syncDiff.conflicts} 个</div>
                        <div style={{ fontSize: '13px', opacity: 0.8, paddingLeft: '16px' }}>
                          这些资产在本地和云端都存在，但数据内容不一致。需要手动选择保留哪一方的数据。
                        </div>
                      </div>
                    )}
                    <p className="issue-desc" style={{ marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>
                      提示：请使用云同步功能来解决这些差异。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
