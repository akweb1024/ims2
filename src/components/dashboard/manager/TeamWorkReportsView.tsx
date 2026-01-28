'use client';

import React from 'react';
import { useWorkReports, useWorkReportMutations } from '@/hooks/useHR';
import WorkReportValidator from '@/components/dashboard/hr/WorkReportValidator';
import { toast } from 'react-hot-toast';

const TeamWorkReportsView: React.FC = () => {
    const { data: reports = [], isLoading: loading } = useWorkReports({ status: 'PENDING' });
    const { updateStatus } = useWorkReportMutations();

    const handleApprove = async (
        id: string,
        approvedTaskIds: string[],
        rejectedTaskIds: string[],
        managerComment: string,
        managerRating: number,
        evaluation?: any
    ) => {
        try {
            await updateStatus.mutateAsync({
                id,
                status: 'APPROVED',
                approvedTaskIds,
                rejectedTaskIds,
                managerComment,
                managerRating,
                evaluation
            });
            toast.success('Report approved and validated successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update report');
        }
    };

    const handleAddComment = async (id: string, content: string) => {
        // Implement if needed, or leave as placeholder if API not ready for standalone comments in this view
        toast('Comment feature coming soon');
    };

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Scanning team submissions...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Work Report Validation</h2>
                <p className="text-secondary-500 font-medium">Verify and certify daily work submissions from your team</p>
            </div>

            {reports.length === 0 ? (
                <div className="card-premium p-20 text-center text-secondary-400 font-bold italic bg-white border border-secondary-100">
                    Zero pending work reports. Your team is up to date!
                </div>
            ) : (
                <WorkReportValidator
                    reports={reports}
                    onApprove={handleApprove}
                    onAddComment={handleAddComment}
                />
            )}
        </div>
    );
};

export default TeamWorkReportsView;
