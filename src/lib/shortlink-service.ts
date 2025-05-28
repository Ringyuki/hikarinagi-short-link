import DatabaseService from './database-service';

interface LinkStats {
  totalClicks: number;
  todayClicks: number;
  weekClicks: number;
  monthClicks: number;
  dailyStats: Array<{
    clickedAt: string;
    _count: number;
  }>;
}

export class ShortLinkService {
  // 生成短链接
  static generateShortCode(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 验证URL格式
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 创建短链接
  static async createShortLink(data: {
    original_url: string;
    title?: string;
    description?: string;
    expires_at?: string;
    user_ip?: string;
    user_agent?: string;
    custom_code?: string;
  }) {
    if (!this.isValidUrl(data.original_url)) {
      throw new Error('无效的URL格式');
    }

    // 生成唯一的短代码
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    // 如果提供了自定义代码，先检查是否可用
    if (data.custom_code) {
      const existing = await DatabaseService.getLinkByShortCode(data.custom_code);
      if (existing) {
        throw new Error('自定义短代码已存在');
      }
      shortCode = data.custom_code;
    } else {
      // 生成随机短代码
      do {
        shortCode = this.generateShortCode();
        const existing = await DatabaseService.getLinkByShortCode(shortCode);
        if (!existing) break;
        
        attempts++;
        if (attempts >= maxAttempts) {
          shortCode = this.generateShortCode(8); // 增加长度
          break;
        }
      } while (attempts < maxAttempts);
    }

    // 创建链接记录
    return await DatabaseService.createLink({
      shortCode,
      originalUrl: data.original_url,
      title: data.title,
      description: data.description,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      userIp: data.user_ip,
      userAgent: data.user_agent,
    });
  }

  // 根据短码获取链接
  static async getLinkByShortCode(short_code: string) {
    return await DatabaseService.getLinkByShortCode(short_code);
  }

  // 根据ID获取链接
  static async getLinkById(id: number) {
    return await DatabaseService.getLinkById(id);
  }

  // 获取所有链接（分页）
  static async getAllLinks(page: number = 1, limit: number = 10) {
    return await DatabaseService.getAllLinks(page, limit);
  }

  // 删除链接（软删除）
  static async deleteLink(id: number): Promise<boolean> {
    try {
      await DatabaseService.deleteLink(id);
      return true;
    } catch {
      return false;
    }
  }

  // 物理删除失效链接
  static async cleanupInactiveLinks(): Promise<{ deletedCount: number }> {
    const deletedCount = await DatabaseService.cleanupInactiveLinks();
    return { deletedCount };
  }

  // 记录点击
  static async recordClick(link_id: number, data: {
    ip_address?: string;
    user_agent?: string;
    referer?: string;
    country?: string;
    city?: string;
  }): Promise<void> {
    // 更新点击次数
    await DatabaseService.updateLinkClicks(link_id);

    // 记录点击分析
    await DatabaseService.recordClick(link_id, {
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      referer: data.referer,
      country: data.country,
      city: data.city,
    });
  }

  // 获取链接统计
  static async getLinkStats(link_id: number): Promise<LinkStats> {
    return await DatabaseService.getLinkStats(link_id);
  }

  // 检查链接是否过期
  static isLinkExpired(link: any): boolean {
    if (!link.expiresAt) return false;
    return new Date() > new Date(link.expiresAt);
  }
} 