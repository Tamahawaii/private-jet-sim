'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routes } from '../../../../lib/routes';

/** Legacy URL kept for bookmarks; the real screen lives at a static route. Excluded from the Android export. */
export default function LegacyRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    const id = typeof params?.personaId === 'string' ? params.personaId : '';
    router.replace(id ? routes.dm(id) : '/');
  }, [params, router]);
  return null;
}
