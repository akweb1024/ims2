import Link from 'next/link';
import { Home, BookOpen, LogIn } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-secondary-50 flex flex-col font-sans text-secondary-900">
            {/* Header */}
            <header className="bg-white border-b border-secondary-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                                <span className="text-white font-black text-lg tracking-tighter">S</span>
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-secondary-900">STM<span className="text-primary-600">Journals</span></span>
                        </Link>
                        
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/journals" className="text-sm font-bold text-secondary-600 hover:text-primary-600 transition-colors flex items-center gap-2">
                                <BookOpen size={16} /> Browse Journals
                            </Link>
                            <Link href="/verify" className="text-sm font-bold text-secondary-600 hover:text-primary-600 transition-colors">
                                Verify Certificate
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/login" className="btn btn-secondary text-xs px-4 py-2 flex items-center gap-2">
                            <LogIn size={14} /> Login
                        </Link>
                        <Link href="/register" className="btn btn-primary text-xs px-4 py-2">
                            Submit Manuscript
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-secondary-200 py-12 mt-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-secondary-400 text-sm font-medium">© {new Date().getFullYear()} STM Journals. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
