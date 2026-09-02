'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/** Full-screen page frame that respects the top bar and the phone tab bar. */
export function PageShell({ children, className = '', width = 'max-w-5xl' }: { children: React.ReactNode; className?: string; width?: string }) {
  return (
    <div className={`absolute inset-0 z-40 bg-[#070b12] text-white overflow-y-auto no-scrollbar pb-tabs ${className}`} style={{ paddingTop: 'calc(var(--nav-h) + var(--safe-top))' }}>
      <div className={`${width} mx-auto px-4 md:px-8 pb-16`}>{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, back, actions }: { eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; back?: string | true; actions?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex items-end justify-between gap-4 pt-4 pb-5">
      <div className="min-w-0">
        {back && (
          <button onClick={() => (back === true ? router.back() : router.push(back))} className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="font-serif text-[30px] md:text-[38px] leading-[1.05] text-white mt-1 text-balance">{title}</h1>
        {subtitle && <div className="text-[13px] text-zinc-400 mt-2">{subtitle}</div>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/8 w-max max-w-full overflow-x-auto no-scrollbar mb-5">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} className={`h-9 ${tabs.length >= 4 ? 'px-3' : 'px-4'} rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors ${value === t.id ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
          {t.label}{typeof t.count === 'number' && t.count > 0 && <span className={`ml-1.5 text-[10.5px] font-mono ${value === t.id ? 'text-black/60' : 'text-zinc-600'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Button({ children, onClick, href, variant = 'primary', size = 'md', disabled, className = '', type = 'button' }: { children: React.ReactNode; onClick?: () => void; href?: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'; size?: 'sm' | 'md' | 'lg'; disabled?: boolean; className?: string; type?: 'button' | 'submit' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none';
  const sizes = { sm: 'h-9 px-3.5 text-[12px]', md: 'h-11 px-5 text-[13px]', lg: 'h-12 px-6 text-[14px]' }[size];
  const variants = {
    primary: 'bg-[var(--accent)] text-black hover:bg-white',
    secondary: 'bg-white/6 border border-white/10 text-white hover:bg-white/12',
    ghost: 'text-zinc-300 hover:text-white hover:bg-white/6',
    danger: 'bg-[var(--magenta)]/15 border border-[var(--magenta)]/30 text-[var(--magenta)] hover:bg-[var(--magenta)]/25',
    gold: 'bg-[var(--color-gold)] text-black hover:bg-white',
  }[variant];
  const cls = `${base} ${sizes} ${variants} ${className}`;
  if (href) return <Link href={href} className={cls} aria-disabled={disabled}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function Chip({ children, tone = 'neutral', className = '' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'gold' | 'rose' | 'mint' | 'amber' | 'magenta'; className?: string }) {
  const tones = {
    neutral: 'bg-white/8 text-zinc-300 border-white/10',
    accent: 'bg-[var(--accent)]/12 text-[var(--accent)] border-[var(--accent)]/30',
    gold: 'bg-[var(--color-gold)]/12 text-[var(--color-gold)] border-[var(--color-gold)]/30',
    rose: 'bg-[var(--rose)]/12 text-[var(--rose)] border-[var(--rose)]/30',
    mint: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-400/12 text-amber-300 border-amber-400/30',
    magenta: 'bg-[var(--magenta)]/12 text-[var(--magenta)] border-[var(--magenta)]/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-md border text-[10.5px] font-mono font-semibold tracking-wider uppercase ${tones} ${className}`}>{children}</span>;
}

export function Stat({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/[0.035] border border-white/8 rounded-2xl px-3.5 py-3 min-w-0">
      <div className="eyebrow flex items-center gap-1.5 truncate">{icon}{label}</div>
      <div className="font-mono text-[19px] font-semibold text-white mt-1 leading-none truncate">{value}</div>
      {sub && <div className="text-[10.5px] text-zinc-500 mt-1 font-mono truncate">{sub}</div>}
    </div>
  );
}

/** Artwork with a graceful gradient fallback. */
export function Artwork({ src, alt = '', className = '', children, fallback }: { src?: string | null; alt?: string; className?: string; children?: React.ReactNode; fallback?: string }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#182a44] via-[#0e1a2c] to-[#070b12] ${className}`}>
      {src ? <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" draggable={false} /> : (fallback && <div className="absolute inset-0 flex items-center justify-center font-serif text-4xl text-white/20">{fallback}</div>)}
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/12 rounded-3xl px-6 py-12 text-center">
      {icon && <div className="mx-auto w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 mb-3">{icon}</div>}
      <div className="font-serif text-[20px] text-white">{title}</div>
      {body && <div className="text-[13px] text-zinc-500 mt-1 max-w-sm mx-auto">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function money(n: number, compact = true): string {
  if (!compact) return '$' + Math.round(n).toLocaleString();
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}
