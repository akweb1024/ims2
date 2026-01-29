
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FinancialData {
    companyId: string;
    companyName: string;
    totalRevenue: number;
    status: string;
}

export default function FinancialsSection({ data }: { data: FinancialData[] }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Financial Overview</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Company</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="companyName" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="totalRevenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-auto max-h-[300px]">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Company</th>
                                        <th className="p-2 text-right">Revenue</th>
                                        <th className="p-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item) => (
                                        <tr key={item.companyId} className="border-b">
                                            <td className="p-2 font-medium">{item.companyName}</td>
                                            <td className="p-2 text-right">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.totalRevenue)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Badge variant={item.status === 'In Revenue' ? 'secondary' : 'destructive'}
                                                    className={item.status === 'In Revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {item.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
