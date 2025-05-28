import db, { Link, ClickAnalytics } from './database';

export interface ExportData {
  version: string;
  exportTime: string;
  data: {
    links: Link[];
    clickAnalytics: ClickAnalytics[];
  };
  stats: {
    totalLinks: number;
    totalClicks: number;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    links: number;
    clickAnalytics: number;
  };
  errors: string[];
}

export class DataService {
  // 导出所有数据
  static exportData(): ExportData {
    try {
      // 获取所有链接
      const linksStmt = db.prepare('SELECT * FROM links ORDER BY created_at DESC');
      const links = linksStmt.all() as Link[];

      // 获取所有点击分析数据
      const analyticsStmt = db.prepare('SELECT * FROM click_analytics ORDER BY clicked_at DESC');
      const clickAnalytics = analyticsStmt.all() as ClickAnalytics[];

      // 统计信息
      const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);

      return {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        data: {
          links,
          clickAnalytics
        },
        stats: {
          totalLinks: links.length,
          totalClicks
        }
      };
    } catch (error) {
      console.error('导出数据失败:', error);
      throw new Error('导出数据失败');
    }
  }

  // 导入数据
  static importData(data: ExportData, options: {
    overwriteExisting?: boolean;
  } = {}): ImportResult {
    const { overwriteExisting = false } = options;
    const result: ImportResult = {
      success: false,
      message: '',
      imported: {
        links: 0,
        clickAnalytics: 0
      },
      errors: []
    };

    const transaction = db.transaction(() => {
      try {
        // 验证数据格式
        if (!data.version || !data.data) {
          throw new Error('无效的数据格式');
        }

        // 如果选择覆盖现有数据，先清空相关表
        if (overwriteExisting) {
          db.exec(`
            DELETE FROM click_analytics;
            DELETE FROM links;
          `);
        }

        // 导入链接数据
        if (data.data.links && data.data.links.length > 0) {
          const insertLinkStmt = db.prepare(`
            INSERT OR ${overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO links 
            (id, short_code, original_url, title, description, clicks, created_at, updated_at, expires_at, is_active, user_ip, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const link of data.data.links) {
            try {
              insertLinkStmt.run(
                link.id,
                link.short_code,
                link.original_url,
                link.title,
                link.description,
                link.clicks,
                link.created_at,
                link.updated_at,
                link.expires_at,
                link.is_active ? 1 : 0,
                link.user_ip,
                link.user_agent
              );
              result.imported.links++;
            } catch (error) {
              result.errors.push(`导入链接失败 ${link.short_code}: ${error}`);
            }
          }
        }

        // 导入点击分析数据
        if (data.data.clickAnalytics && data.data.clickAnalytics.length > 0) {
          const insertAnalyticsStmt = db.prepare(`
            INSERT OR ${overwriteExisting ? 'REPLACE' : 'IGNORE'} INTO click_analytics 
            (id, link_id, clicked_at, ip_address, user_agent, referer, country, city)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const analytics of data.data.clickAnalytics) {
            try {
              insertAnalyticsStmt.run(
                analytics.id,
                analytics.link_id,
                analytics.clicked_at,
                analytics.ip_address,
                analytics.user_agent,
                analytics.referer,
                analytics.country,
                analytics.city
              );
              result.imported.clickAnalytics++;
            } catch (error) {
              result.errors.push(`导入点击分析失败 ID ${analytics.id}: ${error}`);
            }
          }
        }

        result.success = true;
        result.message = `成功导入 ${result.imported.links} 个链接，${result.imported.clickAnalytics} 条点击记录`;

      } catch (error) {
        result.errors.push(`导入失败: ${error}`);
        throw error;
      }
    });

    try {
      transaction();
    } catch (error) {
      result.success = false;
      result.message = '导入过程中发生错误';
      result.errors.push(`事务失败: ${error}`);
    }

    return result;
  }

  // 清空所有数据
  static clearAllData(): { success: boolean; message: string } {
    try {
      const transaction = db.transaction(() => {
        db.exec(`
          DELETE FROM click_analytics;
          DELETE FROM links;
        `);
      });

      transaction();

      return {
        success: true,
        message: '所有数据已清空'
      };
    } catch (error) {
      return {
        success: false,
        message: `清空数据失败: ${error}`
      };
    }
  }

  // 获取数据库统计信息
  static getDatabaseStats() {
    try {
      const linksCount = db.prepare('SELECT COUNT(*) as count FROM links').get() as { count: number };
      const activeLinksCount = db.prepare('SELECT COUNT(*) as count FROM links WHERE is_active = 1').get() as { count: number };
      const clicksCount = db.prepare('SELECT COUNT(*) as count FROM click_analytics').get() as { count: number };
      const totalClicks = db.prepare('SELECT SUM(clicks) as total FROM links').get() as { total: number };

      return {
        totalLinks: linksCount.count,
        activeLinks: activeLinksCount.count,
        inactiveLinks: linksCount.count - activeLinksCount.count,
        totalClickRecords: clicksCount.count,
        totalClicks: totalClicks.total || 0
      };
    } catch (error) {
      console.error('获取数据库统计失败:', error);
      return null;
    }
  }
} 