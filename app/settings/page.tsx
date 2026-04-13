'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { db } from '../../lib/db';
import { useStore } from '../lib/store';
import { useLiveQuery } from 'dexie-react-hooks';

const SCHEMA_VERSION = 1;

export default function SettingsPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importModal, setImportModal] = useState<{ open: boolean, data: any | null, diff: any | null, error: string | null }>({ open: false, data: null, diff: null, error: null });
    const [confirmText, setConfirmText] = useState('');
    const addToast = useStore(state => state.addToast);
    
    // Live counts for diff logic
    const playerQuery = useLiveQuery(() => db.player?.toArray()) || [];
    const player = playerQuery[0] || null;
    const flightsCount = useLiveQuery(() => db.flights?.count()) || 0;
    
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

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `jetstream-save-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addToast({ message: "Save data exported successfully. Keep it secure." });
        } catch (e) {
            console.error("Export failed", e);
            addToast({ message: "Export failed. See console." });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = JSON.parse(text);
                
                if (parsed.schemaVersion !== SCHEMA_VERSION) {
                    setImportModal({ open: true, data: null, diff: null, error: `Schema Version Mismatch. Expected ${SCHEMA_VERSION}, got ${parsed.schemaVersion || 'Unknown'}. Import rejected to prevent data corruption.` });
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
                setImportModal({ open: true, data: null, diff: null, error: "Failed to parse JSON save file. Corrupted formatting." });
            }
        };
        reader.readAsText(file);
    };

    const commitImport = async () => {
        if (!importModal.data) return;
        if (confirmText !== 'IMPORT') return;

        try {
            // Force stealth backup to localstorage before atomic overwrite
            const backupStr = JSON.stringify({ schemaVersion: SCHEMA_VERSION, timestamp: Date.now(), data: await handleExport(true) });
            try { localStorage.setItem('jetstream_stealth_backup', backupStr); } catch (e) {} // ignore quota errors

            // Atomic Restitution
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

            addToast({ message: "Save data imported! State completely overwritten. Hard refresh recommended." });
            setImportModal({ open: false, data: null, diff: null, error: null });
            setConfirmText('');
            // Optional: window.location.reload();
        } catch (e) {
             console.error("Import failed:", e);
             addToast({ message: "Critical atomic failure during import." });
        }
    };

    return (
        <div className="w-full h-full p-8 pt-24 max-w-4xl mx-auto text-white overflow-y-auto">
            <h1 className="text-3xl font-black uppercase font-mono tracking-widest text-white mb-2">System Settings</h1>
            <p className="text-zinc-400 font-sans text-sm mb-12">Manage local session storage and telemetry preferences.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Export Card */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 group hover:border-[#00f0ff]/50 transition-colors">
                    <div className="w-12 h-12 bg-[#00f0ff]/10 rounded-lg flex items-center justify-center text-[#00f0ff] mb-4 group-hover:bg-[#00f0ff]/20 transition-colors">
                        <Download size={20} />
                    </div>
                    <h2 className="font-bold text-lg mb-2">Export Local Save</h2>
                    <p className="text-zinc-400 text-sm mb-6">Serialize your entire IndexedDB instance (wallet, fleet, social interactions, events) into a secure JSON flatfile. Recommended before purging cache.</p>
                    <button 
                        onClick={() => handleExport(false)}
                        className="bg-white text-black px-6 py-2 rounded font-bold uppercase font-mono text-xs tracking-widest hover:bg-zinc-200 transition-colors w-full"
                    >
                        Initiate Export
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 group hover:border-[#f5a7a7]/50 transition-colors">
                    <div className="w-12 h-12 bg-[#f5a7a7]/10 rounded-lg flex items-center justify-center text-[#f5a7a7] mb-4 group-hover:bg-[#f5a7a7]/20 transition-colors">
                        <Upload size={20} />
                    </div>
                    <h2 className="font-bold text-lg mb-2">Import Timeline</h2>
                    <p className="text-zinc-400 text-sm mb-6">Overwrite the local simulator state entirely. A stealth backup will be generated immediately before the irreversible atomic wipe triggers.</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-[#f5a7a7]/50 text-[#f5a7a7] hover:bg-[#f5a7a7]/10 px-6 py-2 rounded font-bold uppercase font-mono text-xs tracking-widest transition-colors w-full"
                    >
                        Select Source File
                    </button>
                </div>
            </div>

            {/* Import Validation Modal */}
            {importModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setImportModal({ open: false, data: null, diff: null, error: null })} />
                    
                    <div className="relative bg-[#0c0c0e] border border-white/10 p-8 pt-10 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <button onClick={() => setImportModal({ open: false, data: null, diff: null, error: null })} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                        
                        {importModal.error ? (
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-red-500 mb-2">REJECTED</h3>
                                <p className="text-zinc-300 text-sm bg-red-500/5 border border-red-500/20 p-4 rounded-lg w-full">{importModal.error}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="flex items-center gap-4 text-[#f5a7a7] mb-6 border-b border-white/5 pb-6">
                                    <ShieldCheck size={28} />
                                    <h3 className="text-xl font-bold font-mono tracking-widest uppercase m-0 leading-none">Atomic Rollback</h3>
                                </div>
                                
                                <p className="text-zinc-300 text-sm mb-6">You are about to irreversibly overwrite this environment. A snapshot comparison is below:</p>

                                <div className="grid grid-cols-3 gap-2 mb-8 bg-black/50 p-4 rounded-xl border border-white/5 text-sm font-mono items-center">
                                    <div className="text-zinc-500 text-[10px] uppercase tracking-widest text-center">Current</div>
                                    <div className="text-zinc-500 text-[10px] uppercase tracking-widest text-center"></div>
                                    <div className="text-zinc-500 text-[10px] uppercase tracking-widest text-center">Incoming</div>

                                    <div className="text-zinc-300 text-center">${(importModal.diff?.currentNetWorth || 0).toLocaleString()}</div>
                                    <div className="flex justify-center text-zinc-600"><ArrowRight size={14} /></div>
                                    <div className="text-[#00f0ff] text-center font-bold">${(importModal.diff?.incNetWorth || 0).toLocaleString()}</div>

                                    <div className="text-zinc-300 text-center">{importModal.diff?.currentFlights} flights</div>
                                    <div className="flex justify-center text-zinc-600"><ArrowRight size={14} /></div>
                                    <div className="text-[#00f0ff] text-center font-bold">{importModal.diff?.incFlights} flights</div>
                                </div>

                                <div className="mb-6">
                                   <p className="text-xs text-red-400 font-mono tracking-widest uppercase mb-2">Type "IMPORT" to confirm</p>
                                   <input 
                                     type="text"
                                     value={confirmText}
                                     onChange={(e) => setConfirmText(e.target.value)}
                                     placeholder="IMPORT"
                                     className="w-full bg-black border border-white/20 rounded p-3 text-white font-mono uppercase focus:outline-none focus:border-red-500 transition-colors"
                                   />
                                </div>

                                <button 
                                    onClick={commitImport}
                                    disabled={confirmText !== 'IMPORT'}
                                    className={`w-full py-3 rounded font-bold font-mono tracking-widest uppercase transition-all ${confirmText === 'IMPORT' ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-white/5 text-zinc-500 cursor-not-allowed'}`}
                                >
                                    Erase & Replace Cache
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Just wrapping X icon hack for JSX above
function X(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
