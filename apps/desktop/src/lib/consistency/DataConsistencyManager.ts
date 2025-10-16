/**
 * 数据一致性管理器 - 统一管理所有数据一致性问题
 */

import type { ConsistencyOptions, ConsistencyReport, HealthScore, ConflictInfo } from './types';
import { IntegrityChecker } from './IntegrityChecker';
import { AutoRepairer } from './AutoRepairer';
import { CloudDownloader } from './CloudDownloader';
import { DeleteManager } from './DeleteManager';
import { ConflictResolver } from './ConflictResolver';
import { OrphanFileChecker } from './OrphanFileChecker';
import { CloudIntegrityChecker } from './CloudIntegrityChecker';
import { listAssets } from '../database/operations';

const LOG_PREFIX = '[一致性管理]';

export class DataConsistencyManager {
  public checker: IntegrityChecker;
  public repairer: AutoRepairer;
  public downloader: CloudDownloader;
  public deleteManager: DeleteManager;
  public conflictResolver: ConflictResolver;
  public orphanChecker: OrphanFileChecker;
  public cloudChecker: CloudIntegrityChecker;
  
  constructor() {
    this.checker = new IntegrityChecker();
    this.repairer = new AutoRepairer();
    this.downloader = new CloudDownloader();
    this.deleteManager = new DeleteManager();
    this.conflictResolver = new ConflictResolver();
    this.orphanChecker = new OrphanFileChecker();
    this.cloudChecker = new CloudIntegrityChecker();
    
    console.log(`${LOG_PREFIX} 初始化完成`);
  }
  
  /**
   * 完整的一致性检查和修复流程
   */
  async ensureConsistency(options: ConsistencyOptions = {}): Promise<ConsistencyReport> {
    const report: ConsistencyReport = {
      timestamp: Date.now(),
      issues: [],
      repairs: [],
      conflicts: [],
      summary: {
        totalIssues: 0,
        fixedIssues: 0,
        pendingIssues: 0
      }
    };
    
    try {
      console.log(`${LOG_PREFIX} 开始完整性检查（批量模式）...`);
      
      // 步骤 1: 检查本地资产的 R2 文件完整性（批量）
      console.log(`${LOG_PREFIX} 步骤 1/8: 批量检查本地资产的 R2 文件完整性...`);
      const integrityIssues = await this.checker.checkAllAssets();
      report.issues.push(...integrityIssues.map(i => ({
        type: 'integrity' as const,
        severity: i.needsReupload ? 'warning' as const : 'error' as const,
        data: i
      })));
      console.log(`${LOG_PREFIX} 发现 ${integrityIssues.length} 个完整性问题`);
      
      // 步骤 2: 检查 R2 孤儿文件
      console.log(`${LOG_PREFIX} 步骤 2/8: 检查 R2 孤儿文件...`);
      try {
        const orphanResult = await this.orphanChecker.checkOrphanFiles();
        report.orphans = orphanResult.orphans;
        if (orphanResult.orphans.length > 0) {
          report.issues.push({
            type: 'orphan',
            severity: 'info',
            data: orphanResult
          });
        }
        console.log(`${LOG_PREFIX} 发现 ${orphanResult.orphans.length} 个孤儿文件`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 检查孤儿文件失败:`, error);
      }
      
      // 步骤 3: 检查 D1 数据库文件完整性
      console.log(`${LOG_PREFIX} 步骤 3/8: 检查 D1 数据库文件完整性...`);
      try {
        const d1Result = await this.cloudChecker.checkD1Integrity();
        report.d1Missing = d1Result.missing;
        if (d1Result.missing.length > 0) {
          report.issues.push({
            type: 'd1_missing',
            severity: 'warning',
            data: d1Result
          });
        }
        console.log(`${LOG_PREFIX} D1 中有 ${d1Result.missing.length} 个资产的文件缺失`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 检查 D1 完整性失败:`, error);
      }
      
      // 步骤 4: 检查本地与云端数据同步
      console.log(`${LOG_PREFIX} 步骤 4/8: 检查本地与云端数据同步...`);
      try {
        const syncResult = await this.cloudChecker.checkLocalVsCloud();
        report.syncDiff = {
          onlyInLocal: syncResult.onlyInLocal.length,
          onlyInCloud: syncResult.onlyInCloud.length,
          conflicts: syncResult.conflicts.length
        };
        
        // 将同步冲突添加到报告
        if (syncResult.conflicts.length > 0) {
          report.issues.push({
            type: 'sync_conflict',
            severity: 'warning',
            data: syncResult
          });
        }
        
        console.log(`${LOG_PREFIX} 同步差异: 仅本地=${syncResult.onlyInLocal.length}, 仅云端=${syncResult.onlyInCloud.length}, 冲突=${syncResult.conflicts.length}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 检查同步状态失败:`, error);
      }
      
      // 步骤 5: 检测数据冲突
      console.log(`${LOG_PREFIX} 步骤 5/8: 检测数据冲突...`);
      try {
        const conflicts = await this.conflictResolver.detectAllConflicts();
        report.conflicts = conflicts;
        console.log(`${LOG_PREFIX} 发现 ${conflicts.length} 个数据冲突`);
      } catch (error) {
        console.error(`${LOG_PREFIX} 检测冲突失败:`, error);
      }
      
      // 步骤 6: 下载缺失的云端文件
      if (options.downloadMissing !== false) {
        console.log(`${LOG_PREFIX} 步骤 6/8: 下载缺失文件...`);
        try {
          const downloadResult = await this.downloader.downloadMissingAssets();
          report.repairs.push({
            type: 'download',
            succeeded: downloadResult.downloaded,
            failed: downloadResult.failed,
            skipped: downloadResult.skipped
          });
          console.log(`${LOG_PREFIX} 下载完成: 成功=${downloadResult.downloaded}, 失败=${downloadResult.failed}`);
        } catch (error) {
          console.error(`${LOG_PREFIX} 下载失败:`, error);
          report.repairs.push({
            type: 'download',
            succeeded: 0,
            failed: 0,
            skipped: 0
          });
        }
      }
      
      // 步骤 7: 修复 R2 文件丢失
      if (options.autoRepair !== false) {
        console.log(`${LOG_PREFIX} 步骤 7/8: 修复丢失的 R2 文件...`);
        const repairableIssues = integrityIssues.filter(i => i.needsReupload);
        if (repairableIssues.length > 0) {
          try {
            const repairResult = await this.repairer.repairMissingFiles(repairableIssues);
            report.repairs.push({
              type: 'reupload',
              succeeded: repairResult.repaired,
              failed: repairResult.failed.length,
              failedIds: repairResult.failed
            });
            console.log(`${LOG_PREFIX} 修复完成: 成功=${repairResult.repaired}, 失败=${repairResult.failed.length}`);
          } catch (error) {
            console.error(`${LOG_PREFIX} 修复失败:`, error);
            report.repairs.push({
              type: 'reupload',
              succeeded: 0,
              failed: repairableIssues.length,
              failedIds: repairableIssues.map(i => i.assetId)
            });
          }
        }
      }
      
      // 步骤 8: 清理过期删除
      if (options.cleanupDeleted !== false) {
        console.log(`${LOG_PREFIX} 步骤 8/8: 清理过期删除记录...`);
        try {
          const cleanedCount = await this.deleteManager.cleanupExpiredDeletes();
          report.repairs.push({
            type: 'cleanup',
            succeeded: cleanedCount,
            failed: 0
          });
        } catch (error) {
          console.error(`${LOG_PREFIX} 清理失败:`, error);
          report.repairs.push({
            type: 'cleanup',
            succeeded: 0,
            failed: 0
          });
        }
      }
      
      // 生成摘要
      report.summary.totalIssues = report.issues.length + report.conflicts.length;
      report.summary.fixedIssues = report.repairs.reduce((sum, r) => sum + r.succeeded, 0);
      report.summary.pendingIssues = report.summary.totalIssues - report.summary.fixedIssues;
      
      console.log(`${LOG_PREFIX} 完成: 发现 ${report.summary.totalIssues} 个问题，修复 ${report.summary.fixedIssues} 个`);
      
      return report;
    } catch (error) {
      console.error(`${LOG_PREFIX} 执行失败:`, error);
      throw error;
    }
  }
  
