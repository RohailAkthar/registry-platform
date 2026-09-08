import "server-only";

import { getServerEnv } from "./env-config";

// ---------------------------------------------------------------------------
// Sunbird RC entity definitions
// ---------------------------------------------------------------------------

/** The six GramStack registries hosted on Sunbird RC. */
export const REGISTRY_ENTITIES = [
    "SHGLokOS",
    "FarmerAgriStack",
    "PDS",
    "Student",
    "Pension",
    "BiharBhumi",
] as const;

export type RegistryEntity = (typeof REGISTRY_ENTITIES)[number];

// ---------------------------------------------------------------------------
// Bank name lookup helper (from IFSC or account number)
// ---------------------------------------------------------------------------

export function getBankNameFromIfsc(ifsc?: string, bankAccountNo?: string): string {
    if (ifsc) {
        const prefix = ifsc.trim().toUpperCase().slice(0, 4);
        const ifscMap: Record<string, string> = {
            SBIN: "State Bank of India",
            PUNB: "Punjab National Bank",
            BARB: "Bank of Baroda",
            BKID: "Bank of India",
            UBIN: "Union Bank of India",
            CNRB: "Canara Bank",
            HDFC: "HDFC Bank",
            ICIC: "ICICI Bank",
            UTIB: "Axis Bank",
            CBIN: "Central Bank of India",
            IDIB: "Indian Bank",
            IOBA: "Indian Overseas Bank",
            UCBA: "UCO Bank",
            MAHB: "Bank of Maharashtra",
            KKBK: "Kotak Mahindra Bank",
            YESB: "YES Bank",
            IPOS: "India Post Payments Bank",
            AIRP: "Airtel Payments Bank",
            PYTM: "Paytm Payments Bank",
        };
        if (ifscMap[prefix]) return ifscMap[prefix];
    }
    if (bankAccountNo) {
        return bankAccountNo.startsWith("0") ? "Punjab National Bank" : "State Bank of India";
    }
    return "State Bank of India";
}

// ---------------------------------------------------------------------------
// Low-level search helper
// ---------------------------------------------------------------------------

interface SearchFilters {
    [field: string]: { eq?: string; contains?: string };
}

interface SearchPayload {
    filters: SearchFilters;
    limit: number;
    offset: number;
}

/**
 * Call `POST /api/v1/{entity}/search` on the Sunbird RC registry.
 * Returns the parsed JSON array of matching records, or `[]` on error.
 */
