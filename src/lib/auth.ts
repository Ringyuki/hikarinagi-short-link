import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import DatabaseService from './database-service';

// 会话密钥
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 验证登录凭据
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  console.log('[Auth] validateCredentials - 开始验证凭据, 用户名:', username);
  
  try {
    const user = await DatabaseService.validateAdmin(username, password);
    console.log('[Auth] validateCredentials - 数据库验证结果:', !!user);
    return !!user;
  } catch (error) {
    console.error('[Auth] validateCredentials - 验证过程中发生错误:', error);
    return false;
  }
}

// 获取管理员用户
export async function getAdminUser(username: string) {
  console.log('[Auth] getAdminUser - 获取管理员用户:', username);
  
  try {
    const user = await DatabaseService.getAdminUser(username);
    console.log('[Auth] getAdminUser - 用户查询结果:', user ? '找到用户' : '用户不存在');
    return user;
  } catch (error) {
    console.error('[Auth] getAdminUser - 查询用户时发生错误:', error);
    return null;
  }
}

// 更新管理员密码
export async function updateAdminPassword(username: string, newPassword: string): Promise<boolean> {
  console.log('[Auth] updateAdminPassword - 更新密码, 用户名:', username);
  
  try {
    await DatabaseService.changeAdminPassword(username, newPassword);
    console.log('[Auth] updateAdminPassword - 密码更新成功');
    return true;
  } catch (error) {
    console.error('[Auth] updateAdminPassword - 密码更新失败:', error);
    return false;
  }
}

// 创建会话
export async function createSession(username: string) {
  console.log('[Auth] createSession - 创建会话, 用户名:', username);
  
  try {
    const cookieStore = await cookies();
    const sessionData = {
      username,
      loginTime: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION
    };
    
    console.log('[Auth] createSession - 会话数据:', sessionData);
    
    cookieStore.set(SESSION_KEY, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000
    });
    
    console.log('[Auth] createSession - 会话创建完成');
  } catch (error) {
    console.error('[Auth] createSession - 创建会话时发生错误:', error);
    throw error;
  }
}

// 验证会话
export async function validateSession(): Promise<boolean> {  
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_KEY);
    
    if (!sessionCookie) {
      console.log('[Auth] validateSession - 未找到会话 cookie');
      return false;
    }
    
    const sessionData = JSON.parse(sessionCookie.value);
    
    // 检查是否过期
    if (Date.now() > sessionData.expiresAt) {
      console.log('[Auth] validateSession - 会话已过期');
      await destroySession();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Auth] validateSession - 验证会话时发生错误:', error);
    return false;
  }
}

// 销毁会话
export async function destroySession() {  
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_KEY);
    console.log('[Auth] destroySession - 会话销毁完成');
  } catch (error) {
    console.error('[Auth] destroySession - 销毁会话时发生错误:', error);
  }
}

// 从请求中验证会话
export function validateSessionFromRequest(request: NextRequest): boolean {  
  try {
    const sessionCookie = request.cookies.get(SESSION_KEY);
    
    if (!sessionCookie) {
      console.log('[Auth] validateSessionFromRequest - 请求中未找到会话 cookie');
      return false;
    }
    
    const sessionData = JSON.parse(sessionCookie.value);    
    // 检查是否过期
    if (Date.now() > sessionData.expiresAt) {
      console.log('[Auth] validateSessionFromRequest - 会话已过期');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Auth] validateSessionFromRequest - 验证会话时发生错误:', error);
    return false;
  }
} 