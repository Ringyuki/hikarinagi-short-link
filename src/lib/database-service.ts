import prisma from './prisma'
import type { Prisma } from '../generated/prisma'

export interface Link {
  id: number
  shortCode: string
  originalUrl: string
  title?: string | null
  description?: string | null
  clicks: number
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date | null
  isActive: boolean
  userIp?: string | null
  userAgent?: string | null
}

export interface ClickAnalytics {
  id: number
  linkId: number
  clickedAt: Date
  ipAddress?: string | null
  userAgent?: string | null
  referer?: string | null
  country?: string | null
  city?: string | null
}

export interface AdminUser {
  id: number
  username: string
  password: string
  createdAt: Date
  updatedAt: Date
}

export interface ExportData {
  version: string
  exportTime: string
  data: {
    links: Link[]
    clickAnalytics: ClickAnalytics[]
    adminUsers: AdminUser[]
  }
  stats: {
    totalLinks: number
    totalClicks: number
  }
}

export class DatabaseService {
  // 链接相关操作
  static async createLink(data: {
    shortCode: string
    originalUrl: string
    title?: string
    description?: string
    expiresAt?: Date
    userIp?: string
    userAgent?: string
  }) {
    return await prisma.link.create({
      data: {
        shortCode: data.shortCode,
        originalUrl: data.originalUrl,
        title: data.title,
        description: data.description,
        expiresAt: data.expiresAt,
        userIp: data.userIp,
        userAgent: data.userAgent,
      },
    })
  }

  static async getLinkByShortCode(shortCode: string) {
    return await prisma.link.findUnique({
      where: { 
        shortCode,
        isActive: true, // 只查询活跃的链接，不过滤过期时间
      },
    })
  }

  static async getLinkById(id: number) {
    return await prisma.link.findUnique({
      where: { id },
      include: {
        clickAnalytics: {
          orderBy: { clickedAt: 'desc' },
          take: 100, // 最近100次点击
        },
      },
    })
  }

  static async getAllLinks(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    
    const [links, total] = await Promise.all([
      prisma.link.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.link.count(),
    ])

    return {
      links,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    }
  }

  static async updateLinkClicks(id: number) {
    return await prisma.link.update({
      where: { id },
      data: {
        clicks: { increment: 1 },
        updatedAt: new Date(),
      },
    })
  }

  static async deleteLink(id: number) {
    return await prisma.link.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // 硬删除链接（物理删除）
  static async hardDeleteLink(id: number) {
    return await prisma.link.delete({
      where: { id },
    })
  }

  // 批量硬删除链接
  static async hardDeleteLinks(ids: number[]) {
    return await prisma.link.deleteMany({
      where: {
        id: { in: ids },
      },
    })
  }

  static async cleanupInactiveLinks() {
    const result = await prisma.link.deleteMany({
      where: {
        OR: [
          { isActive: false },
          {
            expiresAt: {
              lt: new Date(),
            },
          },
        ],
      },
    })
    return result.count
  }

  // 点击分析相关操作
  static async recordClick(linkId: number, data: {
    ipAddress?: string
    userAgent?: string
    referer?: string
    country?: string
    city?: string
  }) {
    return await prisma.clickAnalytics.create({
      data: {
        linkId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
        country: data.country,
        city: data.city,
      },
    })
  }

  static async getLinkStats(linkId: number) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalClicks, todayClicks, weekClicks, monthClicks] = await Promise.all([
      prisma.clickAnalytics.count({
        where: { linkId },
      }),
      prisma.clickAnalytics.count({
        where: {
          linkId,
          clickedAt: {
            gte: today,
          },
        },
      }),
      prisma.clickAnalytics.count({
        where: {
          linkId,
          clickedAt: {
            gte: weekAgo,
          },
        },
      }),
      prisma.clickAnalytics.count({
        where: {
          linkId,
          clickedAt: {
            gte: monthAgo,
          },
        },
      }),
    ])

    // 使用原生 SQL 按日期分组统计特定链接的点击数
    const dailyStatsRaw = await prisma.$queryRaw`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as count
      FROM click_analytics 
      WHERE link_id = ${linkId} AND clicked_at >= ${monthAgo}
      GROUP BY DATE(clicked_at)
      ORDER BY DATE(clicked_at) ASC
    ` as Array<{ date: Date; count: bigint }>

    // 转换数据格式
    const dailyStats = dailyStatsRaw.map(item => ({
      clickedAt: item.date.toISOString(),
      _count: Number(item.count)
    }))

