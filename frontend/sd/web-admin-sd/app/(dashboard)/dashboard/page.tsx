'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// web-admin-sd: langsung ke dashboard SD
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/sd'); }, [router]);
  return null;
}
