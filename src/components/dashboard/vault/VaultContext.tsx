"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { deriveMasterKey, decryptPrivateKey, generateVaultRSAKeyPair, encryptPrivateKey, exportPublicKeySpki } from '@/lib/crypto-vault';

interface Keyring {
    exists: boolean;
    encryptedPrivKey?: string;
    publicKey?: string;
    salt?: string;
    iv?: string;
}

interface VaultContextType {
    isUnlocked: boolean;
    masterKey: CryptoKey | null;
    privateKey: CryptoKey | null;
    keyring: Keyring | null;
    unlockVault: (password: string) => Promise<boolean>;
    setupVault: (password: string) => Promise<boolean>;
    lockVault: () => void;
    isLoading: boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
    const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
    const [keyring, setKeyring] = useState<Keyring | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            fetchKeyring();
        }
    }, [session]);

    // Auto-lock after 15 minutes of inactivity
    useEffect(() => {
        if (!isUnlocked) return;

        let timeout: NodeJS.Timeout;
        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                lockVault();
                toast.error('Vault automatically locked due to inactivity');
            }, 15 * 60 * 1000);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);
        resetTimer();

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
        };
    }, [isUnlocked]);

    const fetchKeyring = async () => {
        try {
            const res = await fetch('/api/vault/keyring');
            const data = await res.json();
            setKeyring(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load vault status");
        } finally {
            setIsLoading(false);
        }
    };

    const unlockVault = async (password: string): Promise<boolean> => {
        if (!keyring || !keyring.exists || !session?.user?.email) return false;

        try {
            const { key } = await deriveMasterKey(password, session.user.email, keyring.salt);
            
            // Try to decrypt the private key to verify the password is correct
            const privKey = await decryptPrivateKey(key, keyring.encryptedPrivKey!, keyring.iv!);
            
            setMasterKey(key);
            setPrivateKey(privKey);
            setIsUnlocked(true);
            toast.success("Vault unlocked");
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Incorrect master password");
            return false;
        }
    };

    const setupVault = async (password: string): Promise<boolean> => {
        if (!session?.user?.email) return false;

        try {
            // 1. Derive master key (this generates a new salt)
            const { key, salt } = await deriveMasterKey(password, session.user.email);
            
            // 2. Generate RSA Key Pair for sharing
            const rsaKeyPair = await generateVaultRSAKeyPair();
            
            // 3. Encrypt the RSA Private Key with the new Master Key
            const { encryptedPrivKey, iv } = await encryptPrivateKey(key, rsaKeyPair.privateKey);
            
            // 4. Export the RSA Public Key
            const publicKeySpki = await exportPublicKeySpki(rsaKeyPair.publicKey);

            // 5. Save to server
            const res = await fetch('/api/vault/keyring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    encryptedPrivKey,
                    publicKey: publicKeySpki,
                    salt,
                    iv
                })
            });

            if (!res.ok) throw new Error("Failed to save keyring");

            // 6. Update local state
            await fetchKeyring();
            setMasterKey(key);
            setPrivateKey(rsaKeyPair.privateKey);
            setIsUnlocked(true);
            toast.success("Vault setup successfully!");
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Warning: Failed to setup vault. Try again.");
            return false;
        }
    };

    const lockVault = () => {
        setMasterKey(null);
        setPrivateKey(null);
        setIsUnlocked(false);
    };

    return (
        <VaultContext.Provider value={{ isUnlocked, masterKey, privateKey, keyring, unlockVault, setupVault, lockVault, isLoading }}>
            {children}
        </VaultContext.Provider>
    );
}

export const useVault = () => {
    const context = useContext(VaultContext);
    if (context === undefined) {
        throw new Error('useVault must be used within a VaultProvider');
    }
    return context;
};
