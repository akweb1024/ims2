import React from 'react';

const guides: Record<string, { title: string; subtitle: string; sections: { title: string; content: string }[] }> = {
    SUPER_ADMIN: {
        title: "⭐️ Super Admin Dashboard Guide",
        subtitle: "Full control over the entire multi-tenant system.",
        sections: [
            {
                title: "🏢 managing Companies",
                content: "Navigate to 'Operations > Companies' to onboarding new client organizations. You can set their subscription limits and manage their admin users."
            },
            {
                title: "👥 User Management",
                content: "Use 'Resources > User Directory' to invite new staff, assign roles (Admin, Manager, etc.), and control access. You can also 'Login As' any user to troubleshoot issues."
            },
            {
                title: "📜 System Logs & Data",
                content: "Monitor unauthorized access attempts and system errors in 'Insights > System Logs'. Use 'Data Hub' for bulk imports/exports."
            }
        ]
    },
    ADMIN: {
        title: "🛡️ Company Admin Guide",
        subtitle: "Manage your organization's resources and operations.",
        sections: [
            {
                title: "👨‍💼 Staff Management",
                content: "Invite managers and team leaders via the User Directory. Ensure everyone has the correct reporting lines."
            },
            {
                title: "📊 Financial Oversight",
                content: "Track 'Invoices' and 'Razorpay Revenue' under Insights. Ensure all incoming payments are reconciled."
            },
            {
                title: "🧩 HR Configuration",
                content: "Set up Holidays, Designations, and Jobs in the 'HR Management' section to ensure smooth operations."
            }
        ]
    },
    MANAGER: {
        title: "⚡ Manager Operational Guide",
        subtitle: "Oversee team performance and HR approvals.",
        sections: [
            {
                title: "✅ HR Approvals",
                content: "Check 'Leave Requests' and 'Attendance' daily. Your approval is required for staff leaves to be finalized."
            },
            {
                title: "📈 Performance Monitoring",
                content: "Review 'Work Reports' submitted by your team. Use the 'Productivity' tab to identify high performers."
            },
            {
                title: "🎯 Recruitment",
                content: "Manage the hiring pipeline in 'Recruitment'. Create job posts and schedule interviews for candidates."
            }
        ]
    },
    TEAM_LEADER: {
        title: "🚀 Team Leader Guide",
        subtitle: "Guide your team to success efficiently.",
        sections: [
            {
                title: "📋 Task Distribution",
                content: "Ensure your team members are submitting their 'Work Reports'. Review their daily output."
            },
            {
                title: "🤝 Customer Assignment",
                content: "Use 'Customers' to track leads assigned to your team. Monitor their followup status."
            }
        ]
    },
    EXECUTIVE: {
        title: "💼 Executive Handbook",
        subtitle: "Manage customers and drive subscriptions.",
        sections: [
            {
                title: "🙍‍♂️ Customer Management",
                content: "Add new Agencies/Institutions in the 'Customers' section. Keep their contact details updated."
            },
            {
                title: "🗓️ Follow Ups",
                content: "Check your 'Follow Ups' daily. The system will remind you of pending calls or emails."
            },
            {
                title: "🧾 Creating Subscriptions",
                content: "Go to a Customer Profile and click 'New Subscription'. Generate an Invoice and share the payment link."
            }
        ]
    },
    AGENCY: {
        title: "🏢 Agency Portal Guide",
        subtitle: "Manage your subscriptions and claims.",
        sections: [
            {
                title: "📦 Track Orders",
                content: "View all your active 'Subscriptions'. You can download invoices and track dispatch status in 'Logistics'."
            },
            {
                title: "💳 Payments",
                content: "View your payment history and outstanding invoices in the 'Invoices' section."
            }
        ]
    },
    INSTITUTION: {
        title: "🏛️ Institution Portal Guide",
        subtitle: "Access your library subscriptions.",
        sections: [
            {
                title: "📚 Journal Access",
                content: "Navigate to 'Journals' to view your subscribed content. You can also view dispatch tracking for physical copies."
            },
            {
                title: "🎫 Support",
                content: "Raise 'Support Tickets' if you have issues with delivery or online access."
            }
        ]
    },
    CUSTOMER: {
        title: "👤 Customer Dashboard Guide",
        subtitle: "Welcome to your personal dashboard.",
        sections: [
            {
                title: "📰 My Subscriptions",
                content: "View your active journal subscriptions and validity dates."
            },
            {
                title: "🧾 Invoices",
                content: "Download tax invoices for your purchases directly from the 'Invoices' tab."
            },
            {
                title: "🚚 Tracking",
                content: "Check the status of your physical shipments in the 'Logistics' view."
            }
        ]
    }
};

export default function RoleGuide({ role }: { role: string }) {
    const guide = guides[role] || guides['CUSTOMER'];

    return (
        <div className="card-premium p-8 bg-white border border-secondary-200">
            <div className="mb-8 border-b border-secondary-100 pb-6">
                <h2 className="text-3xl font-extrabold text-secondary-900 mb-2 font-primary">{guide.title}</h2>
                <p className="text-lg text-secondary-500">{guide.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guide.sections.map((section, i) => (
                    <div key={i} className="bg-secondary-50 rounded-2xl p-6 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-100 group">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary-600 font-bold text-lg mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            {i + 1}
                        </div>
                        <h3 className="text-lg font-bold text-secondary-900 mb-3">{section.title}</h3>
                        <p className="text-sm text-secondary-600 leading-relaxed">
                            {section.content}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                    <h4 className="font-bold text-primary-900">Need specific help?</h4>
                    <p className="text-sm text-primary-700 mt-1">
                        If you need functionality that isn&apos;t described here, please contact the System Administrator or raise a Support Ticket.
                    </p>
                </div>
            </div>
        </div>
    );
}
