import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  console.log('[API] /api/auth/login - 开始处理登录请求');
  
  try {
    console.log('[API] 解析请求体...');
    const { username, password } = await request.json();
    console.log('[API] 用户名:', username, '密码长度:', password?.length || 0);

    if (!username || !password) {
      console.log('[API] 用户名或密码为空，返回 400');
      return NextResponse.json({
        success: false,
        error: '用户名和密码不能为空'
      }, { status: 400 });
    }

    console.log('[API] 开始验证凭据...');
    const isValidCredentials = await validateCredentials(username, password);
    console.log('[API] 凭据验证结果:', isValidCredentials);
    
    if (isValidCredentials) {
      console.log('[API] 凭据有效，创建会话...');
      await createSession(username);
      console.log('[API] 会话创建成功，登录完成');
      
      return NextResponse.json({
        success: true,
        message: '登录成功'
      });
    } else {
      console.log('[API] 凭据无效，返回 401');
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('[API] 登录过程中发生错误:', error);
    console.error('[API] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 });
  }
} 