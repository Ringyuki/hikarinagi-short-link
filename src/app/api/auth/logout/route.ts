import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST() {
  try {
    await destroySession();
    
    return NextResponse.json({
      success: true,
      message: '登出成功'
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: '登出失败'
    }, { status: 500 });
  }
} 