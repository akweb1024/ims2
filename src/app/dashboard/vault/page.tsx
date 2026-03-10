import { Metadata } from 'next';
import VaultMain from '@/components/dashboard/vault/VaultMain';

export const metadata: Metadata = {
    title: 'Secure Web Vault | IMS',
    description: 'Zero-Knowledge Password Manager',
};

export default function VaultPage() {
    return <VaultMain />;
}
