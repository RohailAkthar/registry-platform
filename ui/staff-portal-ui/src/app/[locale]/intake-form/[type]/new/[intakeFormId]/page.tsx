'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/shared';
import MultiSectionAccordionForms from '@/features/intake-form/components/MultiSectionAccordionForms';
import { useRegister } from '@/context/RegisterContext';
import { useIntakeFormDetails } from '@/features/intake-form/hooks/useIntakeFormDetails';
import { useTranslations } from 'next-intl';
import { useIntakeFormSectionAction } from '@/features/intake-form/hooks/useIntakeFormSectionAction';
import AadhaarAutofetchBar from '@/features/intake-form/components/AadhaarAutofetchBar';

function getFirst(item: any) {
    if (Array.isArray(item)) return item.length > 0 ? item[0] : null;
    return item || null;
}

function getBankName(ifsc?: string, bankAccountNo?: string): string {
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
        return bankAccountNo.startsWith('0') ? 'Punjab National Bank' : 'State Bank of India';
    }
    return 'State Bank of India';
}

function buildSchemaDataFromExternal(data: any, registerType?: string) {
    if (!data) return {};
    const { registries, summary, family_members, household_id, individual } = data;
    const shg = getFirst(registries?.SHGLokOS);
    const land = getFirst(registries?.BiharBhumi);
    const farmer = getFirst(registries?.FarmerAgriStack);
    const pds = getFirst(registries?.PDS);
    const pension = getFirst(registries?.Pension);
    const student = getFirst(registries?.Student);

    const searched_aadhaar = data.searched_aadhaar || data.aadhaar || shg?.aadhaar_number || farmer?.aadhaar_number || land?.aadhaar_number || '';

    const schema: Record<string, any> = {};

    // -------------------------------------------------------------
    // INDIVIDUAL INTAKE FORM: All 74 columns in schema a0000000-0000-4000-8000-000000000001
    // -------------------------------------------------------------
    if (registerType === 'individual') {
        const ind = individual;
        const fullName = ind?.name || summary?.head_name || shg?.member_name || farmer?.farmer_name || land?.rayat_name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Citizen';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        const dob = ind?.dob || shg?.dob || student?.dob || '1985-05-15';
        const birthYear = new Date(dob).getFullYear() || 1985;
        const currentYear = new Date().getFullYear() || 2026;
        const calculatedAge = Math.max(18, currentYear - birthYear);

        const gender = ind?.gender || (shg ? 'FEMALE' : (student?.gender === 'F' ? 'FEMALE' : 'MALE'));
        const mobile = ind?.mobile || farmer?.mobile_number || shg?.mobile_number || summary?.phone || '';
        const district = ind?.district || summary?.district || land?.district || farmer?.district || shg?.district || pds?.district || 'Nalanda';
        const block = ind?.block || summary?.block || land?.anchal || farmer?.block || shg?.block || pds?.block || 'Hilsa';
        const gp = shg?.gp || `${summary?.village || 'Bishunpur'} GP`;
        const village = ind?.village || summary?.village || land?.mauza || farmer?.village || shg?.village || 'Bishunpur';
        const bankAccountNo = ind?.bank_account_no || shg?.bank_account_no || farmer?.bank_account_no || pension?.bank_account_no || summary?.bank_account_no || '';
        const ifscCode = ind?.ifsc || shg?.ifsc || summary?.ifsc || 'SBIN0007629';
        const bankName = ind?.bank_name || summary?.bank_name || getBankName(ifscCode, bankAccountNo);

        schema['a0000000-0000-4000-8000-000000000001'] = {
            // 1. Citizen Demographics, Identity & Location
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            birth_date: dob,
            estimated_age: calculatedAge,
            gender: gender,
            marital_status: shg ? 'MARRIED' : (calculatedAge > 25 ? 'MARRIED' : 'UNMARRIED'),
            religion: 'Hindu',
            caste: 'OBC',
            relationship_to_head: shg?.relationship_to_hoh?.toUpperCase() || (land || farmer ? 'HEAD' : 'HEAD'),
            aadhaar_no: searched_aadhaar,
            primary_phone_number: mobile,
            district: district,
            block: block,
            gram_panchayat: gp,
            village: village,
            pin_code: '804452',
            bank_name: bankName,
            bank_account_no: bankAccountNo,
            ifsc_code: ifscCode,

            // 2. JEEViKA Self-Help Group (SHG) Registry
            shg_id: shg?.shg_id || '',
            shg_name: shg?.shg_name || '',
            vo_name: shg?.vo_name || '',
            clf_name: shg?.clf_name || '',
            shg_member_name: shg?.member_name || (shg ? fullName : ''),
            shg_role: shg?.shg_role || '',
            shg_grading: shg?.shg_grading || '',
            shg_join_date: shg?.shg_join_date || '',
            monthly_savings_amount: Number(shg?.monthly_savings_amount) || 0,
            internal_loan_outstanding: Number(shg?.internal_loan_outstanding) || 0,
            ccl_limit: Number(shg?.ccl_limit) || 0,
            ccl_utilised: Number(shg?.ccl_utilised) || 0,
            shg_bank_account_no: String(shg?.bank_account_no || ''),
            shg_ifsc: shg?.ifsc || '',

            // 3. BiharBhumi Land Records Registry
            khatian_number: farmer?.khatiyan_number || (land ? `KH-${land.khata_number}` : ''),
            khata_number: String(land?.khata_number || farmer?.khata_number || ''),
            plot_number: String(land?.khesra_numbers || farmer?.khesra_number || ''),
            mauza: land?.mauza || farmer?.village || village || '',
            total_land_area_acres: Number(land?.rakba_area) || Number(farmer?.land_area_acres) || 0,
            irrigated_land_area_acres: Number(land?.rakba_area) ? Number((Number(land.rakba_area) * 0.75).toFixed(2)) : (Number(farmer?.land_area_acres) ? Number((Number(farmer.land_area_acres) * 0.75).toFixed(2)) : 0),
            unirrigated_land_area_acres: Number(land?.rakba_area) ? Number((Number(land.rakba_area) * 0.25).toFixed(2)) : (Number(farmer?.land_area_acres) ? Number((Number(farmer.land_area_acres) * 0.25).toFixed(2)) : 0),
            land_classification: land?.land_type || (farmer ? 'Raiyati' : ''),
            soil_type: (land || farmer) ? 'Alluvial / Clay Loam' : '',
            mutation_status: land?.mutation_status || (farmer ? 'Approved' : ''),
            jamabandi_number: land?.jamabandi_number || (farmer ? `JB-${farmer.farmer_id}` : ''),
            land_ownership_type: farmer?.land_ownership_type || (land ? 'Owner' : ''),

            // 4. Farmer Registry (AgriStack)
            farmer_id: farmer?.farmer_id || (land ? `BR-${searched_aadhaar}` : ''),
            pm_kisan_id: farmer ? (farmer.pm_kisan_enrolled ? `PMK-${farmer.farmer_id}` : 'Not Enrolled') : '',
            pm_kisan_status: farmer?.pm_kisan_enrolled ? 'Active' : (farmer ? 'Eligible - Pending' : ''),
            pm_kisan_installment_count: farmer?.pm_kisan_enrolled ? 16 : 0,
            primary_crop: farmer?.crop_type?.split(',')?.[0]?.trim() || (land ? 'Paddy' : ''),
            secondary_crop: farmer?.crop_type?.split(',')?.[1]?.trim() || (land ? 'Wheat' : ''),
            kcc_sanctioned_amount: farmer ? 150000 : 0,
            kcc_outstanding_amount: farmer ? 42000 : 0,
            soil_health_card_issued: Boolean(farmer || land),
            crop_insurance_enrolled: Boolean(farmer?.pmfby_enrolled),

            // 5. Food & Civil Supplies (PDS / Ration Card)
            pds_ration_card_number: pds?.ration_card_number || '',
            pds_card_type: pds?.ration_card_type || (pds ? 'PHH' : ''),
            fps_shop_code: pds?.fps_shop_code || (pds ? 'FPS-6425' : ''),
            fps_dealer_name: pds?.dealer_name || (pds ? 'Vora Store' : ''),
            pds_family_member_count: Number(pds?.family_member_count) || family_members?.length || 0,
            monthly_entitlement_kg: Number(pds?.monthly_entitlement_kg) || (pds ? 25 : 0),
            last_pds_transaction_date: pds?.last_transaction_date || '',
            pds_ekyc_status: pds?.e_kyc_status || (pds ? 'Verified' : ''),

            // 6. Social Welfare & Pensions (NSAP / SSPMIS)
            pension_scheme_name: pension?.scheme_name || '',
            pensioner_id: pension?.beneficiary_id || '',
            sanction_order_number: pension ? `SANCT-${pension.beneficiary_id}` : '',
            monthly_pension_amount: Number(pension?.pension_amount_monthly) || 0,
            pension_disbursement_mode: pension ? 'DBT to Aadhaar Linked Account' : '',
            pension_account_number: String(pension?.bank_account_no || ''),
            pension_status: pension?.payment_status || (pension ? 'Active' : ''),
            last_disbursement_date: pension?.sanction_date || '',

            // 7. Education & Student Registry (UDISE+ / Medhasoft)
            student_id: student?.udise_student_id || '',
            school_udise_code: student?.school_udise_code || '',
            school_name: student?.school_name || '',
            current_grade: student?.class_grade || '',
            scholarship_received: student?.scholarship_status || (student ? 'Active' : ''),
            midday_meal_beneficiary: Boolean(student),
            attendance_percentage: Number(student?.attendance_percentage) || (student ? 88.5 : 0),
        };

        return schema;
    }

    // -------------------------------------------------------------
    // FARMER INTAKE FORM (AgriStack + BiharBhumi Integration)
    // -------------------------------------------------------------
    if (registerType === 'farmer') {
        const farmerName = farmer?.farmer_name || land?.rayat_name || summary?.head_name || 'Farmer';
        const nameParts = farmerName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Farmer';
        const lastName = nameParts.slice(1).join(' ') || '';
        const mobile = farmer?.farmer_mobile_number || farmer?.mobile_number || summary?.phone || '';
        const district = farmer?.district || land?.district || summary?.district || 'Nalanda';
        const block = farmer?.block || land?.anchal || summary?.block || 'Hilsa';
        const village = farmer?.village || land?.mauza || summary?.village || 'Bishunpur';
        const bankAccountNo = farmer?.farmer_bank_account_no || farmer?.bank_account_no || summary?.bank_account_no || '';
        const ifscCode = summary?.ifsc || 'SBIN0007629';
        const bankName = getBankName(ifscCode, bankAccountNo);

        schema['a0000000-0000-4000-8000-000000000003'] = {
            foundational_id: data.aadhaar || searched_aadhaar,
            first_name: firstName,
            last_name: lastName,
            gender: 'MALE',
            birth_date: '1982-05-14',
            estimated_age: 44,
            mobile_phone_number: mobile,
            district: district,
            block: block,
            village: village,
            region_code: 'Bihar',
            zone_subcity_code: district,
            woreda_code: block,
            kebele_code: village,
            has_personal_phone: Boolean(mobile),
            source_of_income: 'CROP_PRODUCTION',
            education_level: 'BASIC',
            disabled: false,

            // AgriStack attributes
            farmer_id: farmer?.farmer_id || (land ? `BR-${searched_aadhaar}` : ''),
            relation_name: farmer?.relation_name || '',
            crop_type: farmer?.crop_type || 'Paddy, Wheat',
            land_area_acres: Number(farmer?.land_area_acres) || Number(land?.rakba_area) || 0,
            land_ownership_type: farmer?.land_ownership_type || 'Owner / Raiyati',
            khata_number: String(farmer?.khata_number || land?.khata_number || ''),
            khesra_number: String(farmer?.khesra_number || land?.khesra_numbers || ''),
            khatiyan_number: farmer?.khatiyan_number || (land ? `KH-${land.khata_number}` : ''),
            pm_kisan_enrolled: Boolean(farmer?.pm_kisan_enrolled),
            pmfby_enrolled: Boolean(farmer?.pmfby_enrolled),
            farmer_bank_account_no: bankAccountNo,
            bank_name: bankName,
            ifsc_code: ifscCode,
        };

        // Operated Land Parcels (b0000000-0000-4000-8000-000000000050)
        const landRecords: any[] = [];
        const bhumiList = Array.isArray(registries?.BiharBhumi) ? registries.BiharBhumi : (land ? [land] : []);
        for (const b of bhumiList) {
            landRecords.push({
                jamabandi_number: b.jamabandi_number || '',
                khata_number: String(b.khata_number || ''),
                khesra_numbers: String(b.khesra_numbers || ''),
                rakba_area: Number(b.rakba_area) || 0,
                land_ownership_type: 'OWNER',
                mauza: b.mauza || village,
                anchal: b.anchal || block,
                district: b.district || district,
            });
        }
        if (landRecords.length === 0 && farmer) {
            landRecords.push({
                jamabandi_number: `FARM-${farmer.farmer_id}`,
                khata_number: String(farmer.khata_number || ''),
                khesra_numbers: String(farmer.khesra_number || ''),
                rakba_area: Number(farmer.land_area_acres) || 0,
                land_ownership_type: farmer.land_ownership_type || 'OWNER',
                mauza: farmer.village || village,
                anchal: farmer.block || block,
                district: farmer.district || district,
            });
        }
        schema['b0000000-0000-4000-8000-000000000050'] = { records: landRecords };

        // Standing Crops (b0000000-0000-4000-8000-000000000051)
        const cropRecords: any[] = [];
        const crops = (farmer?.crop_type || 'Paddy, Wheat').split(',');
        for (let i = 0; i < crops.length; i++) {
            cropRecords.push({
                commodity: crops[i].trim(),
                season: i % 2 === 0 ? 'Kharif' : 'Rabi',
                area_cultivated_acres: Number(((Number(farmer?.land_area_acres) || 2.5) / crops.length).toFixed(2)),
                end_use: 'FOOD_HUMAN_CONSUMPTION',
            });
        }
        schema['b0000000-0000-4000-8000-000000000051'] = { records: cropRecords };

        return schema;
    }

    // -------------------------------------------------------------
    // HOUSEHOLD INTAKE FORM (Anchor + Enrich Architecture)
    // -------------------------------------------------------------
    // Compute demographic breakdown from family roster
    let sizeAdults = 0;
    let sizeChildrenU5 = 0;
    let sizeSchoolAge = 0;
    let sizeElderly = 0;
    let femaleCount = 0;
    let maleCount = 0;

    if (family_members && family_members.length > 0) {
        for (const m of family_members) {
            const age = m.age ?? (m.dob ? (2026 - new Date(m.dob).getFullYear()) : 30);
            if (age < 5) sizeChildrenU5++;
            else if (age <= 17) sizeSchoolAge++;
            else if (age >= 60) sizeElderly++;
            else sizeAdults++;

            const g = (m.gender || '').toUpperCase();
            if (g === 'FEMALE' || g === 'F') femaleCount++;
            else maleCount++;
        }
    } else {
        sizeAdults = 2;
        sizeSchoolAge = 2;
        femaleCount = 2;
        maleCount = 2;
    }

    const totalCalculatedSize = family_members?.length || pds?.family_member_count || 4;

    // Normalize Ration Card Type & e-KYC to match OpenG2P select options
    const rawRcType = (pds?.ration_card_type || summary?.ration_card_type || 'PHH').toUpperCase().trim();
    let normalizedRcType = 'PHH';
    if (rawRcType.includes('AAY') || rawRcType.includes('ANTYODAYA')) normalizedRcType = 'AAY';
    else if (rawRcType.includes('STATE')) normalizedRcType = 'STATE';
    else if (rawRcType.includes('NON')) normalizedRcType = 'NON_NFSA';
    else normalizedRcType = 'PHH';

    const rawEkyc = (pds?.e_kyc_status || 'VERIFIED').toUpperCase().trim();
    let normalizedEkyc = 'VERIFIED';
    if (rawEkyc.includes('FAIL')) normalizedEkyc = 'FAILED';
    else if (rawEkyc.includes('PEND')) normalizedEkyc = 'PENDING';
    else normalizedEkyc = 'VERIFIED';

    // 1. Household Headship & Demographics, Location & PDS (a0000000-0000-4000-8000-000000000002)
    schema['a0000000-0000-4000-8000-000000000002'] = {
        household_head_person_id: data.aadhaar || searched_aadhaar,
        household_head_name: summary?.head_name || pds?.head_of_household_name || '',
        headship_type: (pds?.gender || '').toUpperCase() === 'F' ? 'FEMALE_HEADED' : 'MALE_HEADED',
        size_total: totalCalculatedSize,
        size_adults: sizeAdults,
        size_children_u5: sizeChildrenU5,
        size_school_age: sizeSchoolAge,
        size_elderly: sizeElderly,
        number_of_female_members: femaleCount,
        number_of_male_members: maleCount,
        elderly_member_present: sizeElderly > 0,
        dwelling_type: 'PERMANENT',
        tenure_status: 'OWNED',
        region_code: 'Bihar',
        zone_subcity_code: summary?.district || pds?.district || 'Nalanda',
        woreda_code: summary?.block || pds?.block || 'Rajgir',
        locality_ea_code: summary?.gp || `${summary?.block || pds?.block || 'Rajgir'} GP`,
        kebele_code: summary?.village || summary?.block || pds?.block || 'Rajgir',
        address_line_1: `${summary?.block || pds?.block || 'Rajgir'}, ${summary?.district || pds?.district || 'Nalanda'}, Bihar`,
        address_descriptor: `Ration Card #${pds?.ration_card_number || summary?.ration_card_number || ''}, ${pds?.dealer_name || summary?.dealer_name || 'FPS Store'} (${pds?.fps_shop_code || summary?.fps_shop_code || ''}), ${summary?.block || pds?.block || 'Rajgir'}, ${summary?.district || pds?.district || 'Nalanda'}`,
        record_name: summary?.head_name ? `Household of ${summary.head_name}` : 'Household',

        // PDS Food Security (Ration Card Details)
        ration_card_number: pds?.ration_card_number || summary?.ration_card_number || '',
        ration_card_type: normalizedRcType,
        fps_shop_code: pds?.fps_shop_code || summary?.fps_shop_code || 'FPS-6425',
        dealer_name: pds?.dealer_name || summary?.dealer_name || 'Fair Price Shop',
        monthly_entitlement_kg: Number(pds?.monthly_entitlement_kg || summary?.monthly_entitlement_kg) || 25,
        e_kyc_status: normalizedEkyc,
    };

    // Helper to normalize relationship to OpenG2P RelationshipToHeadEnum
    const normalizeRelationship = (rel: string | undefined | null): string => {
        const r = (rel || '').toLowerCase().trim();
        if (r === 'head' || r === 'self') return 'SELF';
        if (r === 'spouse' || r === 'wife' || r === 'husband') return 'SPOUSE';
        if (r === 'son' || r === 'daughter' || r === 'child') return 'CHILD';
        if (r === 'father' || r === 'mother' || r === 'parent') return 'PARENT';
        if (r === 'brother' || r === 'sister' || r === 'sibling') return 'SIBLING';
        return 'OTHER_RELATIVE';
    };

    // 2. Household Members Roster (a0000000-0000-4000-8000-000000000001)
    const memberRecords: any[] = [];
    if (family_members && family_members.length > 0) {
        for (const m of family_members) {
            const nameParts = (m.name || 'Member').trim().split(/\s+/);
            const firstName = nameParts[0] || 'Member';
            const lastName = nameParts.slice(1).join(' ') || firstName;
            memberRecords.push({
                foundational_id: m.aadhaar_number,
                first_name: firstName,
                last_name: lastName,
                gender: m.gender || 'UNKNOWN',
                birth_date: m.dob || '1990-01-01',
                relationship_to_head: normalizeRelationship(m.relationship),
            });
        }
    } else if (summary?.head_name) {
        const nameParts = summary.head_name.trim().split(/\s+/);
        memberRecords.push({
            foundational_id: data.aadhaar || searched_aadhaar,
            first_name: nameParts[0] || 'Head',
            last_name: nameParts.slice(1).join(' ') || 'Head',
            gender: 'MALE',
            birth_date: '1982-05-14',
            relationship_to_head: 'SELF',
        });
    }
    schema['a0000000-0000-4000-8000-000000000001'] = { records: memberRecords };

    // 3. PDS Ration Food Security (b0000000-0000-4000-8000-000000000095.records)
    const pdsRecords: any[] = [];
    const pdsList = Array.isArray(registries?.PDS) ? registries.PDS : (pds ? [pds] : []);
    const seenRationCards = new Set<string>();
    for (const p of pdsList) {
        const rc = (p.ration_card_number || '').trim();
        if (!rc || seenRationCards.has(rc)) continue;
        seenRationCards.add(rc);
        pdsRecords.push({
            ration_card_number: rc,
            ration_card_type: p.ration_card_type || 'PHH',
            head_of_household_name: p.head_of_household_name || summary?.head_name || '',
            family_member_count: Number(p.family_member_count) || family_members?.length || 4,
            fps_shop_code: p.fps_shop_code || 'FPS-6425',
            dealer_name: p.dealer_name || 'Vora Store',
            e_kyc_status: p.e_kyc_status || 'Verified',
            last_transaction_date: p.last_transaction_date || '2025-10-18',
            monthly_entitlement_kg: Number(p.monthly_entitlement_kg) || 15,
            district: p.district || summary?.district || 'Nalanda',
            block: p.block || summary?.block || 'Hilsa',
        });
    }
    schema['b0000000-0000-4000-8000-000000000095'] = { records: pdsRecords };

    return schema;
}

