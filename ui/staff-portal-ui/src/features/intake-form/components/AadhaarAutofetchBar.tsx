'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface AadhaarAutofetchBarProps {
    onDataFetched: (data: any) => void;
    onReset?: () => void;
    activeSources?: string[];
    loading?: boolean;
    fetchedData?: any;
    registerType?: string;
}

export default function AadhaarAutofetchBar({
    onDataFetched,
    onReset,
    activeSources = [],
    loading: externalLoading = false,
    fetchedData,
    registerType,
}: AadhaarAutofetchBarProps) {
    const [aadhaarInput, setAadhaarInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusStage, setStatusStage] = useState<string>('');

    const isFarmer = registerType === 'farmer';
    const isStudent = registerType === 'student';

    const handleSearch = async (aadhaarToSearch?: string) => {
        const target = (aadhaarToSearch || aadhaarInput).trim();
        if (!target) {
            toast.warn('Please enter an Aadhaar or Student ID to search');
            return;
        }

        setLoading(true);
        setStatusStage(
            isFarmer
                ? 'Searching Farmer & Land Registries...'
                : isStudent
                ? 'Searching UDISE+ Student Registry...'
                : 'Searching PDS Registry & Resolving Family Roster...'
        );
        try {
            const url = isFarmer
                ? `/api/external-fetch?aadhaar=${encodeURIComponent(target)}&registerType=farmer`
                : isStudent
                ? `/api/external-fetch?aadhaar=${encodeURIComponent(target)}&registerType=student`
                : `/api/external-fetch?aadhaar=${encodeURIComponent(target)}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to fetch from external registries');
            }
            const data = await res.json();
            if (data.status === 'not_found' || !data.sources_found || data.sources_found.length === 0) {
                toast.error(
                    isStudent
                        ? `No student record found in UDISE+ for: ${target}`
                        : `No records found in registry for: ${target}`
                );
            } else {
                if (isFarmer) {
                    toast.success(`✨ Found Farmer profile & land records from AgriStack & BiharBhumi!`);
                } else if (isStudent) {
                    toast.success(`✨ Found Student profile & academic details from UDISE+!`);
                } else {
                    toast.success(
                        `✨ Household resolved from PDS! (${data.family_members?.length || 1} family members loaded)`
                    );
                }
                onDataFetched(data);
            }
        } catch (err: any) {
            toast.error(err.message || 'Error connecting to external registries');
        } finally {
            setLoading(false);
            setStatusStage('');
        }
    };

    const handleClear = () => {
        setAadhaarInput('');
        setStatusStage('');
        onReset?.();
    };

    const isSearching = loading || externalLoading;

    const registryList = isFarmer
        ? [
              { id: 'FarmerAgriStack', label: 'Farmer AgriStack', icon: '🚜', role: 'PRIMARY' },
              { id: 'BiharBhumi', label: 'BiharBhumi (Land Records)', icon: '🌾', role: 'ENRICH' },
          ]
        : isStudent
        ? [
              { id: 'Student', label: 'UDISE+ Student Registry', icon: '🎓', role: 'PRIMARY' },
          ]
        : [
              { id: 'PDS', label: 'PDS Food Security (Ration Card)', icon: '🍚', role: 'PRIMARY' },
          ];

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1E36] via-[#16385C] to-[#0A192F] p-6 mb-8 text-white shadow-2xl border border-white/10">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Title & Live Indicator */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-xl shadow-lg shadow-amber-500/30">
                        {isFarmer ? '🚜' : isStudent ? '🎓' : '🍚'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-extrabold tracking-tight text-white">
                                {isFarmer
                                    ? 'Farmer Registry Autofetch (AgriStack + BiharBhumi)'
                                    : isStudent
                                    ? 'Student Registry Autofetch (UDISE+ Student)'
                                    : 'Household Registry Formation (PDS / Ration Card)'}
                            </h2>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 shadow-sm">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                {isFarmer ? '2 Agri APIs Live' : isStudent ? 'UDISE+ API Live' : 'PDS API Live'}
                            </span>
                        </div>
                        <p className="text-xs text-blue-200/80 mt-0.5">
                            {isFarmer
                                ? 'Direct lookup in AgriStack Farmer Registry ➔ Enrich land parcels & cadastral records from BiharBhumi'
                                : isStudent
                                ? 'Lookup by Student Aadhaar or UDISE Student ID ➔ Auto-populates Student Demographics, School & Scholarships'
                                : 'Lookup by Aadhaar or Ration Card Number ➔ Auto-populates Head Demographics, Full Family Roster & Food Entitlements'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Middle Bar: Interactive Search Input */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 pt-5">
                <div className="relative flex-1 w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        🆔
                    </div>
                    <input
                        type="text"
                        value={aadhaarInput}
                        onChange={(e) => setAadhaarInput(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={
                            isFarmer
                                ? 'Enter 12-digit Farmer Aadhaar Number...'
                                : isStudent
                                ? 'Enter 12-digit Student Aadhaar or UDISE Student ID (e.g. BR9599548612504)...'
                                : 'Enter 12-digit Aadhaar Number or Ration Card Number (e.g. 10-559-690-397262)...'
                        }
                        className="w-full bg-white/95 hover:bg-white text-slate-900 placeholder-slate-400 pl-11 pr-10 py-3.5 rounded-xl font-mono text-base font-semibold tracking-wider border-0 focus:ring-2 focus:ring-amber-400 shadow-inner transition-all"
                        maxLength={isFarmer ? 12 : 20}
                    />
                    {aadhaarInput && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-all"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => handleSearch()}
                        disabled={isSearching || !aadhaarInput.trim()}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-extrabold text-sm shadow-lg transition-all transform active:scale-95 ${
                            isSearching || !aadhaarInput.trim()
                                ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-white/10'
                                : 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 text-slate-950 shadow-amber-500/25'
                        }`}
                    >
                        {isSearching ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <span>{statusStage || 'Searching...'}</span>
                            </>
                        ) : (
                            <>
                                <span className="text-base">🔍</span>
                                <span>{isFarmer ? 'Fetch Farmer Details' : isStudent ? 'Fetch Student Details' : 'Form Household Registry'}</span>
                            </>
                        )}
                    </button>

                    {(activeSources.length > 0 || fetchedData) && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="px-4 py-3.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Bar: Registry Roles (Anchor vs Enrich) Status Pills */}
            <div className="relative z-10 flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-white/10">
                <span className="text-xs font-semibold text-blue-200/90 mr-1">
                    {isFarmer ? 'Agricultural Registries:' : 'Federated Registries:'}
                </span>
                {registryList.map((reg) => {
                    const isFound = activeSources.includes(reg.id);
                    return (
                        <span
                            key={reg.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                                isFound
                                    ? 'bg-emerald-400 text-emerald-950 shadow-md shadow-emerald-400/25 border border-emerald-300'
                                    : 'bg-white/5 text-blue-200/60 border border-white/10'
                            }`}
                        >
                            <span>{reg.icon}</span>
                            <span>{reg.label}</span>
                            {(reg.role === 'ANCHOR' || reg.role === 'PRIMARY') && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider ${
                                    isFound ? 'bg-emerald-800 text-emerald-100' : 'bg-blue-500/30 text-blue-200'
                                }`}>
                                    {reg.role}
                                </span>
                            )}
                            {isFound && <span className="text-[10px] bg-emerald-700 text-white rounded-full px-1.5 py-0.2">✓</span>}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
