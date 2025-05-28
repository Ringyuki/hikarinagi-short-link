import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <AlertTriangle className="h-6 w-6 text-gray-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            链接不存在
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            您访问的短链接不存在或已被删除。
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 