export async function searchRegistry(
    entity: RegistryEntity,
    filters: SearchFilters,
    limit = 25,
    offset = 0
): Promise<any[]> {
    const env = getServerEnv();
    const baseUrl = env.registryApiUrl;

    if (!baseUrl) {
        console.warn(
            `[registry-client] REGISTRY_API_URL is not set. Skipping ${entity} search.`
        );
        return [];
    }

    const payload: SearchPayload = { filters, limit, offset };

    try {
        const res = await fetch(`${baseUrl}/api/v1/${entity}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        if (!res.ok) {
            console.warn(
                `[registry-client] ${entity} search returned ${res.status}`
            );
            return [];
        }

        const data = await res.json();
        // Sunbird RC returns an array of matching records
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error(`[registry-client] ${entity} search failed:`, err);
        return [];
    }
}

export interface AggregateSearchResult {
    status: "found" | "not_found";
    searched_aadhaar: string;
    aadhaar: string;
    household_id: string;
    sources_found: string[];
    registries: Record<string, any>;
    summary: {
        head_name: string;
        phone: string;
        district: string;
        block: string;
        village: string;
        family_size: number;
        bank_account_no: string;
        ifsc: string;
        bank_name: string;
    } | null;
    individual?: {
        name: string;
        dob: string;
        gender: string;
        mobile: string;
        district: string;
        block: string;
        village: string;
        bank_account_no: string;
        ifsc: string;
        bank_name: string;
        role: string;
    };
    family_members: any[];
}

/**
 * Search all 6 registries in parallel by Aadhaar number.
 *
 * Returns an aggregated response compatible with the shape the UI expects.
 */
export async function searchAllRegistriesByAadhaar(aadhaar: string): Promise<AggregateSearchResult> {
    const cleanAadhaar = aadhaar.trim();

    // 1. Fan-out across all entities searching directly by Aadhaar
    const [
        shgRecords,
        farmerRecords,
        pdsRecords,
        studentRecords,
        pensionRecords,
        bhumiByAadhaar,
    ] = await Promise.all([
        searchRegistry("SHGLokOS", { aadhaar_number: { eq: cleanAadhaar } }),
        searchRegistry("FarmerAgriStack", { aadhaar_number: { eq: cleanAadhaar } }),
        searchRegistry("PDS", { aadhaar_number: { eq: cleanAadhaar } }),
        searchRegistry("Student", { student_aadhaar_number: { eq: cleanAadhaar } }),
        searchRegistry("Pension", { aadhaar_number: { eq: cleanAadhaar } }),
        searchRegistry("BiharBhumi", { aadhaar_number: { eq: cleanAadhaar } }),
    ]);

    const resultsMap: Record<RegistryEntity, any[]> = {
        SHGLokOS: shgRecords,
        FarmerAgriStack: farmerRecords,
        PDS: pdsRecords,
        Student: studentRecords,
        Pension: pensionRecords,
        BiharBhumi: bhumiByAadhaar,
    };

    // 2. Discover household_id from matched records (for record reference only)
    let householdId = "";
    for (const entity of REGISTRY_ENTITIES) {
        for (const rec of resultsMap[entity]) {
            if (rec.household_id) {
                householdId = rec.household_id;
                break;
            }
        }
        if (householdId) break;
    }

    // 4. Collect sources found and non-empty registries
    const sourcesFound: string[] = [];
    const registries: Record<string, any> = {};

    for (const entity of REGISTRY_ENTITIES) {
        if (resultsMap[entity].length > 0) {
            sourcesFound.push(entity);
            registries[entity] = resultsMap[entity];
        }
    }

    if (sourcesFound.length === 0) {
        return {
            status: "not_found",
            searched_aadhaar: cleanAadhaar,
            aadhaar: cleanAadhaar,
            household_id: "",
            sources_found: [],
            registries: {},
            summary: null,
            family_members: [],
        };
    }

    // 5. Build summary & individual from the richest record available
    const { summary, individual } = buildSummaryAndIndividual(resultsMap, cleanAadhaar);
    const familyMembers = buildFamilyMembers(resultsMap, cleanAadhaar);

    return {
        status: "found",
        searched_aadhaar: cleanAadhaar,
        aadhaar: cleanAadhaar,
        household_id: householdId || "NSR-HH-PENDING",
        sources_found: sourcesFound,
        registries,
        summary,
        individual,
        family_members: familyMembers,
    };
}

// ---------------------------------------------------------------------------
// Summary & individual builders
// ---------------------------------------------------------------------------

function buildSummaryAndIndividual(
    resultsMap: Record<RegistryEntity, any[]>,
    _aadhaar: string
) {
    let headName = "";
    let phone = "";
    let district = "";
    let block = "";
    let village = "";
    let familySize = 1;
    let bankAccountNo = "";
    let ifsc = "";
    let dob = "";
    let gender = "";
    let role = "Citizen";

    // Priority for individual demographic extraction
    const preferredOrder: RegistryEntity[] = [
        "SHGLokOS",
        "FarmerAgriStack",
        "PDS",
        "BiharBhumi",
        "Pension",
        "Student",
    ];

    for (const entity of preferredOrder) {
        const records = resultsMap[entity];
        if (!records || records.length === 0) continue;
        const rec = records[0];

        if (!headName) {
            headName =
                rec.member_name ||
                rec.farmer_name ||
                rec.head_of_household_name ||
                rec.rayat_name ||
                rec.head_of_family ||
                rec.beneficiary_name ||
                rec.student_name ||
                "";
        }

        if (!phone) {
            phone = rec.mobile_number || rec.phone || rec.contact_number || "";
        }

        if (!district) district = rec.district || "";
        if (!block) block = rec.block || rec.anchal || rec.block_name || "";
        if (!village) village = rec.village || rec.mauza || rec.village_name || rec.panchayat || "";

        if (!bankAccountNo && rec.bank_account_no) {
            bankAccountNo = String(rec.bank_account_no);
        }

        if (!ifsc && rec.ifsc) {
            ifsc = String(rec.ifsc);
        }

        if (!dob && rec.dob) {
            dob = String(rec.dob);
        }

        if (!gender && rec.gender) {
            gender = rec.gender === "F" ? "FEMALE" : (rec.gender === "M" ? "MALE" : String(rec.gender));
        }

        if (entity === "SHGLokOS" && rec.shg_role) {
            role = `JEEViKA ${rec.shg_role}`;
        } else if (entity === "FarmerAgriStack" && role === "Citizen") {
            role = "AgriStack Farmer";
        }

        if (rec.family_member_count) {
            familySize = rec.family_member_count;
        } else if (rec.family_size) {
            familySize = rec.family_size;
        }
    }

    if (familySize <= 1 && resultsMap.Student.length > 0) {
        familySize = resultsMap.Student.length + 1;
    }

    const bankName = getBankNameFromIfsc(ifsc, bankAccountNo);

    const summary = {
        head_name: headName || "Verified Citizen",
        phone,
        district,
        block,
        village,
        family_size: familySize,
        bank_account_no: bankAccountNo,
        ifsc,
        bank_name: bankName,
    };

    const individual = {
        name: headName || "Verified Citizen",
        dob: dob || "1987-07-18",
        gender: gender || "FEMALE",
        mobile: phone,
        district,
        block,
        village,
        bank_account_no: bankAccountNo,
        ifsc,
        bank_name: bankName,
        role,
    };

    return { summary, individual };
}

function buildFamilyMembers(
    resultsMap: Record<RegistryEntity, any[]>,
    _aadhaar: string
) {
    const members: any[] = [];
    const seenIds = new Set<string>();

    // 1. PDS family members array
    for (const rec of resultsMap.PDS) {
        if (rec.family_members && Array.isArray(rec.family_members)) {
            for (const fm of rec.family_members) {
                const id = fm.aadhaar_number || fm.name;
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    members.push(fm);
                }
            }
        }
    }

    // 2. Student records (children)
    for (const rec of resultsMap.Student) {
        const id = rec.student_aadhaar_number || rec.student_name;
        if (id && !seenIds.has(id)) {
            seenIds.add(id);
            members.push({
                name: rec.student_name,
                aadhaar_number: rec.student_aadhaar_number || "",
                relationship: "Child",
                age: rec.dob ? calculateAge(rec.dob) : undefined,
                gender: rec.gender,
                school: rec.school_name,
                grade: rec.class_grade,
                scholarship: rec.scholarship_status,
            });
        }
    }

    return members;
}

function calculateAge(dobString: string): number | undefined {
    try {
        const birthDate = new Date(dobString);
        if (isNaN(birthDate.getTime())) return undefined;
        const diffMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(diffMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
        return undefined;
    }
}


