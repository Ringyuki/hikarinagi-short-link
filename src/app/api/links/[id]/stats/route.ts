import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = await ShortLinkService.getLinkStats(parseInt(id));

    // 转换数据格式以匹配前端组件期望的结构
    const transformedStats = {
      total_clicks: stats.totalClicks,
      today_clicks: stats.todayClicks,
      week_clicks: stats.weekClicks,
      month_clicks: stats.monthClicks,
      click_history: stats.dailyStats.map((stat: any) => ({
        date: stat.clickedAt,
        clicks: stat._count
      }))
    };

    return NextResponse.json({
      success: true,
      data: transformedStats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败'
    }, { status: 500 });
  }
} 