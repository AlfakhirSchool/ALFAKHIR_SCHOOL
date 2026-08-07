'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function RootPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    router.replace(isAuthenticated ? '/' : '/login');
  }, [isAuthenticated, router]);
  return null;
}
