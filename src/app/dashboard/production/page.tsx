import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus } from 'lucide-react';
import ProductionTabs from './ProductionTabs';
import ProductionHubSkeleton from './ProductionHubSkeleton';

async function getProductionData() {
    const [journalsRes, articlesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/journals`, {
            cache: 'no-store'
        }),
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/editorial/articles`, {
            cache: 'no-store'
        })
    ]);

    const journals = journalsRes.ok ? await journalsRes.json() : [];
    const articles = articlesRes.ok ? await articlesRes.json() : [];

    return { journals, articles };
}

async function ProductionData() {
    const { journals, articles } = await getProductionData();

    return <ProductionTabs journals={journals} articles={articles} />;
}

export default async function ProductionPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-secondary-900 tracking-tight">Production Hub</h1>
                        <p className="text-secondary-500 font-medium">Manage journals, manuscripts, and production cycles.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 bg-secondary-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-secondary-200">
                            <Plus size={20} /> New Manuscript
                        </button>
                    </div>
                </div>

                {/* Production Data with Suspense */}
                <Suspense fallback={<ProductionHubSkeleton />}>
                    <ProductionData />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
