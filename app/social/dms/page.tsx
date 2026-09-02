'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Chats now live on the social hub's Chats tab. */
export default function DMInbox() {
  const router = useRouter();
  useEffect(() => { router.replace('/social?tab=chats'); }, [router]);
  return null;
}
