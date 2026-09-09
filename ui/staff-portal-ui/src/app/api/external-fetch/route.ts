import { NextRequest, NextResponse } from 'next/server';
import { searchAllRegistriesByAadhaar } from '@/app/api/_lib/registry-client';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const aadhaar = searchParams.get('aadhaar');
        const registerType = searchParams.get('registerType') || undefined;

        if (!aadhaar) {
            return NextResponse.json({ error: 'Missing aadhaar parameter' }, { status: 400 });
        }

        // Targeted search across registries based on registerType (e.g. farmer -> AgriStack + BiharBhumi)
        const data = await searchAllRegistriesByAadhaar(aadhaar, registerType);
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Error in /api/external-fetch:', err);
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
    }
}