    return {
      totalClicks,
      todayClicks,
      weekClicks,
      monthClicks,
      dailyStats,
    }
  }

  // 全局统计
  static async getGlobalStats() {
    
    try {
      const [totalLinks, activeLinks, inactiveLinks, totalClicks, totalClickRecords, todayClicks, weekClicks] = await Promise.all([
        prisma.link.count(),
        prisma.link.count({
          where: { isActive: true },
        }),
        prisma.link.count({
          where: { isActive: false },
        }),
        prisma.clickAnalytics.count(),
        prisma.clickAnalytics.count(), // totalClickRecords 和 totalClicks 是一样的
        prisma.clickAnalytics.count({
          where: {
            clickedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.clickAnalytics.count({
          where: {
            clickedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ])

      const topLinks = await prisma.link.findMany({
        where: { isActive: true },
        orderBy: { clicks: 'desc' },
        take: 10,
        select: {
          shortCode: true,
          originalUrl: true,
          title: true,
          clicks: true,
        },
      })

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const dailyClicksRaw = await prisma.$queryRaw`
        SELECT 
          DATE(clicked_at) as date,
          COUNT(*) as count
        FROM click_analytics 
        WHERE clicked_at >= ${thirtyDaysAgo}
        GROUP BY DATE(clicked_at)
        ORDER BY DATE(clicked_at) ASC
      ` as Array<{ date: Date; count: bigint }>

      const dailyClicks = dailyClicksRaw.map(item => ({
        clickedAt: item.date.toISOString(),
        _count: Number(item.count)
      }))
      
      const result = {
        totalLinks,
        activeLinks,
        inactiveLinks,
        totalClicks,
        totalClickRecords,
        todayClicks,
        weekClicks,
        topLinks,
        dailyClicks,
      }
      
      return result;
    } catch (error) {
      console.error('[DB] getGlobalStats - 发生错误:', error);
      console.error('[DB] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown error');
      throw error;
    }
  }

  // 管理员相关操作
  static async getAdminUser(username: string) {
    return await prisma.adminUser.findUnique({
      where: { username },
    })
  }

  static async validateAdmin(username: string, password: string) {
    const admin = await prisma.adminUser.findUnique({
      where: { username },
    })
    if (!admin) {
      // 如果管理员不存在，则创建一个
      await prisma.adminUser.create({
        data: {
          username: 'admin',
          password: 'admin123',
        },
      })
    }
    return admin && admin.password === password ? admin : null
  }

  static async changeAdminPassword(username: string, newPassword: string) {
    return await prisma.adminUser.update({
      where: { username },
      data: { password: newPassword },
    })
  }

  // 数据导入导出
  static async exportData() {
    const [links, clickAnalytics, adminUsers] = await Promise.all([
      prisma.link.findMany(),
      prisma.clickAnalytics.findMany(),
      prisma.adminUser.findMany(),
    ])

    return {
      version: '1.0',
      exportTime: new Date().toISOString(),
      data: {
        links,
        clickAnalytics,
        adminUsers,
      },
      stats: {
        totalLinks: links.length,
        totalClicks: clickAnalytics.length,
      },
    }
  }

  static async importData(data: ExportData) {
    // 在事务中执行导入
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let imported = 0
      let skipped = 0

      // 导入链接
      for (const link of data.data.links || []) {
        try {
          const linkData = link as unknown as Record<string, unknown>;
          await tx.link.upsert({
            where: { shortCode: linkData.shortCode as string },
            update: {},
            create: {
              shortCode: linkData.shortCode as string,
              originalUrl: linkData.originalUrl as string,
              title: linkData.title as string | undefined,
              description: linkData.description as string | undefined,
              clicks: (linkData.clicks as number) || 0,
              createdAt: new Date(linkData.createdAt as string),
              updatedAt: new Date(linkData.updatedAt as string),
              expiresAt: linkData.expiresAt ? new Date(linkData.expiresAt as string) : null,
              isActive: (linkData.isActive as boolean) ?? true,
              userIp: linkData.userIp as string | undefined,
              userAgent: linkData.userAgent as string | undefined,
            },
          })
          imported++
        } catch {
          skipped++
        }
      }

      return { imported, skipped }
    })
  }

  // 初始化默认管理员
  static async initializeDefaultAdmin() {
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { username: 'admin' },
    })

    if (!existingAdmin) {
      await prisma.adminUser.create({
        data: {
          username: 'admin',
          password: 'admin123',
        },
      })
      console.log('默认管理员账号已创建: admin/admin123')
    }
  }

  // 检查短码是否存在（包括已删除的链接），用于唯一性验证
  static async checkShortCodeExists(shortCode: string) {
    return await prisma.link.findUnique({
      where: { shortCode },
      select: { id: true }
    })
  }
}

export default DatabaseService 