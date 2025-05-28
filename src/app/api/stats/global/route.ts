import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequest } from '@/lib/auth';
import db from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // 验证会话
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    // 获取总链接数
    const totalLinksStmt = db.prepare('SELECT COUNT(*) as count FROM links WHERE is_active = 1');
    const totalLinks = totalLinksStmt.get() as { count: number };

    // 获取总点击数
    const totalClicksStmt = db.prepare('SELECT SUM(clicks) as total FROM links WHERE is_active = 1');
    const totalClicks = totalClicksStmt.get() as { total: number | null };

    // 获取今日点击数
    const todayClicksStmt = db.prepare(`
      SELECT COUNT(*) as count FROM click_analytics 
      WHERE DATE(clicked_at) = DATE('now')
    `);
    const todayClicks = todayClicksStmt.get() as { count: number };

    // 获取本周点击数
    const weekClicksStmt = db.prepare(`
      SELECT COUNT(*) as count FROM click_analytics 
      WHERE clicked_at >= DATE('now', '-7 days')
    `);
    const weekClicks = weekClicksStmt.get() as { count: number };

    // 获取热门链接 Top 10
    const topLinksStmt = db.prepare(`
      SELECT short_code, original_url, title, clicks 
      FROM links 
      WHERE is_active = 1 
      ORDER BY clicks DESC 
      LIMIT 10
    `);
    const topLinks = topLinksStmt.all();

    // 获取每日点击数据（最近30天）
    const dailyClicksStmt = db.prepare(`
      SELECT DATE(clicked_at) as date, COUNT(*) as clicks
      FROM click_analytics 
      WHERE clicked_at >= DATE('now', '-30 days')
      GROUP BY DATE(clicked_at)
      ORDER BY date DESC
    `);
    const dailyClicks = dailyClicksStmt.all();

    return NextResponse.json({
      success: true,
      data: {
        total_links: totalLinks.count,
        total_clicks: totalClicks.total || 0,
        today_clicks: todayClicks.count,
        week_clicks: weekClicks.count,
        top_links: topLinks,
        daily_clicks: dailyClicks
      }
    });
  } catch (error) {
    console.error('获取全局统计失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败'
    }, { status: 500 });
  }
} 