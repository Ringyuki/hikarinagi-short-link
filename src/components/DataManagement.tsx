'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Download, 
  Upload, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface DatabaseStats {
  totalLinks: number;
  activeLinks: number;
  inactiveLinks: number;
  totalClickRecords: number;
  totalClicks: number;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    links: number;
    clickAnalytics: number;
  };
  errors: string[];
}

interface ExportData {
  version: string;
  exportTime: string;
  data: {
    links: unknown[];
    clickAnalytics: unknown[];
  };
  stats: {
    totalLinks: number;
    totalClicks: number;
  };
}

export function DataManagement() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importOptions, setImportOptions] = useState({
    overwriteExisting: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/data/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.stats);
      } else {
        toast.error('获取数据库统计失败');
      }
    } catch {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/admin/data/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 从响应头获取文件名，或使用默认文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
          `shortlink-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('数据导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch {
      toast.error('导出过程中发生错误');
    } finally {
      setExportLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json') {
        toast.error('请选择JSON格式的文件');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as ExportData;
          await handleImport(data);
        } catch {
          toast.error('文件格式错误，请选择有效的备份文件');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async (data: ExportData) => {
    setImportLoading(true);
    try {
      const response = await fetch('/api/admin/data/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data, options: importOptions }),
      });
      
      const result = await response.json();
      setImportResult(result);
      
      if (result.success) {
        toast.success(result.message);
        fetchStats(); // 刷新统计信息
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('导入过程中发生错误');
    } finally {
      setImportLoading(false);
      setShowImportDialog(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openImportDialog = () => {
    setShowImportDialog(true);
    setImportResult(null);
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
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            数据管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 数据库统计 */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">总链接数</div>
                <div className="text-2xl font-bold text-blue-900">{stats.totalLinks}</div>
                <div className="text-xs text-blue-500">
                  活跃: {stats.activeLinks} | 失效: {stats.inactiveLinks}
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">总点击数</div>
                <div className="text-2xl font-bold text-green-900">{stats.totalClicks}</div>
                <div className="text-xs text-green-500">
                  记录数: {stats.totalClickRecords}
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">数据库大小</div>
                <div className="text-2xl font-bold text-purple-900">
                  {(stats.totalLinks + stats.totalClickRecords).toLocaleString()}
                </div>
                <div className="text-xs text-purple-500">总记录数</div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLoading ? '导出中...' : '导出数据'}
            </Button>
            
            <Button
              variant="outline"
              onClick={openImportDialog}
              disabled={importLoading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importLoading ? '导入中...' : '导入数据'}
            </Button>
          </div>

          {/* 说明信息 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">注意：</p>
                <ul className="space-y-1 text-xs">
                  <li>• 导出功能会备份所有链接和点击记录</li>
                  <li>• 导入时可选择是否覆盖现有数据</li>
                  <li>• 建议定期备份数据，特别是在重要操作前</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导入对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              导入数据
            </DialogTitle>
            <DialogDescription>
              选择之前导出的JSON备份文件进行数据导入
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 导入选项 */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={importOptions.overwriteExisting}
                  onChange={(e) => setImportOptions(prev => ({
                    ...prev,
                    overwriteExisting: e.target.checked
                  }))}
                  className="rounded"
                />
                <label htmlFor="overwrite" className="text-sm">
                  覆盖现有数据（清空当前数据后导入）
                </label>
              </div>
            </div>

            {/* 警告信息 */}
            {importOptions.overwriteExisting && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">警告</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  启用&ldquo;覆盖现有数据&rdquo;将删除当前所有链接和点击记录，此操作不可恢复！
                </p>
              </div>
            )}

            {/* 文件选择 */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* 导入结果 */}
            {importResult && (
              <div className={`p-3 rounded-lg border ${
                importResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    importResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {importResult.success ? '导入成功' : '导入失败'}
                  </span>
                </div>
                
                <p className={`text-sm ${
                  importResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {importResult.message}
                </p>
                
                {importResult.success && (
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">
                      链接: {importResult.imported.links}
                    </Badge>
                    <Badge variant="secondary">
                      点击: {importResult.imported.clickAnalytics}
                    </Badge>
                  </div>
                )}
                
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">错误详情:</p>
                    <div className="max-h-20 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600">
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={importLoading}
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 