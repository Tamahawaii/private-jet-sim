'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, ArrowRight, ShieldCheck, Camera, Sparkles, RotateCcw, X, Trash2 } from 'lucide-react';
import { db } from '../../lib/db';
import { useStore } from '../lib/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageShell, PageHeader, Button } from '../components/ui';

const SCHEMA_VERSION = 1;

/** Downscale an uploaded photo to a square portrait and return a compact JPEG data URL. */
async function fileToPortrait(file: File, size = 512): Promise<string> {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Could not read that image'));
            i.src = url;
        });
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        return canvas.toDataURL('image/jpeg', 0.86);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export default function SettingsPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [importModal, setImportModal] = useState<{ open: boolean, data: any | null, diff: any | null, error: string | null }>({ open: false, data: null, diff: null, error: null });
    const [resetOpen, setResetOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const addToast = useStore(state => state.addToast);

    // Live counts for diff logic
    const playerQuery = useLiveQuery(() => db.player?.toArray()) || [];
    const player = playerQuery[0] || null;
    const flightsCount = useLiveQuery(() => db.flights?.count()) || 0;
    const isNative = typeof window !== 'undefined' && !!(window as unknown as { JetstreamNative?: unknown }).JetstreamNative;

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBusy('photo');
        try {
            const dataUrl = await fileToPortrait(file);
            await db.player.update('player', { imageUrl: dataUrl });
            addToast({ message: 'Portrait updated.' });
        } catch (err) {
            console.error(err);
            addToast({ message: 'That photo could not be used.' });
        } finally { setBusy(null); }
    };

    const generatePortrait = async () => {
        setBusy('generate');
        try {
            const { portraitDataUri } = await import('../../lib/avatars/generate');
            const seed = `${player?.displayName || 'player'}-${Math.random().toString(36).slice(2, 8)}`;
            await db.player.update('player', { imageUrl: portraitDataUri(seed, {}) });
        } catch (err) {
            console.error(err);
            addToast({ message: 'Portrait generation failed.' });
        } finally { setBusy(null); }
    };

    const handleExport = async (isBackup = false) => {
        try {
            const data: any = {};
            for (const table of db.tables) {
                data[table.name] = await table.toArray();
            }
            const blob = new Blob([JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });

            if (isBackup) {
                // Background backup, technically we just return the object or save it locally
                return data;
            }

            const fileName = `jetstream-save-${new Date().toISOString().split('T')[0]}.json`;
            const native = (window as unknown as { JetstreamNative?: { saveFile?: (n: string, b64: string, mime: string) => void } }).JetstreamNative;
            if (native?.saveFile) {
                // Android shell: hand the file to the native share sheet (Drive, Files, email…)
                const b64 = await new Promise<string>((resolve, reject) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
                    r.onerror = () => reject(r.error);
                    r.readAsDataURL(blob);
                });
                native.saveFile(fileName, b64, 'application/json');
                addToast({ message: "Choose where to keep your backup." });
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            addToast({ message: "Save exported. Keep it somewhere safe." });
        } catch (e) {
            console.error("Export failed", e);
            addToast({ message: "Export failed. See console." });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = JSON.parse(text);

                if (parsed.schemaVersion !== SCHEMA_VERSION) {
                    setImportModal({ open: true, data: null, diff: null, error: `This save was written by a different version (schema ${parsed.schemaVersion || 'unknown'}, expected ${SCHEMA_VERSION}). Import rejected to protect your current game.` });
                    return;
                }

                // Calculate diff summary
                const incPlayer = parsed.data.player?.[0] || { netWorth: 0, prestigeScore: 0 };
                const dt = {
                    currentNetWorth: player?.netWorth || 0,
                    incNetWorth: incPlayer.netWorth || 0,
                    currentFlights: flightsCount,
                    incFlights: parsed.data.flights?.length || 0,
                };

                setImportModal({ open: true, data: parsed.data, diff: dt, error: null });
            } catch (e) {
                setImportModal({ open: true, data: null, diff: null, error: "That file is not a readable Jetstream save." });
            }
        };
        reader.readAsText(file);
    };

    const commitImport = async () => {
        if (!importModal.data) return;
        if (confirmText !== 'IMPORT') return;

        try {
            // Keep a last-resort backup in localStorage before the atomic overwrite
            const backupStr = JSON.stringify({ schemaVersion: SCHEMA_VERSION, timestamp: Date.now(), data: await handleExport(true) });
            try { localStorage.setItem('jetstream_stealth_backup', backupStr); } catch (e) {} // ignore quota errors

            await db.transaction('rw', db.tables, async () => {
                for (const tableName of Object.keys(importModal.data)) {
                    const table = (db as any)[tableName];
                    if (table) {
                        await table.clear();
                        if (importModal.data[tableName].length > 0) {
                            await table.bulkPut(importModal.data[tableName]);
                        }
                    }
                }
            });

            addToast({ message: "Save imported. Reloading…" });
            setImportModal({ open: false, data: null, diff: null, error: null });
            setConfirmText('');
            setTimeout(() => window.location.reload(), 600);
        } catch (e) {
             console.error("Import failed:", e);
             addToast({ message: "Import failed part-way. Your previous save is untouched." });
        }
    };

    const resetWorld = async () => {
        if (confirmText !== 'RESET') return;
        setBusy('reset');
        try {
            try { localStorage.removeItem('jetstream-clock'); localStorage.removeItem('jetstream-ui'); } catch (e) {}
            await db.delete();
            window.location.href = '/';
        } catch (e) {
            console.error(e);
            addToast({ message: 'Reset failed. Close the app fully and try again.' });
            setBusy(null);
        }
    };

    const closeImport = () => { setImportModal({ open: false, data: null, diff: null, error: null }); setConfirmText(''); };

    return (
        <PageShell width="max-w-4xl">
            <PageHeader eyebrow="Settings" title="You, and your save." subtitle="Everything lives on this device. Back it up before you switch phones." back="/profile" />

            {/* Identity */}
            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 md:p-6 mb-4">
                <div className="eyebrow mb-4">Identity</div>
                <div className="flex flex-col sm:flex-row gap-5">
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-start gap-3">
                        <div className="w-28 h-28 rounded-2xl overflow-hidden border border-white/10 bg-[#0b1220] relative">
                            <img src={player?.imageUrl || '/avatars/player.svg'} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            {busy === 'photo' || busy === 'generate' ? <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[11px] font-mono text-white">working…</div> : null}
                        </div>
                        <div className="flex sm:flex-row flex-col gap-2">
                            <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhoto} />
                            <Button size="sm" variant="secondary" onClick={() => photoInputRef.current?.click()} disabled={!!busy}><Camera size={13} /> Photo</Button>
                            <Button size="sm" variant="ghost" onClick={generatePortrait} disabled={!!busy}><Sparkles size={13} /> Illustrate me</Button>
                        </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5 block">Display name</span>
                            <input type="text" value={player?.displayName || ''} onChange={(e) => db.player.update('player', { displayName: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-11 text-white text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors" />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5 block">Known as</span>
                            <input type="text" placeholder="Nickname the circle uses" value={player?.alternateName || ''} onChange={(e) => db.player.update('player', { alternateName: e.target.value || undefined })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-11 text-white text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors" />
                        </label>
                        <label className="block md:col-span-2">
                            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5 block">Portrait link (optional)</span>
                            <input type="text" placeholder="https://… — or use Photo above" value={player?.imageUrl?.startsWith('data:') ? '' : (player?.imageUrl || '')} onChange={(e) => db.player.update('player', { imageUrl: e.target.value || null })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-11 text-white text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors" />
                            {player?.imageUrl ? <button onClick={() => db.player.update('player', { imageUrl: null })} className="mt-2 text-[12px] text-zinc-500 hover:text-white flex items-center gap-1"><Trash2 size={12} /> Remove portrait</button> : null}
                        </label>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 md:p-6">
                    <div className="w-11 h-11 rounded-xl bg-[var(--accent)]/12 text-[var(--accent)] flex items-center justify-center mb-4"><Download size={18} /></div>
                    <h2 className="font-serif text-[22px] text-white mb-1.5">Back up this game</h2>
                    <p className="text-[13px] text-zinc-400 mb-5">Your wallet, fleet, homes, yachts, circle and every flight — written to one file{isNative ? ' you can save to Drive, Files or email' : ''}.</p>
                    <Button variant="secondary" className="w-full" onClick={() => handleExport(false)}>Export save</Button>
                </section>

                <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 md:p-6">
                    <div className="w-11 h-11 rounded-xl bg-[var(--rose)]/12 text-[var(--rose)] flex items-center justify-center mb-4"><Upload size={18} /></div>
                    <h2 className="font-serif text-[22px] text-white mb-1.5">Restore a save</h2>
                    <p className="text-[13px] text-zinc-400 mb-5">Replaces everything on this device with the file you pick. You'll see a comparison before anything changes.</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json,application/json" onChange={handleFileChange} />
                    <Button variant="secondary" className="w-full" onClick={() => fileInputRef.current?.click()}>Choose save file</Button>
                </section>

                <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 md:p-6 md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[var(--magenta)]/12 text-[var(--magenta)] flex items-center justify-center shrink-0"><RotateCcw size={18} /></div>
                    <div className="flex-1">
                        <h2 className="font-serif text-[22px] text-white mb-1">Start over</h2>
                        <p className="text-[13px] text-zinc-400">Wipes this device's game and begins a fresh world at Honolulu. Export first if you might want it back.</p>
                    </div>
                    <Button variant="danger" onClick={() => { setConfirmText(''); setResetOpen(true); }}>Reset world</Button>
                </section>
            </div>

            <p className="text-[11px] font-mono text-zinc-600 mt-6">Jetstream {isNative ? 'Android' : 'web'} · local-first · nothing leaves your device unless you export it.</p>

            {/* Import Validation Modal */}
            {importModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeImport} />
                    <div className="relative bg-[#0b1220] border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl">
                        <button onClick={closeImport} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                        {importModal.error ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-14 h-14 bg-[var(--magenta)]/12 text-[var(--magenta)] rounded-full flex items-center justify-center mb-5"><AlertTriangle size={26} /></div>
                                <h3 className="font-serif text-[24px] text-white mb-2">Can't use that file</h3>
                                <p className="text-zinc-300 text-[13px] bg-white/[0.04] border border-white/8 p-4 rounded-xl w-full">{importModal.error}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3 text-[var(--rose)] mb-5 border-b border-white/8 pb-5">
                                    <ShieldCheck size={24} />
                                    <h3 className="font-serif text-[24px] text-white m-0 leading-none">Replace this game?</h3>
                                </div>
                                <p className="text-zinc-300 text-[13px] mb-5">The current save is kept as a hidden backup, but the app will reload into the file you chose.</p>
                                <div className="grid grid-cols-3 gap-2 mb-6 bg-black/40 p-4 rounded-2xl border border-white/8 text-[13px] font-mono items-center">
                                    <div className="text-zinc-500 text-[10px] uppercase tracking-widest text-center">Now</div>
                                    <div />
                                    <div className="text-zinc-500 text-[10px] uppercase tracking-widest text-center">Incoming</div>
                                    <div className="text-zinc-300 text-center">${(importModal.diff?.currentNetWorth || 0).toLocaleString()}</div>
                                    <div className="flex justify-center text-zinc-600"><ArrowRight size={14} /></div>
                                    <div className="text-[var(--accent)] text-center font-bold">${(importModal.diff?.incNetWorth || 0).toLocaleString()}</div>
                                    <div className="text-zinc-300 text-center">{importModal.diff?.currentFlights} flights</div>
                                    <div className="flex justify-center text-zinc-600"><ArrowRight size={14} /></div>
                                    <div className="text-[var(--accent)] text-center font-bold">{importModal.diff?.incFlights} flights</div>
                                </div>
                                <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Type IMPORT to confirm</p>
                                <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())} placeholder="IMPORT" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-11 text-white font-mono uppercase focus:outline-none focus:border-[var(--rose)] transition-colors mb-4" />
                                <Button variant="danger" size="lg" className="w-full" disabled={confirmText !== 'IMPORT'} onClick={commitImport}>Replace and reload</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {resetOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setResetOpen(false)} />
                    <div className="relative bg-[#0b1220] border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl">
                        <button onClick={() => setResetOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                        <h3 className="font-serif text-[24px] text-white mb-2">Start a new world?</h3>
                        <p className="text-zinc-300 text-[13px] mb-5">Your fleet, homes, yachts, passport and every relationship on this device will be gone. This cannot be undone.</p>
                        <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Type RESET to confirm</p>
                        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())} placeholder="RESET" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-11 text-white font-mono uppercase focus:outline-none focus:border-[var(--magenta)] transition-colors mb-4" />
                        <Button variant="danger" size="lg" className="w-full" disabled={confirmText !== 'RESET' || busy === 'reset'} onClick={resetWorld}>{busy === 'reset' ? 'Wiping…' : 'Erase and start over'}</Button>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
