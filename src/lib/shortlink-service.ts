import { nanoid } from 'nanoid';
import DatabaseService from './database-service';

export class ShortLinkService {
  // 生成短链接
  static async createShortLink(data: {
    original_url: string;
    title?: string;
    description?: string;
    expires_at?: string;
    custom_code?: string;
    user_ip?: string;
    user_agent?: string;
  }) {
    const short_code = data.custom_code || nanoid(8);
    
    // 检查自定义代码是否已存在
    if (data.custom_code) {
      const existing = await this.getLinkByShortCode(data.custom_code);
      if (existing) {
        throw new Error('自定义短码已存在');
      }
    }

    return await DatabaseService.createLink({
      shortCode: short_code,
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
  static async getLinkStats(link_id: number) {
    return await DatabaseService.getLinkStats(link_id);
  }

  // 检查链接是否过期
  static isLinkExpired(link: any): boolean {
    if (!link.expiresAt) return false;
    return new Date() > new Date(link.expiresAt);
  }
} 