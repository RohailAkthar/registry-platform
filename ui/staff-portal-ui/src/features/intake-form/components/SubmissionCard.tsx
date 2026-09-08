'use client';

import { Link } from '@/i18n/navigation';
import { KeyValue } from '@/components/ui/KeyValue';
import { IntakeFormSubmission } from '../types/intake-form';
import { useTranslations } from 'next-intl';

interface IntakeFormSubmissionCardProps {
    submission: IntakeFormSubmission;
    registerType: string;
}

const FRIENDLY_LABELS: Record<string, string> = {
    household_head_name: 'Head Name',
    household_head_person_id: 'Head Aadhaar ID',
    headship_type: 'Headship',
    size_total: 'Members',
    zone_subcity_code: 'District',
    woreda_code: 'Block / Anchal',
    kebele_code: 'Village',
    dwelling_type: 'Dwelling Type',
    tenure_status: 'Tenure Status',
    address_line_1: 'Address',
};

function formatFieldValue(val: string): string {
    if (!val) return '';
    if (val.includes('_')) {
        return val
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    }
    return val;
}

export function IntakeFormSubmissionCard({ submission, registerType }: IntakeFormSubmissionCardProps) {
    const t = useTranslations();

    // Filter only fields that have actual values
    const validDisplayFields = (submission.display_fields || []).filter(
        (f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== ''
    );

    const half = Math.ceil(validDisplayFields.length / 2);
    const col3Fields = validDisplayFields.slice(0, half);
    const col4Fields = validDisplayFields.slice(half);

    const getLabel = (fieldName: string) => {
        if (FRIENDLY_LABELS[fieldName]) return FRIENDLY_LABELS[fieldName];
        if (t.has(fieldName)) return t(fieldName);
        return fieldName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    return (
        <Link
            href={`/intake-form/${registerType}/submission/${submission.submission_id}`}
            className="group block w-full"
        >
            <div className="rounded-[10px] bg-neutral-second px-10 py-8 shadow-sm transition-shadow duration-200 group-hover:shadow-md border border-secondary-second/40 hover:border-primary-first/30">
                <div className="flex items-center justify-between mb-4">
                    <h3
                        className="text-[20px] font-semibold leading-snug tracking-tight text-primary-second line-clamp-2 md:text-[22px]"
                        title={submission.record_name ?? undefined}
                    >
                        {submission.record_name ?? '—'}
                    </h3>
                    <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                            submission.approval_status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : submission.approval_status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                        {submission.approval_status}
                    </span>
                </div>

                <div className="grid grid-cols-4 items-stretch gap-6 text-[14px] text-neutral-first/60">
                    {/* Column 1: Core System IDs & Status */}
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="flex flex-1 flex-col space-y-1.5">
                            <KeyValue label={t('submission_id')} value={submission.submission_id} />
                            <KeyValue label={t('draft_status')} value={submission.draft_status} />
                            <KeyValue label={t('approval_status')} value={submission.approval_status} />
                        </div>
                    </div>

                    {/* Column 2: Audit & Timestamps */}
                    <div className="space-y-4">
                        <div className="space-y-1.5 border-l-2 border-secondary-second pl-6">
                            <KeyValue label={t('created_by') || 'Created By'} value={submission.created_by} />
                            {(submission as any).created_at && (
                                <KeyValue
                                    label="Created On"
                                    value={new Date((submission as any).created_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                />
                            )}
                        </div>
                    </div>

                    {/* Column 3: Important Demographics (Head Name, Aadhaar, Headship, Members) */}
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="flex flex-1 flex-col space-y-1.5 border-l-2 border-secondary-second pl-6">
                            {col3Fields.length > 0 ? (
                                col3Fields.map((field) => (
                                    <KeyValue
                                        key={field.field_name}
                                        label={getLabel(field.field_name)}
                                        value={formatFieldValue(String(field.value))}
                                    />
                                ))
                            ) : (
                                <span className="text-xs text-secondary-third italic">No demographic details</span>
                            )}
                        </div>
                    </div>

                    {/* Column 4: Location & Housing (District, Block, Village, Dwelling) */}
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="flex flex-1 flex-col space-y-1.5 border-l-2 border-secondary-second pl-6">
                            {col4Fields.length > 0 ? (
                                col4Fields.map((field) => (
                                    <KeyValue
                                        key={field.field_name}
                                        label={getLabel(field.field_name)}
                                        value={formatFieldValue(String(field.value))}
                                    />
                                ))
                            ) : (
                                <span className="text-xs text-secondary-third italic">No location details</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
