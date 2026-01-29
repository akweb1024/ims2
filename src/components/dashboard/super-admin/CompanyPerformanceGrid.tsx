import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Building } from "lucide-react";

interface CompanyStats {
    companyName: string;
    totalRevenue: number;
    status: string;
}

interface EmployeeStats {
    companyName: string;
    total: number;
}

export default function CompanyPerformanceGrid({ financials, employees }: { financials: CompanyStats[], employees: EmployeeStats[] }) {
    // Merge data
    const mergedData = financials.map(f => {
        const emp = employees.find(e => e.companyName === f.companyName);
        return {
            ...f,
            headcount: emp?.total || 0
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
                    <Building className="text-primary-600" size={20} />
                    Company Portfolio Performance
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mergedData.map((company, i) => (
                    <Card key={i} className="hover:border-primary-200 transition-colors group cursor-pointer">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-700 font-black text-lg mb-2 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    {company.companyName[0]}
                                </div>
                                <Badge variant={company.status === 'In Revenue' ? 'secondary' : 'outline'}
                                    className={company.status === 'In Revenue' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'text-secondary-500'}>
                                    {company.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-lg truncate" title={company.companyName}>{company.companyName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-dashed border-secondary-100 mt-2">
                                <div>
                                    <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">Revenue</p>
                                    <p className="font-bold text-secondary-900">
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(company.totalRevenue)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">Team Size</p>
                                    <p className="font-bold text-secondary-900">{company.headcount}</p>
                                </div>
                            </div>
                            <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-primary-600 flex items-center gap-1">
                                    View Details <ArrowRight size={12} />
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
