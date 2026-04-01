'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowUpDown, Filter, X, User, MapPin, Briefcase, Mail, Phone, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import LMSAddParticipantDialog from './LMSAddParticipantDialog';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`
      flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background 
      file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground 
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
      disabled:cursor-not-allowed disabled:opacity-50
      ${className}
    `}
  />
);

interface Participant {
  id: string;
  pid: string;
  workshopTitle: string | null;
  name: string;
  email: string;
  mobileNumber: string | null;
  currentAffiliation: string | null;
  profession: string | null;
  designation: string | null;
  address: string | null;
  state: string | null;
  country: string | null;
  pinCode: string | null;
  gstVatNo: string | null;
  courseFee: number | null;
  hasCoupon: boolean;
  couponCode: string | null;
  payableAmount: number | null;
  otherCurrency: string | null;
  referralSource: string | null;
  paymentStatus: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  learningMode: string | null;
  category: string | null;
  createdAt: string;
  invoices?: { id: string; invoiceNumber: string }[];
}

const formatCurrency = (amount: number | null | undefined, currency?: string | null) => {
  if (amount == null) return '0';
  
  if (currency && currency.toUpperCase() !== 'INR' && currency.trim() !== '') {
    const sym = currency.toUpperCase();
    if (sym === 'USD') return `$${amount.toLocaleString('en-US')}`;
    if (sym === 'EUR') return `€${amount.toLocaleString('de-DE')}`;
    if (sym === 'GBP') return `£${amount.toLocaleString('en-GB')}`;
    return `${sym} ${amount.toLocaleString('en-US')}`; // Fallback for unmatched currencies
  }
  
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function LMSParticipantsView() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uniqueWorkshops, setUniqueWorkshops] = useState<string[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState<{id: string, num: string} | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchParticipants();
  }, [search, workshopFilter, statusFilter]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (workshopFilter !== 'all') params.append('workshop', workshopFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/lms/participants?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch participants');
      const data = await res.json();
      setParticipants(data);

      // Extract unique workshops just once or continually based on the full list?
      // For simplicity, we extract from current data, but normally we'd fetch filters separately
      if (workshopFilter === 'all' && search === '' && statusFilter === 'all') {
        const workshops = Array.from(new Set(data.map((p: Participant) => p.workshopTitle).filter(Boolean))) as string[];
        setUniqueWorkshops(workshops);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (participantId: string) => {
    setGeneratingInvoice(true);
    setLastGeneratedInvoice(null);
    try {
      const res = await fetch(`/api/lms/participants/${participantId}/invoice`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setLastGeneratedInvoice({ id: data.invoiceId, num: data.invoiceNumber });
        // Refresh participants to show updated invoice status if needed
        fetchParticipants();
      } else {
        alert(data.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error(error);
      alert('Error generating invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registered Participants</h2>
        <div className="flex bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg items-center gap-2">
           <Badge variant="default" className="bg-blue-600">External</Badge>
           <span className="text-sm text-blue-800 dark:text-blue-300">Nano School Registrations</span>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Participant
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1a1c23] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            type="text" 
            placeholder="Search name, email, or mobile..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select 
          value={workshopFilter}
          onChange={(e) => setWorkshopFilter(e.target.value)}
          className="h-10 px-3 py-2 rounded-md border border-input bg-background dark:bg-[#1a1c23] dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Workshops/Courses</option>
          {uniqueWorkshops.map((ws) => (
            <option key={ws} value={ws}>{ws}</option>
          ))}
        </select>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 py-2 rounded-md border border-input bg-background dark:bg-[#1a1c23] dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-[#13151a] dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Participant</th>
                <th className="px-6 py-4 font-medium">Workshop / Course</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Registered Date</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-gray-500">Loading participants...</p>
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No participants found matching your filters.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                        <span className="text-xs text-gray-500">{p.email}</span>
                        {p.mobileNumber && <span className="text-xs text-gray-500">{p.mobileNumber}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white font-medium">{p.workshopTitle || 'N/A'}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">{p.category || 'General'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(p.payableAmount, p.otherCurrency)}
                        </span>
                        {p.hasCoupon && p.couponCode && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 inline-block mt-1">
                            {p.couponCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(p.paymentStatus)}`}>
                        {p.paymentStatus || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {format(new Date(p.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedParticipant(p)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Side Drawer Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedParticipant(null)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#1a1c23] h-full shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#13151a]">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Participant Details</h3>
              <button 
                onClick={() => setSelectedParticipant(null)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold shrink-0">
                  {selectedParticipant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedParticipant.name}</h4>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {selectedParticipant.designation || 'Student'} at {selectedParticipant.currentAffiliation || 'N/A'}
                  </p>
                  <span className={`mt-2 px-2.5 py-0.5 text-xs font-medium rounded-full border inline-block ${getStatusColor(selectedParticipant.paymentStatus)}`}>
                    {selectedParticipant.paymentStatus || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h5 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Contact Information</h5>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${selectedParticipant.email}`} className="text-blue-600 hover:underline">{selectedParticipant.email}</a>
                  </div>
                  {selectedParticipant.mobileNumber && (
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${selectedParticipant.mobileNumber}`} className="text-blue-600 hover:underline">{selectedParticipant.mobileNumber}</a>
                    </div>
                  )}
                  {selectedParticipant.address && (
                    <div className="flex justify-start items-start gap-3 mt-1 text-sm text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span>{selectedParticipant.address}</span>
                        <span>{selectedParticipant.state}, {selectedParticipant.country} - {selectedParticipant.pinCode}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Registration details */}
              <div>
                <h5 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Registration Details</h5>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Program</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right max-w-[200px]">{selectedParticipant.workshopTitle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Category / Mode</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedParticipant.category} / {selectedParticipant.learningMode}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Registration Date</span>
                    <span className="font-medium text-gray-900 dark:text-white">{format(new Date(selectedParticipant.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Source</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedParticipant.referralSource || 'Direct'}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500">Form PID</span>
                    <span className="font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-900 px-2 py-0.5 border rounded shrink-0">{selectedParticipant.pid}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h5 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Payment Info</h5>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-500">Base Fee</span>
                    <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(selectedParticipant.courseFee, selectedParticipant.otherCurrency)}</span>
                  </div>
                  
                  {selectedParticipant.hasCoupon && (
                    <div className="flex justify-between text-sm items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500 flex items-center gap-2">
                        Coupon Applied
                        <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-mono">{selectedParticipant.couponCode}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-500 font-semibold">Total Paid</span>
                    <span className="text-gray-900 border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-md dark:text-green-400 font-bold text-base">{formatCurrency(selectedParticipant.payableAmount, selectedParticipant.otherCurrency)}</span>
                  </div>

                  <div className="text-xs space-y-2 mt-4 text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Razorpay Order ID:</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400 break-all">{selectedParticipant.razorpayOrderId || 'N/A'}</span>
                    </div>
                    {selectedParticipant.razorpayPaymentId && (
                      <div className="flex flex-col gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Payment ID:</span>
                        <span className="font-mono text-gray-600 dark:text-gray-400 break-all">{selectedParticipant.razorpayPaymentId}</span>
                      </div>
                    )}
                    {selectedParticipant.gstVatNo && (
                      <div className="flex flex-col gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="font-medium text-gray-700 dark:text-gray-300">GST Registration:</span>
                        <span className="font-mono text-gray-600 dark:text-gray-400">{selectedParticipant.gstVatNo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Section */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                {selectedParticipant.invoices && selectedParticipant.invoices.length > 0 ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Invoice Generated</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">{selectedParticipant.invoices[0].invoiceNumber}</p>
                      </div>
                    </div>
                    <a 
                      href={`/dashboard/crm/invoices/${selectedParticipant.invoices[0].id}`}
                      target="_blank"
                      className="text-xs bg-white dark:bg-blue-800 text-blue-600 dark:text-blue-200 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-700 font-medium hover:bg-blue-50 transition-colors"
                    >
                      View Invoice
                    </a>
                  </div>
                ) : lastGeneratedInvoice ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/50 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-600 dark:text-green-300">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-200">Success!</p>
                        <p className="text-xs text-green-700 dark:text-green-400 font-mono">{lastGeneratedInvoice.num}</p>
                      </div>
                    </div>
                    <a 
                      href={`/dashboard/crm/invoices/${lastGeneratedInvoice.id}`}
                      target="_blank"
                      className="text-xs bg-white dark:bg-green-800 text-green-600 dark:text-green-200 px-3 py-1.5 rounded-md border border-green-200 dark:border-green-700 font-medium hover:bg-green-50 transition-colors"
                    >
                      Open
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => generateInvoice(selectedParticipant.id)}
                    disabled={generatingInvoice || (selectedParticipant.paymentStatus?.toLowerCase() !== 'success' && selectedParticipant.paymentStatus?.toLowerCase() !== 'completed')}
                    className={`
                      w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                      ${generatingInvoice 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : (selectedParticipant.paymentStatus?.toLowerCase() === 'success' || selectedParticipant.paymentStatus?.toLowerCase() === 'completed')
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-dashed border-gray-300'
                      }
                    `}
                  >
                    {generatingInvoice ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        Generate Invoice
                      </>
                    )}
                  </button>
                )}
                
                {(selectedParticipant.paymentStatus?.toLowerCase() !== 'success' && selectedParticipant.paymentStatus?.toLowerCase() !== 'completed') && !selectedParticipant.invoices?.length && (
                  <p className="text-[10px] text-center text-gray-400 mt-2 uppercase tracking-wider font-medium">
                    Invoice generation requires successful payment status
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <LMSAddParticipantDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={fetchParticipants}
      />
    </div>
  );
}
