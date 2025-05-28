import DatabaseService from './database-service';

export async function initializeAdmin() {
  try {
    console.log('[Init] 开始初始化管理员账户...');
    
    const existingAdmin = await DatabaseService.getAdminUser('admin');
    
    if (!existingAdmin) {
      console.log('[Init] 未找到管理员账户，创建默认管理员...');
      await DatabaseService.initializeDefaultAdmin();
      console.log('[Init] 默认管理员账户创建成功');
    } else {
      console.log('[Init] 管理员账户已存在');
    }
  } catch (error) {
    console.error('[Init] 初始化管理员账户失败:', error);
    throw error;
  }
} 