'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import FocusableModal from '@/components/ui/FocusableModal';
import FormField from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface LMSAddParticipantDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function LMSAddParticipantDialog({
    isOpen,
    onClose,
    onSuccess,
}: LMSAddParticipantDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const { register, handleSubmit, formState: { errors }, reset } = useForm();

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            const response = await fetch('/api/lms/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add participant');
            }

            toast.success('Participant added successfully');
            reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FocusableModal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Participant"
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        label="Full Name"
                        name="name"
                        register={register}
                        required={true}
                        error={errors.name as any}
                        placeholder="John Doe"
                    />
                    <FormField
                        label="Email Address"
                        name="email"
                        type="email"
                        register={register}
                        required={true}
                        error={errors.email as any}
                        placeholder="john@example.com"
                    />
                    <FormField
                        label="Mobile Number"
                        name="mobileNumber"
                        type="tel"
                        register={register}
                        error={errors.mobileNumber as any}
                        placeholder="+91 ..."
                    />
                    <FormField
                        label="Workshop Title"
                        name="workshopTitle"
                        register={register}
                        required={true}
                        error={errors.workshopTitle as any}
                        placeholder="e.g. Machine Learning Workshop"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                    <FormField
                        label="Course Fee"
                        name="courseFee"
                        type="number"
                        register={register}
                        defaultValue={0}
                        placeholder="0.00"
                    />
                    <FormField
                        label="Payable Amount"
                        name="payableAmount"
                        type="number"
                        register={register}
                        defaultValue={0}
                        placeholder="0.00"
                    />
                    <FormField
                        label="Payment Status"
                        name="paymentStatus"
                        type="select"
                        register={register}
                        options={[
                            { value: 'PENDING', label: 'Pending' },
                            { value: 'SUCCESS', label: 'Success' },
                            { value: 'FAILED', label: 'Failed' },
                        ]}
                        defaultValue="PENDING"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <FormField
                        label="Profession"
                        name="profession"
                        register={register}
                    />
                    <FormField
                        label="Designation"
                        name="designation"
                        register={register}
                    />
                    <FormField
                        label="Current Affiliation"
                        name="currentAffiliation"
                        register={register}
                        className="md:col-span-2"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={submitting}
                    >
                        Create Participant
                    </Button>
                </div>
            </form>
        </FocusableModal>
    );
}
