import prisma from './prisma'
import type { Prisma } from '../generated/prisma'

// Referer 聚合级别：domain | domain_path1 | domain_path2
const REF_AGG_LEVEL = (process.env.REF_AGG_LEVEL || 'domain').toLowerCase()

function buildReferrerAggregationExpr(): string {
  // 去协议 -> 去查询 -> host/path1/path2
  const urlNoProto = "regexp_replace(referer, '^[a-zA-Z]+://', '')"
  const urlNoQuery = `split_part(${urlNoProto}, '?', 1)`
  const host = `split_part(${urlNoQuery}, '/', 1)`
  const seg1 = `split_part(${urlNoQuery}, '/', 2)`
  const seg2 = `split_part(${urlNoQuery}, '/', 3)`
  const seg1Norm = `CASE WHEN ${seg1} ~ '^[0-9]+$' OR ${seg1} ~ '^[0-9a-fA-F-]{8,}$' THEN ':id' ELSE ${seg1} END`
  const seg2Norm = `CASE WHEN ${seg2} ~ '^[0-9]+$' OR ${seg2} ~ '^[0-9a-fA-F-]{8,}$' THEN ':id' ELSE ${seg2} END`

  const hostOrDirect = `COALESCE(NULLIF(${host}, ''), 'direct')`

  if (REF_AGG_LEVEL === 'domain_path2') {
    return `${hostOrDirect} || CASE WHEN NULLIF(${seg1}, '') IS NOT NULL THEN '/' || ${seg1Norm} ELSE '' END || CASE WHEN NULLIF(${seg2}, '') IS NOT NULL THEN '/' || ${seg2Norm} ELSE '' END`
  }
  if (REF_AGG_LEVEL === 'domain_path1') {
    return `${hostOrDirect} || CASE WHEN NULLIF(${seg1}, '') IS NOT NULL THEN '/' || ${seg1Norm} ELSE '' END`
  }
  // 默认仅域名
  return hostOrDirect
}

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
    return await prisma.link.findFirst({
      where: {
        shortCode,
        isActive: true,
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

  // 事务：点击自增 + 写入点击记录
  static async recordClickWithIncrement(linkId: number, data: {
    ipAddress?: string
    userAgent?: string
    referer?: string
    country?: string
    city?: string
    countryName?: string
    countryId?: string
    provinceName?: string
    provinceId?: string
    cityName?: string
    cityId?: string
  }) {
    await prisma.$transaction([
      prisma.link.update({
        where: { id: linkId },
        data: { clicks: { increment: 1 }, updatedAt: new Date() },
      }),
      prisma.clickAnalytics.create({
        data: {
          linkId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referer: data.referer,
          country: data.country,
          city: data.city,
          countryName: data.countryName,
          countryId: data.countryId,
          provinceName: data.provinceName,
          provinceId: data.provinceId,
          cityName: data.cityName,
          cityId: data.cityId,
        },
      }),
    ])
  }

  static async deleteLink(id: number) {
    return await prisma.link.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // 更新链接（支持更新原始链接及元信息）
  static async updateLink(id: number, data: {
    originalUrl?: string
    title?: string
    description?: string
    expiresAt?: Date | null
    isActive?: boolean
  }) {
    return await prisma.link.update({
      where: { id },
      data: {
        originalUrl: data.originalUrl,
        title: data.title,
        description: data.description,
        expiresAt: data.expiresAt,
        isActive: data.isActive,
      }
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
    countryName?: string
    countryId?: string
    provinceName?: string
    provinceId?: string
    cityName?: string
    cityId?: string
  }) {
    return await prisma.clickAnalytics.create({
      data: {
        linkId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
        country: data.country,
        city: data.city,
        countryName: data.countryName,
        countryId: data.countryId,
        provinceName: data.provinceName,
        provinceId: data.provinceId,
        cityName: data.cityName,
        cityId: data.cityId,
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

    // Top Referrers（域名聚合，忽略查询与路径数值结尾；此处聚合为域名）
    const topReferrersRaw = await prisma.$queryRawUnsafe<Array<{ ref: string; count: bigint }>>(
      `SELECT ${buildReferrerAggregationExpr()} AS ref, COUNT(*) as count
       FROM click_analytics
       WHERE link_id = $1 AND clicked_at >= $2
       GROUP BY ref
       ORDER BY count DESC
       LIMIT 10`,
      linkId,
      monthAgo,
    )

    const topReferrers = topReferrersRaw.map(r => ({ referer: r.ref, clicks: Number(r.count) }))

    return {
      totalClicks,
      todayClicks,
      weekClicks,
      monthClicks,
      dailyStats,
      topReferrers,
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
      
      // 全局 Top Referrers（域名聚合，最近30天）
      const topReferrersRaw = await prisma.$queryRawUnsafe<Array<{ ref: string; count: bigint }>>(
        `SELECT ${buildReferrerAggregationExpr()} AS ref, COUNT(*) as count
         FROM click_analytics
         WHERE clicked_at >= $1
         GROUP BY ref
         ORDER BY count DESC
         LIMIT 10`,
        thirtyDaysAgo,
      )

      const topReferrers = topReferrersRaw.map(r => ({ referer: r.ref, clicks: Number(r.count) }))

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
        topReferrers,
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

  static async importData(data: ExportData, options?: { overwriteExisting?: boolean; batchSize?: number }) {
    let importedLinks = 0
    let skippedLinks = 0
    let importedClicks = 0
    let skippedClicks = 0

    // 覆盖模式：先清空，单独小事务
    if (options?.overwriteExisting) {
      await prisma.$transaction([
        prisma.clickAnalytics.deleteMany({}),
        prisma.link.deleteMany({}),
      ])
    }

    // 建立导出ID -> 新ID 的映射
    const idMap = new Map<number, number>()

    // 导入链接：逐条 upsert（或可批量分组 $transaction 数十条一批）
    for (const link of data.data.links || []) {
      try {
        const l = link as unknown as Record<string, unknown>
        const saved = await prisma.link.upsert({
          where: { shortCode: l.shortCode as string },
          update: {
            originalUrl: l.originalUrl as string,
            title: (l.title as string | null) ?? undefined,
            description: (l.description as string | null) ?? undefined,
            clicks: typeof l.clicks === 'number' ? (l.clicks as number) : 0,
            expiresAt: l.expiresAt ? new Date(l.expiresAt as string) : null,
            isActive: (l.isActive as boolean) ?? true,
            userIp: (l.userIp as string | null) ?? undefined,
            userAgent: (l.userAgent as string | null) ?? undefined,
          },
          create: {
            shortCode: l.shortCode as string,
            originalUrl: l.originalUrl as string,
            title: (l.title as string | null) ?? undefined,
            description: (l.description as string | null) ?? undefined,
            clicks: typeof l.clicks === 'number' ? (l.clicks as number) : 0,
            createdAt: new Date(l.createdAt as string),
            updatedAt: new Date(l.updatedAt as string),
            expiresAt: l.expiresAt ? new Date(l.expiresAt as string) : null,
            isActive: (l.isActive as boolean) ?? true,
            userIp: (l.userIp as string | null) ?? undefined,
            userAgent: (l.userAgent as string | null) ?? undefined,
          },
          select: { id: true },
        })
        const sourceId = Number((l.id as number) ?? NaN)
        if (!Number.isNaN(sourceId)) {
          idMap.set(sourceId, saved.id)
        }
        importedLinks++
      } catch {
        skippedLinks++
      }
    }

    // 预处理点击记录，按批次 createMany
    const prepared: Array<Prisma.ClickAnalyticsCreateManyInput> = []
    for (const ca of data.data.clickAnalytics || []) {
      const c = ca as unknown as Record<string, unknown>
      const sourceLinkId = Number(c.linkId as number)
      const targetLinkId = idMap.get(sourceLinkId)
      if (!targetLinkId) {
        skippedClicks++
        continue
      }
      prepared.push({
        linkId: targetLinkId,
        clickedAt: new Date(c.clickedAt as string),
        ipAddress: (c.ipAddress as string | null) ?? undefined,
        userAgent: (c.userAgent as string | null) ?? undefined,
        referer: (c.referer as string | null) ?? undefined,
        country: (c.country as string | null) ?? undefined,
        city: (c.city as string | null) ?? undefined,
        // 扩展地理信息（若旧备份无这些字段则为 undefined）
        countryName: (c as any).countryName ?? undefined,
        countryId: (c as any).countryId ?? undefined,
        provinceName: (c as any).provinceName ?? undefined,
        provinceId: (c as any).provinceId ?? undefined,
        cityName: (c as any).cityName ?? undefined,
        cityId: (c as any).cityId ?? undefined,
      })
    }

    const chunkSize = options?.batchSize && options.batchSize > 0 ? Math.min(10000, options.batchSize) : 1000
    for (let i = 0; i < prepared.length; i += chunkSize) {
      const chunk = prepared.slice(i, i + chunkSize)
      if (chunk.length === 0) continue
      const res = await prisma.clickAnalytics.createMany({ data: chunk })
      importedClicks += res.count
    }

    return {
      imported: { links: importedLinks, clickAnalytics: importedClicks },
      skipped: { links: skippedLinks, clickAnalytics: skippedClicks },
    }
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