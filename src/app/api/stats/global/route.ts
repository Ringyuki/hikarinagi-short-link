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
  console.log('[API] /api/stats/global - 开始处理请求');
  
  try {
    // 验证会话
    console.log('[API] 验证会话中...');
    const isValidSession = validateSessionFromRequest(request);
    console.log('[API] 会话验证结果:', isValidSession);
    
    if (!isValidSession) {
      console.log('[API] 会话验证失败，返回 401');
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    // 获取全局统计数据
    console.log('[API] 开始获取全局统计数据...');
    const stats = await DatabaseService.getGlobalStats();
    console.log('[API] 原始统计数据:', JSON.stringify(stats, null, 2));

    // 转换数据格式以匹配前端组件期望的结构
    console.log('[API] 开始转换数据格式...');
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
    
    console.log('[API] 转换后的统计数据:', JSON.stringify(transformedStats, null, 2));

    console.log('[API] 成功返回统计数据');
    return NextResponse.json({
      success: true,
      data: transformedStats
    });
  } catch (error) {
    console.error('[API] 获取全局统计失败:', error);
    console.error('[API] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败'
    }, { status: 500 });
  }
} 