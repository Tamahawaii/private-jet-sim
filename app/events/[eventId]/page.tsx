'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routes } from '../../../lib/routes';

/** Legacy URL kept for bookmarks; the real screen lives at a static route. Excluded from the Android export. */
export default function LegacyRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    const id = typeof params?.eventId === 'string' ? params.eventId : '';
    router.replace(id ? routes.event(id) : '/');
  }, [params, router]);
  return null;
}
