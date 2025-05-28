'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, MoreHorizontal, BarChart3, Trash2, ExternalLink, Eye, Trash, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LinkStats } from './LinkStats';

interface Link {
  id: number;
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
  clicks: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  is_active: boolean;
}

interface CleanupStats {
  inactiveCount: number;
  expiredCount: number;
  totalCleanupCount: number;
}

export function LinkList() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/links');
      const result = await response.json();
      
      if (result.success) {
        setLinks(result.data.links);
      } else {
        toast.error('获取链接列表失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const fetchCleanupStats = async () => {
    try {
      const response = await fetch('/api/admin/links/cleanup');
      const result = await response.json();
      
      if (result.success) {
        setCleanupStats(result.stats);
      }
    } catch {
      console.error('获取清理统计失败');
    }
  };

  useEffect(() => {
    fetchLinks();
    fetchCleanupStats();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const deleteLink = async (id: number) => {
    try {
      const response = await fetch(`/api/links/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('链接已删除');
        fetchLinks(); // 重新获取列表
        fetchCleanupStats(); // 更新清理统计
      } else {
        toast.error('删除失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  const cleanupLinks = async (type: 'inactive' | 'expired' | 'all') => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/admin/links/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setShowCleanupDialog(false);
        fetchLinks(); // 重新获取列表
        fetchCleanupStats(); // 更新清理统计
      } else {
        toast.error(result.error || '清理失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setCleanupLoading(false);
    }
  };

  const openStats = (link: Link) => {
    setSelectedLink(link);
    setShowStats(true);
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              链接管理
            </CardTitle>
            {cleanupStats && cleanupStats.totalCleanupCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCleanupDialog(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash className="h-4 w-4 mr-2" />
                清空失效链接 ({cleanupStats.totalCleanupCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无链接，请先生成一个短链接
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>短码</TableHead>
                    <TableHead>原始链接</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>点击次数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          <span>{link.short_code}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(`${window.location.origin}/${link.short_code}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          <a 
                            href={link.original_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {link.original_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {link.title || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {link.clicks}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!link.is_active ? (
                          <Badge variant="destructive">已删除</Badge>
                        ) : isExpired(link.expires_at) ? (
                          <Badge variant="destructive">已过期</Badge>
                        ) : (
                          <Badge variant="default">正常</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(link.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openStats(link)}>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              查看统计
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => copyToClipboard(`${window.location.origin}/${link.short_code}`)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              复制链接
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteLink(link.id)}
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计对话框 */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>链接统计 - {selectedLink?.short_code}</DialogTitle>
          </DialogHeader>
          {selectedLink && (
            <LinkStats linkId={selectedLink.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* 清理确认对话框 */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              清空失效链接
            </DialogTitle>
            <DialogDescription>
              此操作将从数据库中永久删除失效的链接记录，无法恢复。
            </DialogDescription>
          </DialogHeader>
          
          {cleanupStats && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>已删除的链接：</span>
                  <span className="font-medium">{cleanupStats.inactiveCount} 条</span>
                </div>
                <div className="flex justify-between">
                  <span>已过期的链接：</span>
                  <span className="font-medium">{cleanupStats.expiredCount} 条</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">总计：</span>
                  <span className="font-bold text-red-600">{cleanupStats.totalCleanupCount} 条</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => cleanupLinks('inactive')}
                  disabled={cleanupLoading || cleanupStats.inactiveCount === 0}
                  className="flex-1"
                >
                  {cleanupLoading ? '处理中...' : `清空已删除 (${cleanupStats.inactiveCount})`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cleanupLinks('expired')}
                  disabled={cleanupLoading || cleanupStats.expiredCount === 0}
                  className="flex-1"
                >
                  {cleanupLoading ? '处理中...' : `清空已过期 (${cleanupStats.expiredCount})`}
                </Button>
              </div>
              
              <Button
                variant="destructive"
                onClick={() => cleanupLinks('all')}
                disabled={cleanupLoading || cleanupStats.totalCleanupCount === 0}
                className="w-full"
              >
                {cleanupLoading ? '处理中...' : `清空全部 (${cleanupStats.totalCleanupCount})`}
              </Button>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCleanupDialog(false)}
              disabled={cleanupLoading}
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 