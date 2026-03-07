"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormattedDate from "@/components/common/FormattedDate";
import CRMClientLayout from "../CRMClientLayout";
import {
  CRMPageShell,
  CRMSearchInput,
  CRMFilterBar,
  CRMTable,
  CRMTableLoading,
  CRMTableEmpty,
  CRMPagination,
  CRMBadge,
  CRMRowAction,
  CRMModal,
  CRMStatCard,
} from "@/components/crm/CRMPageShell";
import {
  UserPlus,
  Search,
  Filter,
  Plus,
  Eye,
  TrendingUp,
  UserCheck,
  Globe,
  Mail,
  Phone,
  Building2,
  Activity,
  MoreHorizontal,
  Target,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  Archive,
} from "lucide-react";

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    primaryEmail: "",
    organizationName: "",
    primaryPhone: "",
    status: "NEW",
    source: "DIRECT",
    notes: "",
    assignedToUserId: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignedToFilter, setAssignedToFilter] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        ...(statusFilter && { status: statusFilter }),
        ...(assignedToFilter && { assignedToUserId: assignedToFilter }),
      });

      const res = await fetch(`/api/crm/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/users?limit=100");
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch employees", error);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewLead({
          name: "",
          primaryEmail: "",
          organizationName: "",
          primaryPhone: "",
          status: "NEW",
          source: "DIRECT",
          notes: "",
          assignedToUserId: "",
        });
        fetchLeads();
      }
    } catch (error) {
      console.error("Error creating lead", error);
    } finally {
      setCreateLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    const variants: any = {
      NEW: "info",
      CONTACTED: "warning",
      QUALIFIED: "info",
      PROPOSAL_SENT: "info",
      NEGOTIATION: "warning",
      CONVERTED: "success",
      LOST: "danger",
    };
    return variants[status] || "secondary";
  };

  return (
    <CRMClientLayout>
      <CRMPageShell
        title="Leads Intelligence Matrix"
        subtitle="Capture, qualify, and track potential acquisition nodes through the tactical sales funnel."
        icon={<UserPlus className="w-5 h-5" />}
        breadcrumb={[
          { label: "CRM", href: "/dashboard/crm" },
          { label: "Leads Matrix" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 bg-secondary-950 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary-400">
                  Lead Stream
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95 group"
            >
              <Plus
                size={18}
                className="group-hover:rotate-90 transition-transform"
              />
              Initialize Lead
            </button>
          </div>
        }
      >
        {/* Visual Intelligence Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CRMStatCard
            label="Captured Leads"
            value={pagination.total}
            icon={<Target size={22} />}
            accent="bg-primary-950 text-white shadow-primary-100"
            trend={{
              value: "In-flow",
              label: "Telemetry active",
              isPositive: true,
            }}
          />
          <CRMStatCard
            label="Qualified Nodes"
            value={leads.filter((l) => l.leadStatus === "QUALIFIED").length}
            icon={<ShieldCheck size={22} />}
            accent="bg-emerald-900 text-white shadow-emerald-100"
            trend={{ value: "Priority", label: "targets", isPositive: true }}
          />
          <CRMStatCard
            label="Conversion Velocity"
            value={`${Math.round((leads.filter((l) => l.leadStatus === "CONVERTED").length / (leads.length || 1)) * 100)}%`}
            icon={<Sparkles size={22} />}
            accent="bg-amber-900 text-white shadow-amber-100"
            trend={{ value: "Projected", label: "stability", isPositive: true }}
          />
          <CRMStatCard
            label="Matrix Density"
            value={pagination.totalPages}
            icon={<Layers size={22} />}
            accent="bg-secondary-900 text-white shadow-secondary-100"
            trend={{ value: "Sectors", label: "mapped", isPositive: true }}
          />
        </div>

        {/* Operations bar */}
        <div className="mt-12 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-secondary-100 pb-8">
            <div className="flex flex-wrap gap-2.5">
              {[
                { value: "", label: "Universal Matrix" },
                { value: "NEW", label: "Fresh Signals" },
                { value: "QUALIFIED", label: "Prime Targets" },
                { value: "CONTACTED", label: "In Negotiation" },
                { value: "CONVERTED", label: "Converted Nodes" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${statusFilter === opt.value ? "bg-secondary-950 text-white border-secondary-950 shadow-xl" : "bg-white text-secondary-400 border-secondary-200 hover:border-primary-300"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={assignedToFilter}
                onChange={(e) => {
                  setAssignedToFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-12 px-4 bg-secondary-50 border border-secondary-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-secondary-600 focus:ring-2 focus:ring-primary-500 outline-none min-w-[180px]"
              >
                <option value="">All Custodians</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
              <CRMSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search identity node or organization..."
                className="!bg-secondary-50 border-secondary-100 !h-12 !w-full lg:!w-80 font-bold"
              />
              <div className="flex items-center gap-2 p-1 bg-secondary-100 rounded-xl">
                <button className="p-2 bg-white rounded-lg shadow-sm text-primary-600">
                  <Activity size={18} />
                </button>
                <button className="p-2 text-secondary-400">
                  <Archive size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Leads Table Matrix */}
          <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 overflow-hidden relative">
            <CRMTable>
              <thead>
                <tr className="bg-secondary-50/50 border-b border-secondary-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">
                    Lead Identity
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-center">
                    Protocol Phase
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-center">
                    Threat Score
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">
                    Signal Source
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">
                    Node Custodian
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-right">
                    Operations
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {loading ? (
                  <CRMTableLoading rows={6} colSpan={6} />
                ) : leads.length === 0 ? (
                  <CRMTableEmpty
                    icon={<UserPlus size={48} strokeWidth={1} />}
                    message="No spectral signals found in current matrix sectors."
                    colSpan={6}
                    className="py-40"
                  />
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="group hover:bg-secondary-50/50 transition-all duration-500"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1.5 min-w-[200px]">
                            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full group-hover:animate-ping" />
                            <span className="font-black text-secondary-950 text-sm uppercase tracking-tight italic group-hover:text-primary-600 transition-colors">
                              {lead.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 pl-3.5">
                            <span className="text-[9px] font-black text-secondary-300 uppercase tracking-widest truncate max-w-[140px] lowercase flex items-center gap-1">
                              <Mail size={10} className="text-secondary-200" />{" "}
                              {lead.primaryEmail}
                            </span>
                            {lead.organizationName && (
                              <>
                                <span className="h-1 w-1 bg-secondary-200 rounded-full" />
                                <span className="text-[9px] font-black text-secondary-300 uppercase tracking-widest truncate max-w-[120px] flex items-center gap-1">
                                  <Building2
                                    size={10}
                                    className="text-secondary-200"
                                  />{" "}
                                  {lead.organizationName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <CRMBadge
                          variant={getStatusVariant(lead.leadStatus)}
                          className="px-4 py-1.5 rounded-full text-[9px] font-black border-none uppercase tracking-[0.2em] italic shadow-sm"
                          dot
                        >
                          {lead.leadStatus?.replace("_", " ")}
                        </CRMBadge>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-secondary-950 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-secondary-950/20 group-hover:bg-primary-600 transition-colors">
                          <Activity
                            size={10}
                            className="text-primary-400 group-hover:text-white"
                          />
                          {lead.leadScore}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-secondary-500 italic">
                          <Globe size={13} className="text-secondary-200" />
                          {lead.source}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-secondary-950 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-xl group-hover:bg-primary-600 transition-all">
                              {lead.assignedTo.name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("") || "?"}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-secondary-950 uppercase tracking-tight italic">
                                {lead.assignedTo.name}
                              </span>
                              <span className="text-[8px] font-black text-secondary-300 uppercase tracking-[0.3em] mt-0.5">
                                CUSTODIAN
                              </span>
                            </div>
                          </div>
                        ) : (
                          <CRMBadge
                            variant="secondary"
                            className="px-3 py-1 text-[8px] font-black border-none uppercase tracking-[0.2em]"
                          >
                            ORPHAN_NODE
                          </CRMBadge>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CRMRowAction
                            href={`/dashboard/crm/leads/${lead.id}`}
                            variant="primary"
                            className="!p-3 !bg-white !border-secondary-100 !rounded-xl !text-secondary-400 hover:!text-primary-600 hover:!border-primary-100 hover:!shadow-lg transition-all"
                            title="Access Lead Intelligence"
                          >
                            <Eye size={18} />
                          </CRMRowAction>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </CRMTable>

            <div className="p-8 bg-secondary-50/30 border-t border-secondary-100">
              <CRMPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(p) =>
                  setPagination((prev) => ({ ...prev, page: p }))
                }
                entityName="spectral signals"
                className="!bg-transparent !p-0"
              />
            </div>
          </div>
        </div>

        {/* Create Lead Modal */}
        <CRMModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Initialize Signal Node"
          subtitle="Define identity parameters and begin the tactical qualification sequence."
        >
          <form onSubmit={handleCreateLead} className="space-y-8 py-2">
            <div className="bg-secondary-950 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-5 blur-sm rotate-12">
                <UserPlus size={140} className="text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 pl-1">
                    Target Designation
                  </label>
                  <input
                    type="text"
                    required
                    className="input h-14 bg-white/5 border-white/10 text-white font-black text-sm uppercase tracking-tight focus:bg-white/10"
                    placeholder="NODE IDENTITY NAME..."
                    value={newLead.name}
                    onChange={(e) =>
                      setNewLead({ ...newLead, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 pl-1">
                    Communication Channel (Email)
                  </label>
                  <input
                    type="email"
                    required
                    className="input h-14 bg-white/5 border-white/10 text-white font-black text-sm lowercase tracking-tight focus:bg-white/10"
                    placeholder="john@example.com"
                    value={newLead.primaryEmail}
                    onChange={(e) =>
                      setNewLead({ ...newLead, primaryEmail: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 px-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
                Organization / Institution Matrix
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                  <Building2 size={18} />
                </div>
                <input
                  type="text"
                  className="input pl-14 h-14 bg-secondary-50 border-secondary-100 font-black text-sm uppercase"
                  placeholder="e.g. Continental University"
                  value={newLead.organizationName}
                  onChange={(e) =>
                    setNewLead({ ...newLead, organizationName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
                  Initial Phase
                </label>
                <select
                  className="input h-14 bg-secondary-50 border-secondary-100 font-black text-xs uppercase tracking-widest italic pr-10"
                  value={newLead.status}
                  onChange={(e) =>
                    setNewLead({ ...newLead, status: e.target.value })
                  }
                >
                  <option value="NEW">SEQUENCE: FRESH SIGNAL</option>
                  <option value="CONTACTED">SEQUENCE: ACTIVE COMM</option>
                  <option value="QUALIFIED">SEQUENCE: PRIME TARGET</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
                  Node Custodian (Assignment)
                </label>
                <select
                  className="input h-14 bg-secondary-50 border-secondary-100 font-black text-xs uppercase tracking-widest italic pr-10"
                  value={newLead.assignedToUserId}
                  onChange={(e) =>
                    setNewLead({ ...newLead, assignedToUserId: e.target.value })
                  }
                  required
                >
                  <option value="">SELECT CUSTODIAN...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || emp.email} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 px-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
                Capture Source
              </label>
              <select
                className="input h-14 bg-secondary-50 border-secondary-100 font-black text-xs uppercase tracking-widest italic pr-10"
                value={newLead.source}
                onChange={(e) =>
                  setNewLead({ ...newLead, source: e.target.value })
                }
              >
                <option value="DIRECT">DIRECT_FEED</option>
                <option value="REFERRAL">PARTNER_VEC</option>
                <option value="WEBSITE">DIGITAL_PORTAL</option>
                <option value="LINKEDIN">MATRIX_LINKEDIN</option>
              </select>
            </div>

            <div className="space-y-2 px-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">
                Intelligence Context (Metadata)
              </label>
              <textarea
                className="input font-medium text-xs p-5 min-h-[140px] resize-none bg-secondary-50 border-secondary-100 italic"
                placeholder="Detail any specific intelligence gathered regarding this target vector..."
                value={newLead.notes}
                onChange={(e) =>
                  setNewLead({ ...newLead, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-4 pt-10 border-t border-secondary-100/50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-4 rounded-2xl border-2 border-secondary-200 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 transition-all font-mono"
              >
                Abandon
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 bg-primary-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group/btn"
              >
                {createLoading ? (
                  "Synchronizing..."
                ) : (
                  <>
                    Establish Signal Node{" "}
                    <ChevronRight
                      size={16}
                      className="group-hover/btn:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </div>
          </form>
        </CRMModal>
      </CRMPageShell>
    </CRMClientLayout>
  );
}
