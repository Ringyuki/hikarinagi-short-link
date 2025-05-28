'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, MousePointer, TrendingUp, Link } from 'lucide-react';

interface GlobalStatsData {
  total_links: number;
  total_clicks: number;
  today_clicks: number;
  week_clicks: number;
  top_links: Array<{
    short_code: string;
    original_url: string;
    clicks: number;
    title?: string;
  }>;
  daily_clicks: Array<{
    date: string;
    clicks: number;
  }>;
}

export function GlobalStats() {
  const [stats, setStats] = useState<GlobalStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats/global');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('获取全局统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-8">加载统计数据中...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">无法加载统计数据</div>;
  }

  const chartData = stats.daily_clicks.map(item => ({
    date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    clicks: item.clicks
  })).reverse();

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Link className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">总链接数</p>
                <p className="text-2xl font-bold">{stats.total_links}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">总点击数</p>
                <p className="text-2xl font-bold">{stats.total_clicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">今日点击</p>
                <p className="text-2xl font-bold">{stats.today_clicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">本周点击</p>
                <p className="text-2xl font-bold">{stats.week_clicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 点击趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>点击趋势（最近30天）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clicks" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 热门链接 */}
      <Card>
        <CardHeader>
          <CardTitle>最多点击的链接</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.top_links.length === 0 ? (
              <p className="text-gray-500">暂无链接数据</p>
            ) : (
              stats.top_links.map((link, index) => (
                <div key={link.short_code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">/{link.short_code}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {link.title || link.original_url}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {link.clicks} 次
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 