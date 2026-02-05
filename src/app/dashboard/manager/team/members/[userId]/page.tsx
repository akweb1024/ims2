import { auth } from '@/lib/nextauth';
import { redirect } from 'next/navigation';

export default async function TeamMemberProfilePage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
    }

    // Redirect to the standardized HR employee profile
    redirect(`/dashboard/hr-management/employees/${userId}`);
}
