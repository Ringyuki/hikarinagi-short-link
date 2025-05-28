import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';
import { validateSessionFromRequest } from '@/lib/auth';
import DatabaseService from '@/lib/database-service';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const isAuthenticated = validateSessionFromRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { type } = await request.json();

    let result;
    if (type === 'inactive' || type === 'all') {
      // 清空失效链接
      result = await ShortLinkService.cleanupInactiveLinks();
    } else {
      return NextResponse.json({ error: '无效的清理类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条记录`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('清理链接失败:', error);
    return NextResponse.json(
      { error: '清理链接失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const isAuthenticated = validateSessionFromRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取全局统计信息作为清理统计的替代
    const stats = await DatabaseService.getGlobalStats();

    return NextResponse.json({
      success: true,
      stats: {
        totalLinks: stats.totalLinks,
        totalClicks: stats.totalClicks
      }
    });

  } catch (error) {
    console.error('获取清理统计失败:', error);
    return NextResponse.json(
      { error: '获取清理统计失败' },
      { status: 500 }
    );
  }
} 