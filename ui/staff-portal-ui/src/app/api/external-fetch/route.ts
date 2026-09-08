import { NextRequest, NextResponse } from 'next/server';
import { searchAllRegistriesByAadhaar } from '@/app/api/_lib/registry-client';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const aadhaar = searchParams.get('aadhaar');

        if (!aadhaar) {
            return NextResponse.json({ error: 'Missing aadhaar parameter' }, { status: 400 });
        }

        // Fan-out search across all 6 Sunbird RC registries
        const data = await searchAllRegistriesByAadhaar(aadhaar);
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Error in /api/external-fetch:', err);
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
    }
}
