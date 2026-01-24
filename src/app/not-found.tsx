import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Glassmorphism Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold mb-4">
                            STM
                        </div>
                        <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                            Page Not Found
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
                        </p>
                    </div>

                    {/* Illustration */}
                    <div className="flex justify-center mb-8">
                        <div className="text-8xl">🔍</div>
                    </div>

                    {/* Navigation Options */}
                    <div className="space-y-4">
                        <Link
                            href="/dashboard"
                            className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 text-center shadow-lg"
                        >
                            Go to Dashboard
                        </Link>

                        <Link
                            href="/"
                            className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 text-center"
                        >
                            Back to Home
                        </Link>
                    </div>

                    {/* Help Text */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <p className="text-center text-sm text-gray-500">
                            Need help? Contact our support team at{' '}
                            <a href="mailto:support@stmcustomer.com" className="text-blue-600 hover:text-blue-700 font-medium">
                                support@stmcustomer.com
                            </a>
                        </p>
                    </div>

                    {/* Common Links */}
                    <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
                        <Link href="/dashboard/customers" className="text-blue-600 hover:text-blue-700 hover:underline">
                            Customers
                        </Link>
                        <span className="text-gray-300">•</span>
                        <Link href="/dashboard/journals" className="text-blue-600 hover:text-blue-700 hover:underline">
                            Journals
                        </Link>
                        <span className="text-gray-300">•</span>
                        <Link href="/dashboard/hr-management" className="text-blue-600 hover:text-blue-700 hover:underline">
                            HR Management
                        </Link>
                        <span className="text-gray-300">•</span>
                        <Link href="/dashboard/finance" className="text-blue-600 hover:text-blue-700 hover:underline">
                            Finance
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
