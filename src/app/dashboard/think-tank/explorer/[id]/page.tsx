import ThinkTankPortal from '@/components/dashboard/think-tank/ThinkTankPortal';

export const dynamic = 'force-dynamic';

export default async function ThinkTankExplorerIdeaPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <ThinkTankPortal mode="explorer" ideaId={id} />;
}
