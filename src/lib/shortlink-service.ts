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
  // 尝试抓取页面标题
  private static async tryFetchPageTitle(targetUrl: string): Promise<string | undefined> {
    try {
      const urlObj = new URL(targetUrl);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return undefined;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // 2s 超时
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        redirect: 'follow',
        signal: controller.signal,
      }).catch((error) => {
        console.error('Failed to fetch page title:', error);
        return undefined;
      });
      clearTimeout(timeout);

      if (!res || !res.ok) {
        console.error('Failed to fetch page title:', res);
        return undefined;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('text/html')) {
        console.error('Failed to fetch page title:', contentType);
        return undefined;
      }

      const html = await res.text();
      const snippet = html.slice(0, 100000); // 限制最大解析体积
      const match = snippet.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = match?.[1]?.trim();
      return title || undefined;
    } catch {
      return undefined;
    }
  }
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
      // 检查短码是否已存在（包括已删除的链接）
      const existing = await DatabaseService.checkShortCodeExists(data.custom_code);
      if (existing) {
        throw new Error('自定义短代码已存在');
      }
      shortCode = data.custom_code;
    } else {
      // 生成随机短代码
      do {
        shortCode = this.generateShortCode();
        // 检查短码是否已存在（包括已删除的链接）
        const existing = await DatabaseService.checkShortCodeExists(shortCode);
        if (!existing) break;
        
        attempts++;
        if (attempts >= maxAttempts) {
          shortCode = this.generateShortCode(8); // 增加长度
          break;
        }
      } while (attempts < maxAttempts);
    }

    // 若未提供标题，尝试抓取目标页面标题（失败则忽略）
    let resolvedTitle = data.title;
    if (!resolvedTitle) {
      resolvedTitle = await this.tryFetchPageTitle(data.original_url).catch(() => undefined);
    }

    // 创建链接记录
    return await DatabaseService.createLink({
      shortCode,
      originalUrl: data.original_url,
      title: resolvedTitle,
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

  // 硬删除链接（物理删除）
  static async hardDeleteLink(id: number): Promise<boolean> {
    try {
      await DatabaseService.hardDeleteLink(id);
      return true;
    } catch {
      return false;
    }
  }

  // 批量硬删除链接
  static async hardDeleteLinks(ids: number[]): Promise<{ deletedCount: number }> {
    try {
      const result = await DatabaseService.hardDeleteLinks(ids);
      return { deletedCount: result.count };
    } catch {
      return { deletedCount: 0 };
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
    country_name?: string;
    country_id?: string;
    province_name?: string;
    province_id?: string;
    city_name?: string;
    city_id?: string;
  }): Promise<void> {
    await (DatabaseService as any).recordClickWithIncrement(link_id, {
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      referer: data.referer,
      country: data.country,
      city: data.city,
      countryName: data.country_name,
      countryId: data.country_id,
      provinceName: data.province_name,
      provinceId: data.province_id,
      cityName: data.city_name,
      cityId: data.city_id,
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