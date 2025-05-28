import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';
import { validateSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const isAuthenticated = validateSessionFromRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取数据库统计信息
    const stats = await DataService.getDatabaseStats();

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('获取数据库统计失败:', error);
    return NextResponse.json(
      { error: '获取数据库统计失败' },
      { status: 500 }
    );
  }
} 