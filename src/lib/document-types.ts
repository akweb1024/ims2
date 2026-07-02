/**
 * Single source of truth for HR document/letter template types.
 * Both the template editor dropdown and the HR_PRESETS emit these values;
 * keeping them here prevents the two template UIs from drifting (some values
 * used to be missing from one dropdown, silently changing a template's type).
 */
export const DOCUMENT_TYPES = [
    { value: 'OFFER_LETTER', label: 'Offer Letter' },
    { value: 'CONTRACT', label: 'Employment Contract' },
    { value: 'NDA', label: 'Non-Disclosure Agreement' },
    { value: 'RELIEVING_LETTER', label: 'Relieving Letter' },
    { value: 'NOC', label: 'No-Objection Certificate' },
    { value: 'POLICY', label: 'Company Policy' },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value'];
