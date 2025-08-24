import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import DatabaseService from './database-service';
import { signSessionToken, verifySessionToken, SESSION_COOKIE_NAME, DEFAULT_SESSION_DURATION_SECONDS } from './jwt';

// 保留旧常量名以兼容原有调用
const SESSION_KEY = SESSION_COOKIE_NAME;
const SESSION_DURATION = DEFAULT_SESSION_DURATION_SECONDS * 1000; // 24小时（毫秒）

// 验证登录凭据
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  try {
    const user = await DatabaseService.validateAdmin(username, password);
    return !!user;
  } catch (error) {
    console.error('[Auth] validateCredentials - 验证过程中发生错误:', error);
    return false;
  }
}

// 获取管理员用户
export async function getAdminUser(username: string) {  
  try {
    const user = await DatabaseService.getAdminUser(username);
    return user;
  } catch (error) {
    console.error('[Auth] getAdminUser - 查询用户时发生错误:', error);
    return null;
  }
}

// 更新管理员密码
export async function updateAdminPassword(username: string, newPassword: string): Promise<boolean> {  
  try {
    await DatabaseService.changeAdminPassword(username, newPassword);
    return true;
  } catch (error) {
    console.error('[Auth] updateAdminPassword - 密码更新失败:', error);
    return false;
  }
}

// 创建会话
export async function createSession(username: string) {  
  try {
    const cookieStore = await cookies();
    const token = await signSessionToken(username);
    cookieStore.set(SESSION_KEY, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });
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
    if (!sessionCookie) return false;
    const payload = await verifySessionToken(sessionCookie.value);
    if (!payload) {
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
  } catch (error) {
    console.error('[Auth] destroySession - 销毁会话时发生错误:', error);
  }
}

// 从请求中验证会话
export function validateSessionFromRequest(request: NextRequest): boolean {  
  try {
    const sessionCookie = request.cookies.get(SESSION_KEY);
    if (!sessionCookie) return false;
    // 注意：middleware/route handlers 中不能 await 顶层同步函数；
    // 这里为兼容原有同步签名，仅做同步存在性校验，实际校验放到中间件与服务端函数。
    // 大多数调用场景在 Route Handler 中可以使用异步版本，保持向后兼容暂不改签名。
    return Boolean(sessionCookie.value);
  } catch (error) {
    console.error('[Auth] validateSessionFromRequest - 验证会话时发生错误:', error);
    return false;
  }
}  

// 异步版本：基于 JWT 完整校验
export async function validateSessionFromRequestAsync(request: NextRequest): Promise<boolean> {
  try {
    const sessionCookie = request.cookies.get(SESSION_KEY)
    if (!sessionCookie) return false
    const payload = await verifySessionToken(sessionCookie.value)
    return Boolean(payload)
  } catch (error) {
    console.error('[Auth] validateSessionFromRequestAsync - 验证会话时发生错误:', error)
    return false
  }
}