export default function NewIntakeFormSubmissionPage() {
    const t = useTranslations();
    const router = useRouter();
    const routeParams = useParams<{ type: string, intakeFormId: string }>();
    const intake_form_id = routeParams.intakeFormId;
    const registerType = routeParams.type;

    const { currentRegister } = useRegister();
    const registerId = currentRegister?.register_id;

    const { sections, form_name, form_description, loading } = useIntakeFormDetails(intake_form_id);

    const [externalData, setExternalData] = useState<any>(null);
    const [schemaData, setSchemaData] = useState<any>({});
    const [formKey, setFormKey] = useState(0);

    const { handleAction, FormActionModals } = useIntakeFormSectionAction({
        registerId,
        formId: intake_form_id,
        registerType,
        submissionId: null
    });

    const handleDataFetched = (data: any) => {
        setExternalData(data);
        const generated = buildSchemaDataFromExternal(data, registerType);
        setSchemaData(generated);
        setFormKey(prev => prev + 1);
    };

    const handleReset = () => {
        setExternalData(null);
        setSchemaData({});
        setFormKey(prev => prev + 1);
    };

    return (
        <div className="min-h-screen mx-auto bg-secondary-first">
            <TopBar
                breadcrumb={[
                    {
                        label: t("register_intake_form", { subject: currentRegister?.register_subject || t("register") }),
                        href: `/intake-form/${registerType}`
                    },
                    { label: form_name || "" }
                ]}
                showFilters={false}
                showPagination={false}
                showCapsule={false}
            />

            <div className="mx-7.5 py-4">
                {/* 1. GramStack Multi-Registry Autofetch Bar */}
                <AadhaarAutofetchBar
                    registerType={registerType}
                    onDataFetched={handleDataFetched}
                    onReset={handleReset}
                    activeSources={externalData?.sources_found || []}
                    fetchedData={externalData}
                />

                {/* 2. Official OpenG2P Intake Form with Exact GramStack Fields */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <span className="text-neutral-first/50">{t('loading')}</span>
                    </div>
                ) : (
                    <MultiSectionAccordionForms
                        key={formKey}
                        formDetailsCard={false}
                        sections={sections || []}
                        schemaData={schemaData}
                        onAction={handleAction}
                        onCancel={() => router.push(`/intake-form/${registerType}`)}
                        registerType={registerType}
                    />
                )}
            </div>

            <FormActionModals />
        </div>
    );
}
