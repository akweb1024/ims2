import { useState } from 'react';
import { useCRMMutations } from '@/hooks/useCRM';
import ConversationChecklist from './ConversationChecklist';
import { calculatePredictions } from '@/lib/predictions';

interface CommunicationFormProps {
    customerId: string;
    previousFollowUpId?: string | null;
    onSuccess?: () => void;
}

export default function CommunicationForm({ customerId, previousFollowUpId, onSuccess }: CommunicationFormProps) {
    const [type, setType] = useState('COMMENT');
    const [loading, setLoading] = useState(false);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);

    const { createCommunication } = useCRMMutations();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validate checklist
        if (checkedItems.length === 0) {
            alert('Please check at least one item in the conversation checklist');
            return;
        }

        setLoading(true);

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        // Calculate predictions
        const predictions = calculatePredictions(checkedItems);

        const payload: any = {
            customerProfileId: customerId,
            previousFollowUpId,
            type: formData.get('type'),
            channel: formData.get('channel'),
            subject: formData.get('subject'),
            notes: formData.get('notes'),
            outcome: formData.get('outcome'),
            category: formData.get('category') || null,
            nextFollowUpDate: formData.get('nextFollowUpDate') || null,
            checklist: {
                checkedItems,
                ...predictions
            }
        };

        if (payload.type === 'CALL') {
            payload.duration = parseInt(formData.get('duration') as string) || 0;
            payload.recordingUrl = formData.get('recordingUrl');
        }

        try {
            await createCommunication.mutateAsync(payload);
            alert('Communication logged successfully!');
            form.reset();
            setType('COMMENT'); // Reset type
            setCheckedItems([]); // Reset checklist
            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            alert(err.message || 'Failed to log communication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {previousFollowUpId && (
                <div className="bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-lg text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>Replying to a scheduled follow-up task</span>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Type Selection */}
                <div className="md:col-span-2">
                    <label className="label">Interaction Type</label>
                    <div className="flex space-x-4">
                        {['COMMENT', 'EMAIL', 'CALL', 'INVOICE_SENT', 'CATALOGUE_SENT', 'MEETING'].map((t) => (
                            <label key={t} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    value={t}
                                    checked={type === t}
                                    onChange={(e) => setType(e.target.value)}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-secondary-700 capitalize">{t.replace('_', ' ').toLowerCase()}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="label">Channel</label>
                    <select name="channel" className="input" required>
                        <option>Email</option>
                        <option>Phone</option>
                        <option>WhatsApp</option>
                        <option>App Notification</option>
                        <option>In-Person</option>
                    </select>
                </div>

                <div>
                    <label className="label">Outcome</label>
                    <select name="outcome" className="input">
                        <option value="">Select outcome...</option>
                        <option>Interested</option>
                        <option>Follow-up required</option>
                        <option>Renewal confirmed</option>
                        <option>Complaint</option>
                        <option>Responded</option>
                        <option>No Answer</option>
                    </select>
                </div>

                {/* Conditional Fields based on Type */}
                {type === 'CALL' && (
                    <>
                        <div>
                            <label className="label">Duration (Seconds)</label>
                            <input type="number" name="duration" className="input" placeholder="e.g. 300" />
                        </div>
                        <div>
                            <label className="label">Recording URL</label>
                            <input type="url" name="recordingUrl" className="input" placeholder="https://..." />
                        </div>
                    </>
                )}

                {(type === 'INVOICE_SENT' || type === 'CATALOGUE_SENT') && (
                    <div className="md:col-span-2">
                        <label className="label">Reference ID (Invoice/Catalogue #)</label>
                        <input type="text" name="referenceId" className="input" placeholder="e.g. INV-2025-001" />
                    </div>
                )}

                <div className="md:col-span-2">
                    <label className="label">Subject</label>
                    <input type="text" name="subject" className="input" required placeholder="e.g. Renewal Discussion" />
                </div>

                <div className="md:col-span-2">
                    <label className="label">Message / Notes</label>
                    <textarea name="notes" className="input h-24" required placeholder="Details of the interaction..."></textarea>
                </div>

                <div>
                    <label className="label">Next Follow-up Date</label>
                    <input type="date" name="nextFollowUpDate" className="input" />
                </div>

                <div>
                    <label className="label">Expense Category (Optional)</label>
                    <select name="category" className="input">
                        <option value="">Select category...</option>
                        <option value="BANK_CHARGES">BANK CHARGES</option>
                        <option value="DESIGNING_EXPENSES">DESIGNING EXPENSES</option>
                        <option value="DIRECTOR_REMUNERATION">DIRECTOR&apos;S REMUNERATION</option>
                        <option value="EDITING_PUBLICATIONS_EXPENSES">EDITING & PUBLICATIONS EXPENSES</option>
                        <option value="INTERNET_WEBSITE_EXPENSES">INTERNET & WEBSITE EXPENSES</option>
                        <option value="LEGAL_PROFESSIONAL_EXPENSES">LEGAL & PROFESSIONAL EXPENSES</option>
                        <option value="MISC_EXPENSES">MISC. EXPENSES</option>
                        <option value="POWER_FUEL_EXPENSES">POWER & FUEL EXPENSES</option>
                        <option value="PRINTING_STATIONERY_EXPENSES">PRINTING & STATIONERY EXPENSES</option>
                        <option value="RENT_EXPENSES">RENT EXPENSES</option>
                        <option value="REPAIR_MAINTENANCE">REPAIR & MAINTENANCE</option>
                        <option value="ROUND_OFF">ROUND OFF</option>
                        <option value="SALARY_EXPENSES">SALARY EXPENSES</option>
                        <option value="SOFTWARE_EXPENSES">SOFTWARE EXPENSES</option>
                        <option value="STAFF_WELFARE">STAFF WELFARE</option>
                        <option value="TELEPHONE_INTERNET_EXPENSES">TELEPHONE & INTERNET EXPENSES</option>
                        <option value="CLUB_ACTIVITIES">CLUB ACTIVITIES</option>
                        <option value="OFFICE_EXPENSES">OFFICE EXPENSES</option>
                        <option value="OTHER">Other Expense</option>
                    </select>
                </div>

                {/* Conversation Checklist */}
                <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
                    <ConversationChecklist
                        checkedItems={checkedItems}
                        onChange={setCheckedItems}
                        showPredictions={true}
                        customerId={customerId}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary px-8"
                >
                    {loading ? 'Logging...' : 'Log Communication'}
                </button>
            </div>
        </form>
    );
}
