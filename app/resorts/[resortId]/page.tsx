'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routes } from '../../../lib/routes';

/** Legacy URL kept for bookmarks; the real screen lives at a static route. Excluded from the Android export. */
export default function LegacyRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    const id = typeof params?.resortId === 'string' ? params.resortId : '';
    router.replace(id ? routes.resort(id) : '/');
  }, [params, router]);
  return null;
}
