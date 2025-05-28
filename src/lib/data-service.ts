import DatabaseService from './database-service';

export interface ExportData {
  version: string;
  exportTime: string;
  data: {
    links: any[];
    clickAnalytics: any[];
    adminUsers: any[];
  };
  stats: {
    totalLinks: number;
    totalClicks: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export class DataService {
  // 导出所有数据
  static async exportData(): Promise<ExportData> {
    try {
      return await DatabaseService.exportData();
    } catch (error) {
      console.error('导出数据失败:', error);
      throw new Error('导出数据失败');
    }
  }

  // 导入数据
  static async importData(data: ExportData): Promise<ImportResult> {
    try {
      const result = await DatabaseService.importData(data);
      return {
        success: true,
        message: `成功导入 ${result.imported} 条记录，跳过 ${result.skipped} 条`,
        imported: result.imported,
        skipped: result.skipped,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        message: '导入过程中发生错误',
        imported: 0,
        skipped: 0,
        errors: [`导入失败: ${error}`]
      };
    }
  }

  // 获取数据库统计信息
  static async getDatabaseStats() {
    try {
      return await DatabaseService.getGlobalStats();
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw new Error('获取统计信息失败');
    }
  }
} 