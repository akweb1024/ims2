import {
  Users,
  Building2,
  BookOpen,
  CreditCard,
  Briefcase,
  Activity,
  Search,
  Plus,
  RefreshCw,
  FileText,
  PieChart,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react';

export interface SentinelAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'SYSTEM' | 'FINANCE' | 'HR' | 'RECRUITMENT' | 'OPERATIONS';
  shortcut?: string;
  handler: () => void | Promise<void>;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'EMPLOYEE' | 'CUSTOMER' | 'INSTITUTION' | 'JOURNAL' | 'ACCOUNT' | 'PROJECT';
  url: string;
  metadata?: Record<string, any>;
}

export const SYSTEM_ACTIONS: SentinelAction[] = [
  {
    id: 'goto-digital-twin',
    title: 'Digital Twin Center',
    description: 'Open real-time system surveillance',
    icon: Activity,
    category: 'SYSTEM',
    shortcut: 'G D',
    handler: () => { window.location.href = '/dashboard/digital-twin'; }
  },
  {
    id: 'goto-finance',
    title: 'Finance Ledger',
    description: 'Manage accounts and journal entries',
    icon: CreditCard,
    category: 'FINANCE',
    shortcut: 'G F',
    handler: () => { window.location.href = '/dashboard/finance'; }
  },
  {
    id: 'new-employee',
    title: 'Onboard Employee',
    description: 'Add a new member to the organization',
    icon: Users,
    category: 'HR',
    shortcut: 'N E',
    handler: () => { window.location.href = '/dashboard/hr-management/employees/new'; }
  },
  {
    id: 'post-journal',
    title: 'Post Journal Entry',
    description: 'Create a new double-entry record',
    icon: FileText,
    category: 'FINANCE',
    shortcut: 'P J',
    handler: () => { window.location.href = '/dashboard/finance/journal/new'; }
  },
  {
    id: 'run-ai-audit',
    title: 'Run AI System Audit',
    description: 'Execute Sentinel intelligence analysis',
    icon: ShieldCheck,
    category: 'SYSTEM',
    shortcut: 'R A',
    handler: async () => {
      // Logic for triggering background audit
      console.log('Triggering AI Audit...');
    }
  },
  {
    id: 'sync-razorpay',
    title: 'Sync Payments',
    description: 'Fetch latest Razorpay transactions',
    icon: RefreshCw,
    category: 'FINANCE',
    handler: () => { /* Logic */ }
  }
];

export const SEARCH_CATEGORIES = [
  { id: 'EMPLOYEE', label: 'Employees', icon: Users },
  { id: 'CUSTOMER', label: 'Customers', icon: Building2 },
  { id: 'JOURNAL', label: 'Journals', icon: BookOpen },
  { id: 'PROJECT', label: 'Projects', icon: Briefcase },
];