  /**
   * 解决检测到的冲突
   */
  async resolveConflicts(
    conflicts: ConflictInfo[],
    resolutions: Map<string, 'use_cloud' | 'use_local' | 'merge'>
  ): Promise<void> {
    await this.conflictResolver.resolveConflicts(conflicts, resolutions);
  }
  
  /**
   * 获取一致性健康度
   */
  async getHealthScore(): Promise<HealthScore> {
    console.log(`${LOG_PREFIX} 计算健康度...`);
    
    const assets = await listAssets({ limit: 10000 });
    
    let totalAssets = assets.length;
    let healthyAssets = 0;
    let issues = {
      missingR2: 0,
      missingLocal: 0,
      notSynced: 0
    };
    
    for (const asset of assets) {
      // 跳过已删除的
      if (asset.deleted) {
        totalAssets--;
        continue;
      }
      
      let isHealthy = true;
      
      // 检查是否有 R2 key
      if (!asset.r2_key) {
        issues.notSynced++;
        isHealthy = false;
      }
      
      // 检查本地文件是否存在
      if (asset.file_path) {
        const localExists = await this.checker.checkLocalFile(asset.file_path);
        if (!localExists) {
          issues.missingLocal++;
          isHealthy = false;
        }
      }
      
      if (isHealthy) {
        healthyAssets++;
      }
    }
    
    const score = totalAssets > 0 ? (healthyAssets / totalAssets) * 100 : 100;
    const grade = score >= 95 ? '优秀' : score >= 80 ? '良好' : score >= 60 ? '一般' : '较差';
    
    console.log(`${LOG_PREFIX} 健康度: ${Math.round(score)}分 (${grade})`);
    
    return {
      score: Math.round(score),
      totalAssets,
      healthyAssets,
      issues,
      grade
    };
  }
}

// 导出单例实例
export const dataConsistencyManager = new DataConsistencyManager();
