import { nanoid } from 'nanoid';
import db, { Link } from './database';

export class ShortLinkService {
  // 生成短链接
  static createShortLink(data: {
    original_url: string;
    title?: string;
    description?: string;
    expires_at?: string;
    custom_code?: string;
    user_ip?: string;
    user_agent?: string;
  }): Link {
    const short_code = data.custom_code || nanoid(8);
    
    // 检查自定义代码是否已存在
    if (data.custom_code) {
      const existing = this.getLinkByShortCode(data.custom_code);
      if (existing) {
        throw new Error('自定义短码已存在');
      }
    }

    const stmt = db.prepare(`
      INSERT INTO links (short_code, original_url, title, description, expires_at, user_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      short_code,
      data.original_url,
      data.title,
      data.description,
      data.expires_at,
      data.user_ip,
      data.user_agent
    );

    return this.getLinkById(result.lastInsertRowid as number)!;
  }

  // 根据短码获取链接
  static getLinkByShortCode(short_code: string): Link | null {
    const stmt = db.prepare('SELECT * FROM links WHERE short_code = ? AND is_active = 1');
    return stmt.get(short_code) as Link | null;
  }

  // 根据ID获取链接
  static getLinkById(id: number): Link | null {
    const stmt = db.prepare('SELECT * FROM links WHERE id = ?');
    return stmt.get(id) as Link | null;
  }

  // 获取所有链接（分页）
  static getAllLinks(page: number = 1, limit: number = 10): { links: Link[], total: number } {
    const offset = (page - 1) * limit;
    
    const linksStmt = db.prepare(`
      SELECT * FROM links 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM links');
    
    const links = linksStmt.all(limit, offset) as Link[];
    const { count } = countStmt.get() as { count: number };
    
    return { links, total: count };
  }

  // 更新链接
  static updateLink(id: number, data: Partial<Link>): Link | null {
    const fields = Object.keys(data).filter(key => key !== 'id').map(key => `${key} = ?`);
    const values = Object.values(data).filter((_, index) => Object.keys(data)[index] !== 'id');
    
    if (fields.length === 0) return this.getLinkById(id);

    const stmt = db.prepare(`
      UPDATE links 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(...values, id);
    return this.getLinkById(id);
  }

  // 删除链接（软删除）
  static deleteLink(id: number): boolean {
    const stmt = db.prepare('UPDATE links SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // 物理删除失效链接
  static cleanupInactiveLinks(): { deletedCount: number } {
    const transaction = db.transaction(() => {
      // 先删除相关的点击分析记录
      const deleteAnalyticsStmt = db.prepare(`
        DELETE FROM click_analytics 
        WHERE link_id IN (SELECT id FROM links WHERE is_active = 0)
      `);
      deleteAnalyticsStmt.run();

      // 再删除失效的链接记录
      const deleteLinksStmt = db.prepare('DELETE FROM links WHERE is_active = 0');
      const result = deleteLinksStmt.run();
      
      return { deletedCount: result.changes };
    });

    return transaction();
  }

  // 物理删除过期链接
  static cleanupExpiredLinks(): { deletedCount: number } {
    const transaction = db.transaction(() => {
      // 先删除相关的点击分析记录
      const deleteAnalyticsStmt = db.prepare(`
        DELETE FROM click_analytics 
        WHERE link_id IN (
          SELECT id FROM links 
          WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
        )
      `);
      deleteAnalyticsStmt.run();

      // 再删除过期的链接记录
      const deleteLinksStmt = db.prepare(`
        DELETE FROM links 
        WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
      `);
      const result = deleteLinksStmt.run();
      
      return { deletedCount: result.changes };
    });

    return transaction();
  }

  // 获取失效和过期链接的统计
  static getCleanupStats(): { 
    inactiveCount: number; 
    expiredCount: number; 
    totalCleanupCount: number;
  } {
    const inactiveStmt = db.prepare('SELECT COUNT(*) as count FROM links WHERE is_active = 0');
    const inactiveResult = inactiveStmt.get() as { count: number };

    const expiredStmt = db.prepare(`
      SELECT COUNT(*) as count FROM links 
      WHERE expires_at IS NOT NULL AND expires_at < datetime('now') AND is_active = 1
    `);
    const expiredResult = expiredStmt.get() as { count: number };

    return {
      inactiveCount: inactiveResult.count,
      expiredCount: expiredResult.count,
      totalCleanupCount: inactiveResult.count + expiredResult.count
    };
  }

  // 记录点击
  static recordClick(link_id: number, data: {
    ip_address?: string;
    user_agent?: string;
    referer?: string;
    country?: string;
    city?: string;
  }): void {
    // 更新点击次数
    const updateStmt = db.prepare('UPDATE links SET clicks = clicks + 1 WHERE id = ?');
    updateStmt.run(link_id);

    // 记录点击分析
    const insertStmt = db.prepare(`
      INSERT INTO click_analytics (link_id, ip_address, user_agent, referer, country, city)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      link_id,
      data.ip_address,
      data.user_agent,
      data.referer,
      data.country,
      data.city
    );
  }

  // 获取链接统计
  static getLinkStats(link_id: number): {
    total_clicks: number;
    today_clicks: number;
    week_clicks: number;
    month_clicks: number;
    click_history: Array<{ date: string; clicks: number }>;
  } {
    const totalStmt = db.prepare('SELECT clicks FROM links WHERE id = ?');
    const total = totalStmt.get(link_id) as { clicks: number } | undefined;

    const todayStmt = db.prepare(`
      SELECT COUNT(*) as count FROM click_analytics 
      WHERE link_id = ? AND DATE(clicked_at) = DATE('now')
    `);
    const today = todayStmt.get(link_id) as { count: number };

    const weekStmt = db.prepare(`
      SELECT COUNT(*) as count FROM click_analytics 
      WHERE link_id = ? AND clicked_at >= DATE('now', '-7 days')
    `);
    const week = weekStmt.get(link_id) as { count: number };

    const monthStmt = db.prepare(`
      SELECT COUNT(*) as count FROM click_analytics 
      WHERE link_id = ? AND clicked_at >= DATE('now', '-30 days')
    `);
    const month = monthStmt.get(link_id) as { count: number };

    const historyStmt = db.prepare(`
      SELECT DATE(clicked_at) as date, COUNT(*) as clicks
      FROM click_analytics 
      WHERE link_id = ? AND clicked_at >= DATE('now', '-30 days')
      GROUP BY DATE(clicked_at)
      ORDER BY date DESC
    `);
    const history = historyStmt.all(link_id) as Array<{ date: string; clicks: number }>;

    return {
      total_clicks: total?.clicks || 0,
      today_clicks: today.count,
      week_clicks: week.count,
      month_clicks: month.count,
      click_history: history
    };
  }

  // 检查链接是否过期
  static isLinkExpired(link: Link): boolean {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  }
} 