'use client';

export default function LogisticsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-secondary-900">Dispatch & Logistics</h1>
            <div className="card-premium p-10 text-center">
                <div className="text-6xl mb-4">🚚</div>
                <h2 className="text-xl font-bold text-secondary-900">Logistics Management Module</h2>
                <p className="text-secondary-500 mt-2">Manage dispatch orders, couriers, and shipment tracking here.</p>
                <div className="mt-8 flex justify-center gap-4">
                    <button className="btn btn-primary">Create Dispatch Order</button>
                    <button className="btn btn-secondary">Manage Couriers</button>
                </div>
            </div>
        </div>
    );
}
