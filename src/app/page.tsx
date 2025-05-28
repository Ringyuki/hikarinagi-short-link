import { redirect } from 'next/navigation';

export default function HomePage() {
  // 重定向到自定义404页面
  redirect('/not-found');
} 