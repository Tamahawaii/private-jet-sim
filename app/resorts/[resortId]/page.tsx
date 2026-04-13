'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import Link from 'next/link';
import { ArrowLeft, MapPin, Navigation2, Check, Star, Waves, GlassWater, PlaneTakeoff, Clock, Plus, Minus, X, CheckCircle2 } from 'lucide-react';
import { PersonaAvatar } from '../../components/PersonaAvatar';
import { SignatureExperience, Persona, Aircraft } from '../../../types';
import { useStore } from '../../lib/store';
import { bookResortAndFly, extendStay, purchaseExperience } from '../../lib/resorts';
import { calculateDistanceNM } from '../../lib/math';
import airportsData from '../../../data/airports.json';

export default function ResortDetailPage() {
    const params = useParams();
    const router = useRouter();
    const resortId = typeof params?.resortId === 'string' ? params.resortId : '';
    const simNow = useStore((state: any) => state.now);
    
    const resort = useLiveQuery(() => db.resorts.get(resortId), [resortId]);
    const preferences = useLiveQuery(() => 
        db.personas.where('id').anyOf(resort?.preferredBy || []).toArray()
    , [resort]) || [];

    const player = useLiveQuery(() => db.player.get('player'));
    const fleet = useLiveQuery(() => db.aircraft.toArray()) || [];
    
    const activeBooking = useLiveQuery(async () => {
         return await db.resortBookings.toCollection().filter(b => {
             if (!b.checkOutAt) return false;
             const inMs = new Date(b.checkInAt).getTime();
             const outMs = new Date(b.checkOutAt).getTime();
             return simNow >= inMs && simNow < outMs;
         }).first();
    }, [simNow]);

    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [nights, setNights] = useState(3);
    const [selectedAircraftId, setSelectedAircraftId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Auto-select first available parked aircraft or default
    useEffect(() => {
        if (fleet.length > 0 && !selectedAircraftId) {
            const parked = fleet.find(f => f.status === 'parked');
            if (parked) setSelectedAircraftId(parked.id);
            else setSelectedAircraftId(fleet[0].id);
        }
    }, [fleet]);

    if (resort === undefined) return <div className="p-24 text-center font-mono text-white">Loading dossier...</div>;
    if (resort === null) return <div className="p-24 text-center font-mono text-white text-red-500">RESORT NOT FOUND IN DIRECTORY</div>;

    const initials = resort.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    
    // Toggle conditions
    const isAtResort = player?.currentLocationICAO === resort.locationICAO;
    const hasBookingHere = activeBooking?.resortId === resortId;

    // Flight calculation for Modal UI
    const selectedAircraft = fleet.find(a => a.id === selectedAircraftId);
    let flightCost = 0;
    let flightDurationHours = 0;
    let distanceNM = 0;
    let waypoints: {lat: number, lng: number}[] = [];
    let originICAO = '';
    
    if (selectedAircraft && resort) {
        let oLat = 0, oLng = 0;
        originICAO = selectedAircraft.currentLocationICAO || player?.currentLocationICAO || 'PHNL';
        const originAirport = airportsData.find((a: any) => a.icao === originICAO);
        const destAirport = airportsData.find((a: any) => a.icao === resort.locationICAO);
        
        if (originAirport && destAirport) {
            oLat = originAirport.lat; oLng = originAirport.lng;
            distanceNM = calculateDistanceNM(oLat, oLng, destAirport.lat, destAirport.lng);
            flightDurationHours = distanceNM / selectedAircraft.speedKnots;
            
            // Replicating basic cost for modal display (flight cost)
            const fuelCost = flightDurationHours * selectedAircraft.fuelBurnGPH * 6; // FLIGHT_COSTS.FUEL_PRICE_PER_GALLON roughly
            const crewCost = flightDurationHours * 500; // FLIGHT_COSTS.CREW_HOURLY
            const wearTear = flightDurationHours * 300; // WEAR_AND_TEAR
            flightCost = fuelCost + crewCost + wearTear + 500 + 400; // + NAV/FBO flat fees
            waypoints = [{lat: oLat, lng: oLng}, {lat: destAirport.lat, lng: destAirport.lng}];
        }
    }
    
    const resortCost = (resort.nightlyRate * nights);
    const totalCost = flightCost + resortCost;
    const canAfford = player ? player.netWorth >= totalCost : false;

    // Handlers
    const handleConfirmBooking = async () => {
        if (!selectedAircraft || !canAfford) return;
        setIsProcessing(true);
        try {
            await bookResortAndFly({
                resortId,
                checkInMs: simNow,
                nights,
                nightlyRate: resort.nightlyRate,
                aircraftId: selectedAircraft.tailNumber,
                originICAO,
                destinationICAO: resort.locationICAO,
                distanceNM,
                durationHours: flightDurationHours,
                flightCost,
                waypoints
            });
            setIsBookingModalOpen(false);
            router.push('/flight/active');
        } catch (e) {
            console.error(e);
            alert("Transaction failed.");
        }
        setIsProcessing(false);
    };

    const handleExtendSty = async () => {
        if (!activeBooking) return;
        setIsProcessing(true);
        try {
            await extendStay(activeBooking.id, resort.nightlyRate, 1);
        } catch(e) {
            console.error(e);
            alert("Could not extend stay.");
        }
        setIsProcessing(false);
    };

    const handleBuyExperience = async (se: SignatureExperience) => {
        if (!activeBooking || !hasBookingHere) return;
        setIsProcessing(true);
        try {
            await purchaseExperience(resort.id, activeBooking.id, se.id, se.price);
        } catch (e) {
            console.error(e);
            alert("Could not purchase experience.");
        }
        setIsProcessing(false);
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-[#0a0a0c] text-white">
            {/* Modal Overlay */}
            {isBookingModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h3 className="font-sans font-black text-xl tracking-widest uppercase">Book Stay</h3>
                            <button onClick={() => setIsBookingModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-8">
                            <div>
                                <label className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-2 block">Check-In Duration</label>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-xl text-lg font-mono">
                                    <button onClick={() => setNights(Math.max(1, nights - 1))} className="p-2 text-zinc-400 hover:text-white bg-black/40 rounded"><Minus size={16}/></button>
                                    <div className="flex-1 text-center font-black tracking-widest">{nights} NIGHTS</div>
                                    <button onClick={() => setNights(nights + 1)} className="p-2 text-zinc-400 hover:text-white bg-black/40 rounded"><Plus size={16}/></button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-2 block">Charter Aircraft</label>
                                <select 
                                    value={selectedAircraftId}
                                    onChange={(e) => setSelectedAircraftId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm font-mono tracking-widest uppercase outline-none focus:border-[#00f0ff]"
                                >
                                    {fleet.map(f => (
                                        <option key={f.id} value={f.id} className="bg-zinc-900">{f.tailNumber} ({f.modelName})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="bg-black/50 border border-white/5 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between text-xs font-mono text-zinc-400 tracking-widest">
                                    <span>FLIGHT DISPATCH</span>
                                    <span>${flightCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                </div>
                                <div className="flex justify-between text-xs font-mono text-zinc-400 tracking-widest">
                                    <span>RESORT RATE ({nights} NTS)</span>
                                    <span>${resortCost.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-white/10 pt-2 flex justify-between text-base font-mono text-white tracking-widest font-black">
                                    <span>TOTAL</span>
                                    <span className={canAfford ? 'text-[#00f0ff]' : 'text-red-500'}>${totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 bg-white/5">
                            <button 
                                onClick={handleConfirmBooking}
                                disabled={isProcessing || !canAfford}
                                className="w-full bg-white text-black py-4 rounded font-black tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
                            >
                                {isProcessing ? 'Processing Transaction...' : canAfford ? 'Confirm & Fly' : 'Insufficient Capital'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/10 p-4 md:px-8 flex items-center justify-between">
                <Link href="/destinations?tab=resorts" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-mono tracking-widest text-xs uppercase">
                    <ArrowLeft size={16} /> Directory
                </Link>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 border border-white/10 rounded font-mono text-[10px] tracking-widest text-zinc-500 bg-white/5 flex items-center gap-1">
                        <MapPin size={12}/> {resort.locationICAO}
                    </div>
                </div>
            </div>

            <div className="w-full h-[40vh] min-h-[300px] relative bg-zinc-900 border-b border-white/10">
                 {resort.imageUrl ? (
                     <img 
                         src={resort.imageUrl} 
                         alt={resort.name} 
                         className="w-full h-full object-cover opacity-80"
                     />
                 ) : (
                     <div className="w-full h-full bg-gradient-to-br from-[#1a1a1f] to-[#0a0a0c] flex items-center justify-center">
                         <span className="text-[120px] text-[#f5a7a7]/10 font-serif leading-none tracking-tighter mix-blend-screen">{initials}</span>
                     </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
                 
                 <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 mb-reverse">
                     <div className="max-w-4xl mx-auto flex items-end justify-between">
                         <div>
                            {resort.brand !== 'Independent' && (
                                <span className="text-zinc-400 tracking-widest uppercase font-mono text-xs block mb-2">{resort.brand}</span>
                            )}
                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-sans font-black tracking-tight text-white mb-4 group">{resort.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tracking-widest uppercase mt-4">
                               <div className="text-[#f5a7a7] border border-[#f5a7a7]/30 bg-[#f5a7a7]/10 px-3 py-1 rounded-sm flex items-center gap-1"><Star size={12}/> Tier {resort.tier}</div>
                               <div className="text-zinc-300 flex items-center gap-1.5"><MapPin size={14}/> {resort.city}, {resort.country}</div>
                            </div>
                         </div>
                     </div>
                 </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-12 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    
                    {/* Left Column */}
                    <div className="md:col-span-2 space-y-12">
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                           <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2">Dossier summary</h2>
                           <p className="text-lg leading-relaxed text-zinc-300 font-sans">{resort.description}</p>
                           <p className="text-zinc-500 font-mono text-xs tracking-widest italic mt-4 mb-2 uppercase">"{resort.shortDescription}"</p>
                        </section>

                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2">Featured Amenities</h2>
                            <div className="flex flex-wrap gap-2">
                                {resort.amenities.map((am: string) => (
                                    <div key={am} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded text-xs font-mono tracking-widest text-zinc-300 flex items-center gap-1.5">
                                        <Check size={12} className="text-[#f5a7a7]" /> {am}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 border-b border-white/10 pb-2 flex items-center justify-between">
                                Signature Experiences
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {resort.signatureExperiences.map((se: SignatureExperience) => {
                                    const isPurchased = activeBooking?.experiencesPurchased?.includes(se.id);
                                    
                                    return (
                                        <div key={se.id} className="bg-zinc-900 border border-white/10 p-5 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between group">
                                            <div className="flex-1 pr-4">
                                               <h3 className="font-bold text-white mb-2">{se.name}</h3>
                                               <p className="text-zinc-500 text-sm leading-relaxed">{se.description}</p>
                                            </div>
                                            <div className="shrink-0 mt-4 sm:mt-0 text-left sm:text-right flex flex-col sm:items-end justify-center">
                                                <div className="text-lg font-mono tracking-widest text-[#f5a7a7] mb-2">${se.price.toLocaleString()}</div>
                                                {isAtResort && hasBookingHere && (
                                                    <button 
                                                        onClick={() => handleBuyExperience(se)}
                                                        disabled={isPurchased || isProcessing}
                                                        className={`text-xs font-mono px-3 py-1.5 rounded uppercase tracking-widest transition-colors ${isPurchased ? 'bg-white/5 text-zinc-600 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
                                                    >
                                                        {isPurchased ? 'Enjoyed' : 'Purchase'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Right Info Column */}
                    <div className="space-y-8">
                        <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-6 relative overflow-hidden">
                            {isAtResort ? (
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#00f0ff] animate-pulse" />
                            ) : null}
                            
                            <div className="text-3xl font-mono tracking-widest text-white mb-1">
                                ${resort.nightlyRate.toLocaleString()} <span className="text-xs text-zinc-600 block mt-1 uppercase">Per Night</span>
                            </div>
                            
                            {isAtResort && hasBookingHere ? (
                                <>
                                    <div className="flex items-center gap-2 mt-4 text-xs font-mono tracking-widest text-[#00f0ff] uppercase border border-[#00f0ff]/20 bg-[#00f0ff]/5 p-2 rounded">
                                        <CheckCircle2 size={14} /> Checked In
                                    </div>
                                    <button 
                                        onClick={handleExtendSty}
                                        disabled={isProcessing}
                                        className="w-full bg-[#00f0ff] text-black hover:bg-cyan-300 py-4 rounded uppercase font-bold tracking-widest font-mono text-xs transition-colors mt-6"
                                    >
                                        Extend Stay (+1 Night)
                                    </button>
                                </>
                            ) : isAtResort && !hasBookingHere ? (
                                <>
                                    <div className="flex items-center gap-2 mt-4 text-xs font-mono tracking-widest text-[#f5a7a7] uppercase border border-[#f5a7a7]/20 bg-[#f5a7a7]/5 p-2 rounded">
                                        <MapPin size={14} /> Present at Concierge
                                    </div>
                                    <button 
                                        onClick={() => setIsBookingModalOpen(true)}
                                        className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded uppercase font-bold tracking-widest font-mono text-xs transition-colors mt-6"
                                    >
                                        Book Walk-In Stay
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mt-4 text-xs font-mono tracking-widest uppercase text-zinc-500 border border-zinc-800 p-2 rounded">
                                        <PlaneTakeoff size={14} /> Transport Required
                                    </div>
                                    <button 
                                        onClick={() => setIsBookingModalOpen(true)}
                                        className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded uppercase font-bold tracking-widest font-mono text-xs transition-colors mt-6"
                                    >
                                        Book Stay & Fly
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Social Discovery */}
                        <div className="border border-white/10 rounded-xl p-6 bg-black/40">
                             <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-6 flex items-center gap-2"><GlassWater size={14} /> Social Circle</h3>
                             {preferences.length > 0 ? (
                                 <div className="flex flex-col gap-4">
                                     {preferences.map((p: any) => (
                                         <div key={p.id} className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded transition-colors">
                                            <PersonaAvatar persona={p} size={36} className="border border-white/10 group-hover:border-[#f5a7a7]/50" />
                                            <div>
                                                <div className="font-mono tracking-widest uppercase text-sm font-bold text-white group-hover:text-[#f5a7a7] transition-colors">{p.displayName}</div>
                                                <div className="text-[10px] text-zinc-500 font-sans">{p.region || `Tier ${p.wealthTier} VIP`}</div>
                                            </div>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                 <p className="text-xs text-zinc-500 font-mono tracking-widest leading-relaxed uppercase">No established personas frequently request this asset.</p>
                             )}
                        </div>

                        {/* Dress code */}
                        <div className="border border-white/10 rounded-xl p-6 bg-black/40">
                             <h3 className="text-xs font-bold font-mono tracking-widest uppercase text-white/50 mb-4 pb-2 border-b border-white/10">Atmosphere</h3>
                             <p className="text-white text-sm leading-relaxed">{resort.dressCode}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
