'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, Settings } from 'lucide-react';

export function AdminHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('登出成功');
        router.push('/login');
        router.refresh();
      } else {
        toast.error('登出失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Hikarinagi Short Link
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">管理员</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 