import Link from 'next/link';

export default function Home() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="gradient-primary bg-primary-700 min-h-screen flex items-center relative overflow-hidden">
                {/* Animated Background Shapes */}
                <div className="absolute inset-0 overflow-hidden opacity-10">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse-subtle"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse-subtle delay-1000"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-block mb-4">
                            <span className="badge bg-white/20 text-white text-sm px-6 py-2 backdrop-blur-md">
                                Welcome to STM Customer Management
                            </span>
                        </div>

                        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 animate-fade-in">
                            Streamline Your
                            <span className="block mt-2">Journal Subscriptions</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto animate-slide-in">
                            A centralized platform for managing customers, subscriptions, sales channels, and analytics—all in one place.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                            <Link
                                href="/register"
                                className="btn bg-white text-primary-700 hover:bg-secondary-50 shadow-premium-lg text-lg px-8 py-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Register Now
                            </Link>

                            <Link
                                href="/login"
                                className="btn border-2 border-white text-white hover:bg-white hover:text-primary-700 text-lg px-8 py-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-4">
                            Everything You Need
                        </h2>
                        <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
                            Replace spreadsheets and manual tracking with a single source of truth
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="card-premium group hover:scale-105 transition-transform duration-300">
                            <div className="stat-card-icon gradient-primary text-white mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Customer Management</h3>
                            <p className="text-secondary-600">
                                Self-registration and profile management for individuals, institutions, and agencies
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="card-premium group hover:scale-105 transition-transform duration-300">
                            <div className="stat-card-icon bg-success-500 text-white mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Subscription Tracking</h3>
                            <p className="text-secondary-600">
                                Complete lifecycle management from creation to renewal with automated reminders
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="card-premium group hover:scale-105 transition-transform duration-300">
                            <div className="stat-card-icon bg-warning-500 text-white mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Sales Analytics</h3>
                            <p className="text-secondary-600">
                                Track performance across direct and agency channels with powerful dashboards
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="card-premium group hover:scale-105 transition-transform duration-300">
                            <div className="stat-card-icon bg-purple-500 text-white mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Communication History</h3>
                            <p className="text-secondary-600">
                                Log all customer interactions, follow-ups, and maintain complete communication records
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="card-premium group hover:scale-105 transition-transform duration-300">
                            <div className="stat-card-icon bg-indigo-500 text-white mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Agency Management</h3>
                            <p className="text-secondary-600">
                                Manage agency partnerships, track commissions, and monitor territory performance
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="card-premium group hover:scale-105 transition-transform duration-300">
                            <div className="stat-card-icon gradient-secondary text-white mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-secondary-900 mb-2">Role-Based Access</h3>
                            <p className="text-secondary-600">
                                Secure RBAC system with granular permissions for all user types and workflows
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* User Roles Section */}
            <section className="py-24 bg-secondary-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-4">
                            Built for Every Role
                        </h2>
                        <p className="text-xl text-secondary-600 max-w-2xl mx-auto">
                            Tailored experiences for customers, sales teams, agencies, and administrators
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        <div className="bg-white rounded-lg p-6 border-l-4 border-primary-500 shadow-md hover:shadow-lg transition-shadow">
                            <h4 className="font-bold text-lg text-secondary-900 mb-2">Customers</h4>
                            <p className="text-secondary-600 text-sm">Self-service registration, profile management, and subscription tracking</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 border-l-4 border-success-500 shadow-md hover:shadow-lg transition-shadow">
                            <h4 className="font-bold text-lg text-secondary-900 mb-2">Sales Executives</h4>
                            <p className="text-secondary-600 text-sm">Lead management, subscription creation, and performance dashboards</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 border-l-4 border-warning-500 shadow-md hover:shadow-lg transition-shadow">
                            <h4 className="font-bold text-lg text-secondary-900 mb-2">Agencies</h4>
                            <p className="text-secondary-600 text-sm">Client management, subscription submissions, and commission tracking</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500 shadow-md hover:shadow-lg transition-shadow">
                            <h4 className="font-bold text-lg text-secondary-900 mb-2">Managers</h4>
                            <p className="text-secondary-600 text-sm">Team oversight, performance reviews, and strategic analytics</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 border-l-4 border-indigo-500 shadow-md hover:shadow-lg transition-shadow">
                            <h4 className="font-bold text-lg text-secondary-900 mb-2">Finance/Admin</h4>
                            <p className="text-secondary-600 text-sm">Payment reconciliation, invoicing, and pricing management</p>
                        </div>

                        <div className="bg-white rounded-lg p-6 border-l-4 border-secondary-700 shadow-md hover:shadow-lg transition-shadow">
                            <h4 className="font-bold text-lg text-secondary-900 mb-2">Super Admin</h4>
                            <p className="text-secondary-600 text-sm">Full system access, user management, and configuration</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 gradient-primary relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to Get Started?
                    </h2>
                    <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
                        Join hundreds of institutions already managing their subscriptions efficiently
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/register"
                            className="btn bg-white text-primary-700 hover:bg-secondary-50 shadow-premium-lg text-lg px-8 py-4"
                        >
                            Create Account
                        </Link>

                        <Link
                            href="/demo"
                            className="btn border-2 border-white text-white hover:bg-white hover:text-primary-700 text-lg px-8 py-4"
                        >
                            Request Demo
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-secondary-900 py-12">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-white font-bold text-lg mb-4">STM Customer</h3>
                            <p className="text-secondary-400 text-sm">
                                Centralized journal subscription management platform
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-secondary-400 text-sm">
                                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                                <li><Link href="/demo" className="hover:text-white transition-colors">Demo</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-secondary-400 text-sm">
                                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-secondary-400 text-sm">
                                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-secondary-400 text-sm">
                        <p>&copy; 2025 STM Customer Management System. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
