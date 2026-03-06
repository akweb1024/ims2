'use client';

import React from 'react';
import Link from 'next/link';

// ─── CRM Page Shell ──────────────────────────────────────────────────────────
// Provides a consistent layout wrapper for all CRM pages with:
// - Standard page header with title, subtitle, and action buttons
// - Breadcrumb path
// - Consistent spacing and max-width
interface CRMPageShellProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    breadcrumb?: { label: string; href?: string }[];
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function CRMPageShell({ title, subtitle, icon, breadcrumb, actions, children, className = '' }: CRMPageShellProps) {
    return (
        <div className={`crm-page space-y-6 ${className}`}>
            {/* Breadcrumb */}
            {breadcrumb && breadcrumb.length > 0 && (
                <nav className="flex items-center gap-1.5 text-xs text-secondary-400 font-medium">
                    {breadcrumb.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-secondary-300">/</span>}
                            {crumb.href ? (
                                <Link href={crumb.href} className="hover:text-primary-600 transition-colors">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-secondary-600">{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h1 className="crm-page-title">{title}</h1>
                        {subtitle && <p className="crm-page-subtitle">{subtitle}</p>}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-3 shrink-0">
                        {actions}
                    </div>
                )}
            </div>

            {/* Content */}
            {children}
        </div>
    );
}

// ─── CRM Filter Bar ───────────────────────────────────────────────────────────
// Consistent filter + search bar used across all CRM list pages
interface CRMFilterBarProps {
    children: React.ReactNode;
    className?: string;
}

export function CRMFilterBar({ children, className = '' }: CRMFilterBarProps) {
    return (
        <div className={`crm-filter-bar ${className}`}>
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
                {children}
            </div>
        </div>
    );
}

// ─── CRM Search Input ─────────────────────────────────────────────────────────
interface CRMSearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}

export function CRMSearchInput({ value, onChange, placeholder = 'Search...', className = '' }: CRMSearchInputProps) {
    return (
        <div className={`crm-search-wrapper flex-1 min-w-[220px] ${className}`}>
            <svg className="crm-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                className="input crm-search-input"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

// ─── CRM Table ────────────────────────────────────────────────────────────────
interface CRMTableProps {
    children: React.ReactNode;
    className?: string;
}

export function CRMTable({ children, className = '' }: CRMTableProps) {
    return (
        <div className={`crm-card overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="crm-table">
                    {children}
                </table>
            </div>
        </div>
    );
}

// ─── CRM Table Empty State ────────────────────────────────────────────────────
interface CRMTableEmptyProps {
    icon?: React.ReactNode;
    message?: string;
    action?: React.ReactNode;
    colSpan?: number;
    className?: string;
}

export function CRMTableEmpty({ icon = '📋', message = 'No records found', action, colSpan = 8, className = '' }: CRMTableEmptyProps) {
    return (
        <tr>
            <td colSpan={colSpan} className={`py-16 text-center ${className}`}>
                <div className="flex flex-col items-center gap-3">
                    <div className="text-5xl opacity-40 flex items-center justify-center">{icon}</div>
                    <p className="text-secondary-500 font-medium">{message}</p>
                    {action}
                </div>
            </td>
        </tr>
    );
}

// ─── CRM Table Loading ────────────────────────────────────────────────────────
interface CRMTableLoadingProps {
    rows?: number;
    colSpan?: number;
    className?: string;
}

export function CRMTableLoading({ rows = 5, colSpan = 8, className = '' }: CRMTableLoadingProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b border-secondary-50">
                    <td colSpan={colSpan} className="px-6 py-4">
                        <div className="h-4 bg-secondary-100 rounded-full animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    </td>
                </tr>
            ))}
        </>
    );
}

// ─── CRM Table Error ──────────────────────────────────────────────────────────
interface CRMTableErrorProps {
    message: string;
    onRetry?: () => void;
    colSpan?: number;
    className?: string;
}

export function CRMTableError({ message, onRetry, colSpan = 8, className = '' }: CRMTableErrorProps) {
    return (
        <tr>
            <td colSpan={colSpan} className={`py-16 text-center ${className}`}>
                <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">⚠️</span>
                    <p className="text-secondary-500 font-medium">{message}</p>
                    {onRetry && (
                        <button onClick={onRetry} className="btn btn-secondary text-sm py-2 px-4">
                            Try Again
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ─── CRM Pagination ───────────────────────────────────────────────────────────
interface CRMPaginationProps {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
    entityName?: string;
    className?: string;
}

export function CRMPagination({ 
    page, totalPages, total, limit, onPageChange, entityName = 'records', className = '' 
}: CRMPaginationProps) {
    if (total === 0) return null;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className={`crm-pagination ${className}`}>
            <p className="crm-pagination-info">
                Showing <span className="font-semibold text-secondary-700">{from}</span>–
                <span className="font-semibold text-secondary-700">{to}</span> of{' '}
                <span className="font-semibold text-secondary-700">{total}</span> {entityName}
            </p>
            <div className="flex items-center gap-2">
                <button
                    className="crm-pagination-btn"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    ← Previous
                </button>
                <span className="text-xs font-medium text-secondary-500 px-1">{page} / {totalPages}</span>
                <button
                    className="crm-pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

// ─── CRM Badge ────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'primary' | 'secondary' | 'info' | 'purple';

interface CRMBadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    dot?: boolean;
    className?: string;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
    success: 'bg-success-50 text-success-700 border border-success-200',
    warning: 'bg-warning-50 text-warning-700 border border-warning-200',
    danger: 'bg-danger-50 text-danger-700 border border-danger-200',
    primary: 'bg-primary-50 text-primary-700 border border-primary-200',
    secondary: 'bg-secondary-100 text-secondary-600 border border-secondary-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
};

export function CRMBadge({ variant = 'secondary', children, dot, className = '' }: CRMBadgeProps) {
    return (
        <span className={`crm-badge ${BADGE_VARIANTS[variant]} ${className}`}>
            {dot && <span className="w-1.5 h-1.5 rounded-full bg-current inline-block mr-1" />}
            {children}
        </span>
    );
}

// ─── CRM Stats Card ───────────────────────────────────────────────────────────
interface CRMStatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    trend?: { value: number | string; label?: string; isPositive?: boolean };
    accent?: string;
    className?: string;
    isCurrency?: boolean;
    currencyCode?: string;
    children?: React.ReactNode;
}

export function CRMStatCard({ 
    label, value, icon, trend, accent = 'bg-primary-50 text-primary-600', className = '',
    isCurrency, currencyCode = 'INR', children 
}: CRMStatCardProps) {
    const isPos = trend?.isPositive ?? (typeof trend?.value === 'number' ? trend.value >= 0 : true);
    
    // Simple helper for symbol in shell
    const getSym = (c: string) => {
        if (c === 'INR') return '₹';
        if (c === 'USD') return '$';
        return c + ' ';
    };

    const displayValue = isCurrency && typeof value === 'number' 
        ? `${getSym(currencyCode)}${value.toLocaleString()}`
        : value;
        
    return (
        <div className={`crm-card p-5 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-bold text-secondary-900">{displayValue}</p>
                    {trend && (
                        <p className={`text-xs font-medium mt-1 ${isPos ? 'text-success-600' : 'text-danger-600'}`}>
                            {typeof trend.value === 'number' && (trend.value >= 0 ? '↑ ' : '↓ ')}
                            {typeof trend.value === 'number' ? Math.abs(trend.value) + '%' : trend.value} {trend.label || ''}
                        </p>
                    )}
                    {children}
                </div>
                {icon && (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── CRM Action Button Row ────────────────────────────────────────────────────
// Standardised icon-button actions at end of table rows
interface CRMRowActionProps {
    href?: string;
    onClick?: () => void;
    title?: string;
    variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning' | 'secondary' | 'ghost';
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
}

const ACTION_CLASSES: Record<string, string> = {
    default: 'crm-row-action',
    primary: 'crm-row-action text-primary-600 hover:bg-primary-50',
    danger: 'crm-row-action text-danger-500 hover:bg-danger-50',
    success: 'crm-row-action text-success-600 hover:bg-success-50',
    warning: 'crm-row-action text-warning-600 hover:bg-warning-50',
    secondary: 'crm-row-action text-secondary-600 hover:bg-secondary-50',
    ghost: 'crm-row-action hover:bg-secondary-50 opacity-60 hover:opacity-100',
};

export function CRMRowAction({ href, onClick, title, variant = 'default', children, disabled, className = '' }: CRMRowActionProps) {
    const cls = `${ACTION_CLASSES[variant]} ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${className}`;
    if (href) {
        return (
            <Link href={href} className={cls} title={title}>
                {children}
            </Link>
        );
    }
    return (
        <button onClick={onClick} className={cls} title={title} disabled={disabled}>
            {children}
        </button>
    );
}

// ─── CRM Modal Wrapper ────────────────────────────────────────────────────────
interface CRMModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    maxWidth?: string;
    className?: string;
}

export function CRMModal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg', className = '' }: CRMModalProps) {
    if (!open) return null;
    return (
        <div className={`crm-modal-overlay ${className}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`crm-modal-panel ${maxWidth}`}>
                <div className="crm-modal-header">
                    <div>
                        <h3 className="crm-modal-title">{title}</h3>
                        {subtitle && <p className="crm-modal-subtitle">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="crm-modal-close" aria-label="Close">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="crm-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
