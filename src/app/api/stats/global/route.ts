import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequest } from '@/lib/auth';
import DatabaseService from '@/lib/database-service';

interface TopLink {
  shortCode: string;
  originalUrl: string;
  title?: string | null;
  clicks: number;
}

interface DailyClick {
  clickedAt: string;
  _count: number;
}

export async function GET(request: NextRequest) {
  try {
    // 验证会话
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    // 获取全局统计数据
    const stats = await DatabaseService.getGlobalStats();

    // 转换数据格式以匹配前端组件期望的结构
    const transformedStats = {
      total_links: stats.totalLinks,
      total_clicks: stats.totalClicks,
      today_clicks: stats.todayClicks,
      week_clicks: stats.weekClicks,
      top_links: stats.topLinks.map((link: TopLink) => ({
        short_code: link.shortCode,
        original_url: link.originalUrl,
        title: link.title,
        clicks: link.clicks
      })),
      daily_clicks: stats.dailyClicks.map((item: DailyClick, index: number) => ({
        date: item.clickedAt,
        clicks: item._count,
        // 使用时间戳和索引生成唯一标识符
        id: `${new Date(item.clickedAt).getTime()}-${index}`
      }))
    };

    return NextResponse.json({
      success: true,
      data: transformedStats
    });
  } catch (error) {
    console.error('获取全局统计失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败'
    }, { status: 500 });
  }
} 