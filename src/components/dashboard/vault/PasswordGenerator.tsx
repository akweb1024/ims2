"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    onSelectPassword?: (password: string) => void;
}

export function generatePassword(length: number, useLower: boolean, useUpper: boolean, useNumbers: boolean, useSymbols: boolean): string {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    let chars = '';
    if (useLower) chars += lower;
    if (useUpper) chars += upper;
    if (useNumbers) chars += numbers;
    if (useSymbols) chars += symbols;

    if (!chars) return '';

    let password = '';
    // Require at least one of each selected type
    if (useLower) password += lower[Math.floor(Math.random() * lower.length)];
    if (useUpper) password += upper[Math.floor(Math.random() * upper.length)];
    if (useNumbers) password += numbers[Math.floor(Math.random() * numbers.length)];
    if (useSymbols) password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = password.length; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export function measureStrength(password: string): { score: number, label: string, color: string } {
    let score = 0;
    if (!password) return { score: 0, label: 'Empty', color: 'bg-secondary-200 dark:bg-secondary-800' };

    if (password.length > 8) score += 1;
    if (password.length > 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-danger-500' };
    if (score <= 4) return { score, label: 'Good', color: 'bg-warning-500' };
    return { score, label: 'Strong', color: 'bg-success-500' };
}

export default function PasswordGenerator({ onSelectPassword }: Props) {
    const [length, setLength] = useState(16);
    const [useLower, setUseLower] = useState(true);
    const [useUpper, setUseUpper] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);

    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = useCallback(() => {
        const p = generatePassword(length, useLower, useUpper, useNumbers, useSymbols);
        setPassword(p);
        setCopied(false);
    }, [length, useLower, useUpper, useNumbers, useSymbols]);

    useEffect(() => {
        handleGenerate();
    }, [handleGenerate]);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        toast.success("Password copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
        
        // Notify parent if used in a modal context
        if (onSelectPassword) {
            onSelectPassword(password);
        }
    };

    const strength = measureStrength(password);

    return (
        <div className="bg-secondary-50 dark:bg-secondary-800/50 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Password Generator</h4>
            
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg px-4 py-3 font-mono text-lg text-secondary-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap">
                    {password}
                </div>
                <button 
                    onClick={handleGenerate} 
                    className="p-3 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
                    title="Regenerate"
                >
                    <RefreshCw size={18} />
                </button>
                <button 
                    onClick={handleCopy} 
                    className="p-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors shadow-sm"
                    title="Copy Password"
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">Strength: {strength.label}</span>
                </div>
                <div className="flex gap-1 h-1.5 w-full">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-secondary-200 dark:bg-secondary-700'}`} />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Length</label>
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">{length}</span>
                    </div>
                    <input 
                        type="range" 
                        min="8" max="64" 
                        value={length} 
                        onChange={(e) => setLength(parseInt(e.target.value))}
                        className="w-full accent-primary-600"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer">
                        <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" disabled={!useLower && !useNumbers && !useSymbols} />
                        Uppercase (A-Z)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer">
                        <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" disabled={!useUpper && !useNumbers && !useSymbols} />
                        Lowercase (a-z)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer">
                        <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" disabled={!useUpper && !useLower && !useSymbols} />
                        Numbers (0-9)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300 cursor-pointer">
                        <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" disabled={!useUpper && !useLower && !useNumbers} />
                        Symbols (!@#$)
                    </label>
                </div>
            </div>
        </div>
    );
}
