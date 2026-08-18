'use client';
import { useEffect, useState } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

export default function AuthImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    const token = localStorage.getItem('access_token');
    const fullUrl = src.startsWith('http') ? src : `${API_URL}${src}`;
    fetch(fullUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => blob && setObjectUrl(URL.createObjectURL(blob)))
      .catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);

  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt || ''} className={className} />;
}
