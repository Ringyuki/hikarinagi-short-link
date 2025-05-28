import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequest } from '@/lib/auth';
import DatabaseService from '@/lib/database-service';

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 验证会话
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const linkId = parseInt(id);

    if (isNaN(linkId)) {
      return NextResponse.json({
        success: false,
        error: '无效的链接ID'
      }, { status: 400 });
    }

    const stats = await DatabaseService.getLinkStats(linkId);

    // 转换数据格式以匹配前端期望
    const transformedStats = {
      total_clicks: stats.totalClicks,
      today_clicks: stats.todayClicks,
      week_clicks: stats.weekClicks,
      month_clicks: stats.monthClicks,
      click_history: stats.dailyStats.map((item, index) => ({
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
    console.error('获取链接统计失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取链接统计失败'
    }, { status: 500 });
  }
} 