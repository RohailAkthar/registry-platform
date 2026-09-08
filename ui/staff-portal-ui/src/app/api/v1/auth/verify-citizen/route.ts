import { NextRequest, NextResponse } from 'next/server';
import { searchAllRegistriesByAadhaar } from '@/app/api/_lib/registry-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const aadhaar = body.aadhaar || body.aadhaar_number || body.id;
        return handleVerify(aadhaar);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const aadhaar = searchParams.get('aadhaar') || searchParams.get('aadhaar_number') || searchParams.get('id');
    return handleVerify(aadhaar);
}

async function handleVerify(aadhaar: string | null) {
    if (!aadhaar || !aadhaar.trim()) {
        return NextResponse.json(
            {
                status: 'BAD_REQUEST',
                exists: false,
                can_login: false,
                message: 'Aadhaar ID or Number is required for verification.',
            },
            { status: 400 }
        );
    }

    const cleanAadhaar = aadhaar.trim();

    try {
        // Query all Sunbird RC registries via federated search
        const data = await searchAllRegistriesByAadhaar(cleanAadhaar);

        // Check if citizen exists in ANY of the registered departments
        const sourcesFound = data.sources_found || [];
        const isFound = sourcesFound.length > 0 && data.status !== 'not_found';

        if (isFound) {
            return NextResponse.json({
                status: 'SUCCESS',
                exists: true,
                can_login: true,
                message: 'Citizen authenticated successfully with National Social Registry (NSR)',
                citizen: {
                    // 1. Primary Demographics & Location
                    aadhaar: cleanAadhaar,
                    name: data.summary?.head_name || 'Verified Citizen',
                    household_id: data.household_id || 'NSR-HH-PENDING',
                    family_size: data.summary?.family_size || 1,
                    registry_status: 'VERIFIED_ACTIVE',
                    phone_number: data.summary?.phone || '',
                    location: {
                        state: 'Bihar',
                        district: data.summary?.district || '',
                        block: data.summary?.block || '',
                        village: data.summary?.village || '',
                        full_address: `${data.summary?.village || ''}, ${data.summary?.block || ''}, ${data.summary?.district || ''}, Bihar`,
                    },

                    // 2. Registries Found
                    registries_verified: sourcesFound,

                    // 3. Complete Household Family Members Roster
                    family_members: data.family_members || [],

                    // 4. Complete Departmental Program Data
                    entitlements_and_registries: {
                        // BiharBhumi Land Records
                        land_records: data.registries?.BiharBhumi || null,

                        // JEEViKA Women's Self-Help Group (SHG)
                        jeevika_shg: data.registries?.SHGLokOS || null,

                        // PDS Food Security / Ration Card
                        food_security_pds: data.registries?.PDS || null,

                        // Agriculture & Farming Stack
                        farmer_agristack: data.registries?.FarmerAgriStack || null,

                        // Social Security Pension (Elderly / Disability / Widow)
                        social_pension: data.registries?.Pension || null,

                        // School Education (UDISE+ Students)
                        student_education: data.registries?.Student || null,
                    },
                },
            });
        }

        // Citizen NOT found in NSR
        return NextResponse.json({
            status: 'NOT_FOUND',
            exists: false,
            can_login: false,
            message: 'Your data is not in the National Social Registry (NSR). Please complete registration.',
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                status: 'ERROR',
                exists: false,
                can_login: false,
                message: `Error connecting to NSR: ${err.message}`,
            },
            { status: 500 }
        );
    }
}
