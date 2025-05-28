'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Link, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface GeneratedLink {
  id: number;
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
}

export function LinkGenerator() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const generateLink = async () => {
    if (!originalUrl) {
      toast.error('请输入原始链接');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_url: originalUrl,
          title: title || undefined,
          description: description || undefined,
          custom_code: customCode || undefined,
          expires_at: expiresAt || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedLink(result.data);
        const shortUrl = `${window.location.origin}/${result.data.short_code}`;
        
        // 生成二维码
        const qrCode = await QRCode.toDataURL(shortUrl);
        setQrCodeUrl(qrCode);
        
        toast.success('短链接生成成功！');
        
        // 清空表单
        setOriginalUrl('');
        setTitle('');
        setDescription('');
        setCustomCode('');
        setExpiresAt('');
      } else {
        toast.error(result.error || '生成失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `qr-${generatedLink?.short_code}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            生成短链接
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="original-url">原始链接 *</Label>
            <Input
              id="original-url"
              type="url"
              placeholder="https://example.com"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题（可选）</Label>
              <Input
                id="title"
                placeholder="链接标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-code">自定义短码（可选）</Label>
              <Input
                id="custom-code"
                placeholder="my-link"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                placeholder="链接描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-at">过期时间（可选）</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={generateLink} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '生成中...' : '生成短链接'}
          </Button>
        </CardContent>
      </Card>

      {generatedLink && (
        <Card>
          <CardHeader>
            <CardTitle>生成成功</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link">短链接</TabsTrigger>
                <TabsTrigger value="qr">二维码</TabsTrigger>
              </TabsList>
              
              <TabsContent value="link" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/${generatedLink.short_code}`}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/${generatedLink.short_code}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><strong>原始链接:</strong> {generatedLink.original_url}</p>
                  {generatedLink.title && <p><strong>标题:</strong> {generatedLink.title}</p>}
                  {generatedLink.description && <p><strong>描述:</strong> {generatedLink.description}</p>}
                </div>
              </TabsContent>
              
              <TabsContent value="qr" className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="border rounded-lg"
                    />
                  )}
                  <Button onClick={downloadQRCode}>
                    <QrCode className="h-4 w-4 mr-2" />
                    下载二维码
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 