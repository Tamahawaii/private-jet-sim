'use client';

import React from 'react';
import { useStore } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { resolveLegacyLink } from '../../lib/routes';

export function ToastContainer() {
    const toasts = useStore(state => state.toasts);
    const removeToast = useStore(state => state.removeToast);
    const router = useRouter();

    return (
        <div className="fixed md:top-20 md:bottom-auto bottom-4 top-auto md:right-8 md:inset-x-auto inset-x-4 flex flex-col gap-3 z-[200] pointer-events-none items-end">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        className="bg-[#1a1a24] border border-[#f5a7a7]/30 shadow-2xl rounded-xl p-4 w-full md:w-80 pointer-events-auto flex items-start gap-4 cursor-pointer"
                        onClick={() => {
                            if (toast.link) router.push(resolveLegacyLink(toast.link));
                            removeToast(toast.id);
                        }}
                    >
                        <div className="mt-1 w-8 h-8 shrink-0 bg-[#f5a7a7]/20 rounded-full flex items-center justify-center text-[#f5a7a7]">
                            <MessageCircle size={16} />
                        </div>
                        <div className="flex-1 min-w-0 pointer-events-none">
                            <p className="text-sm text-white font-sans line-clamp-3 leading-snug">{toast.message}</p>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                removeToast(toast.id);
                            }}
                            className="text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
