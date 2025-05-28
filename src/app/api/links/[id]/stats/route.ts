import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = ShortLinkService.getLinkStats(parseInt(id));

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败'
    }, { status: 500 });
  }
} 