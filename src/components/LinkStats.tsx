'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, MousePointer, TrendingUp, Clock } from 'lucide-react';

interface StatsData {
  total_clicks: number;
  today_clicks: number;
  week_clicks: number;
  month_clicks: number;
  click_history: Array<{ date: string; clicks: number }>;
}

interface LinkStatsProps {
  linkId: number;
}

export function LinkStats({ linkId }: LinkStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/links/${linkId}/stats`);
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [linkId]);

  if (loading) {
    return <div className="text-center py-8">加载统计数据中...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">无法加载统计数据</div>;
  }

  // 确保 click_history 存在且为数组
  const clickHistory = stats.click_history || [];
  
  const chartData = clickHistory.map(item => ({
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
              <MousePointer className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">总点击</p>
                <p className="text-2xl font-bold">{stats.total_clicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-500" />
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
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">本周点击</p>
                <p className="text-2xl font-bold">{stats.week_clicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">本月点击</p>
                <p className="text-2xl font-bold">{stats.month_clicks}</p>
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

      {/* 详细数据 */}
      <Card>
        <CardHeader>
          <CardTitle>详细数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {clickHistory.length === 0 ? (
              <p className="text-gray-500">暂无点击数据</p>
            ) : (
              clickHistory.slice(0, 10).map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-gray-600">
                    {new Date(item.date).toLocaleDateString('zh-CN')}
                  </span>
                  <Badge variant="secondary">
                    {item.clicks} 次点击
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