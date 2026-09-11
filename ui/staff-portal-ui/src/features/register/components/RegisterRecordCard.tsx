'use client';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { RegisterRecord } from '../types';
import { sortedDisplayFields } from '../utils';

interface RegisterRecordCardProps {
    record: RegisterRecord;
    registerType: string;
    isEven: boolean;
}

const FIELD_LABEL_MAP: Record<string, string> = {
    foundational_id: 'Aadhaar ID',
    farmer_id: 'Farmer ID',
    farmer_name: 'Farmer Name',
    village: 'Village',
    block: 'Block',
    district: 'District',
    crop_type: 'Crops',
    land_area_acres: 'Land Area (Acres)',
    udise_student_id: 'UDISE Student ID',
    student_name: 'Student Name',
    school_name: 'School Name',
    class_grade: 'Class / Grade',
    scholarship_status: 'Scholarship',
    group_name: 'Group Name',
    shg_id: 'LokOS SHG ID',
    shg_code: 'SHG Code',
    lokos_id: 'LokOS ID',
    member_id: 'Member ID',
    key_member_name: 'Representative',
    key_member_aadhaar: 'Rep. Aadhaar',
    shg_grading: 'SHG Grading',
    monthly_savings_amount: 'Monthly Savings',
    household_head_name: 'Head of Household',
    household_head_person_id: 'Head Aadhaar ID',
    headship_type: 'Headship',
    size_total: 'Members',
    dwelling_type: 'Dwelling Type',
    tenure_status: 'Tenure',
    zone_subcity_code: 'District',
    woreda_code: 'Block',
    kebele_code: 'Village',
    internal_loan_outstanding: 'Internal Loan',
    ccl_limit: 'CCL Limit',
    ccl_utilised: 'CCL Utilised',
};

function formatFieldLabel(fieldName: string, t: any): string {
    if (fieldName === 'foundational_id') return 'Aadhaar ID';
    if (FIELD_LABEL_MAP[fieldName]) return FIELD_LABEL_MAP[fieldName];
    if (t.has(fieldName)) {
        const translated = t(fieldName);
        if (translated && !translated.toLowerCase().includes('fayda')) {
            return translated;
        }
    }
    return fieldName
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatFieldValue(field: any, record: RegisterRecord, t: any): string {
    let val = field?.value;
    if (!val && (field?.field_name === 'farmer_name' || field?.field_name === 'student_name' || field?.field_name === 'group_name')) {
        val = record.record_name ? record.record_name.split(' (')[0] : '';
    }
    if (!val) return '—';
    return t.has(val) ? t(val) : val;
}

export function RegisterRecordCard({ record, registerType, isEven }: RegisterRecordCardProps) {
    const t = useTranslations();
    const sortedFields = sortedDisplayFields(record.display_fields);

    return (
        <Link
            key={record.internal_record_id}
            href={`/register/${registerType}/${record.internal_record_id}`}
            className="block w-full"
        >
            <div className={`flex items-center gap-4 sm:gap-6 px-4 sm:px-6 lg:px-8 p-4 w-full overflow-hidden ${isEven
                ? 'bg-secondary-second/25'
                : 'bg-neutral-second'
                }`}>
                {record.record_image_url ? (
                    <img
                        src={record.record_image_url}
                        alt={record.record_name}
                        className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-md object-cover shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-secondary-third rounded-md shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-primary-second text-[16px] mb-0.5">
                        {record.record_name}
                    </h3>
                    <p className="text-[16px] text-neutral-first/70">
                        <span className="font-normal">{t('id')} :</span>{' '}
                        <span className="font-medium text-neutral-first">
                            {record.functional_record_id}
                        </span>
                    </p>
                </div>

                {[0, 2, 4].map((startIndex) => {
                    const firstField = sortedFields[startIndex];
                    const secondField = sortedFields[startIndex + 1];

                    return (
                        <div key={startIndex} className="flex-1 min-w-0">
                            {firstField ? (
                                <p className="text-[16px] text-neutral-first truncate">
                                    <span className="font-normal text-neutral-first/70">
                                        {formatFieldLabel(firstField.field_name, t)}:{' '}
                                    </span>
                                    <span className="font-medium">
                                        {formatFieldValue(firstField, record, t)}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-[16px] invisible">&nbsp;</p>
                            )}
                            {secondField ? (
                                <p className="text-[16px] text-neutral-first truncate">
                                    <span className="font-normal text-neutral-first/70">
                                        {formatFieldLabel(secondField.field_name, t)}:{' '}
                                    </span>
                                    <span className="font-medium">
                                        {formatFieldValue(secondField, record, t)}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-[16px] invisible">&nbsp;</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </Link>
    );
}
