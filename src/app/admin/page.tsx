import { AdminHeader } from '@/components/AdminHeader';
import { LinkGenerator } from '@/components/LinkGenerator';
import { LinkList } from '@/components/LinkList';
import { GlobalStats } from '@/components/GlobalStats';
import { AccountSettings } from '@/components/AccountSettings';
import { DataManagement } from '@/components/DataManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="generate">生成链接</TabsTrigger>
            <TabsTrigger value="links">链接管理</TabsTrigger>
            <TabsTrigger value="stats">统计分析</TabsTrigger>
            <TabsTrigger value="data">数据管理</TabsTrigger>
            <TabsTrigger value="settings">账号设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <LinkGenerator />
            </div>
          </TabsContent>
          
          <TabsContent value="links" className="space-y-6">
            <LinkList />
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-6">
            <GlobalStats />
          </TabsContent>
          
          <TabsContent value="data" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <DataManagement />
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-md mx-auto">
              <AccountSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <Toaster />
    </div>
  );
} 