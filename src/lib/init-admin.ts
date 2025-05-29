import DatabaseService from './database-service';

export async function initializeAdmin() {
  try {    
    const existingAdmin = await DatabaseService.getAdminUser('admin');
    
    if (!existingAdmin) {
      await DatabaseService.initializeDefaultAdmin();
    } else {
    }
  } catch (error) {
    console.error('[Init] 初始化管理员账户失败:', error);
    throw error;
  }
} 