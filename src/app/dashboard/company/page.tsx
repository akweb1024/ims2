"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CompanyClientLayout from "../companies/CompanyClientLayout";
import CompanyAnalyticsOverview from "@/components/dashboard/company/CompanyAnalyticsOverview";
import WorkforceAnalytics from "@/components/dashboard/company/WorkforceAnalytics";
import { DashboardSkeleton } from "@/components/ui/skeletons";

export default function CompanyPage() {
  const [company, setCompany] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("CUSTOMER");
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "WORKFORCE" | "DETAILS" | "BRANDS"
  >("OVERVIEW");

  // Original Modals State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Invoice Identity Settings
  const [invoiceSettings, setInvoiceSettings] = useState({
    legalEntityName: "",
    tagline: "",
    logoUrl: "",
    invoiceCompanyLogoUrl: "",
    brandRelationType: "A Brand of",
    gstin: "",
    stateCode: "",
    cinNo: "",
    panNo: "",
    iecCode: "",
    bankName: "",
    bankAccountHolder: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankSwiftCode: "",
    paymentMode: "Online",
    regdOfficeAddress: "",
    salesOfficeAddress: "",
    invoiceTerms: "",
    invoicePrefix: "INV-",
    proformaPrefix: "PRO-",
    invoiceNextNumber: 1,
    proformaNextNumber: 1,
  });
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceSaved, setInvoiceSaved] = useState(false);

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const companyIdParam = searchParams?.get("id");
  const tabParam = searchParams?.get("tab");

  const fetchBrands = useCallback(async (companyId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/brands?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBrands(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch brands", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      let companyData: any = null;
      if (companyIdParam) {
        const res = await fetch(`/api/companies/${companyIdParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          companyData = await res.json();
        }
      } else {
        const res = await fetch("/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const response = await res.json();
          // Handle both direct array and paginated format { data: [], pagination: {} }
          const companiesList = Array.isArray(response)
            ? response
            : response.data || [];
          if (companiesList.length > 0) {
            companyData = companiesList[0];
          }
        }
      }

      if (companyData) {
        setCompany(companyData);

        // Sync invoice identity fields from company data
        setInvoiceSettings({
          legalEntityName: companyData.legalEntityName || "",
          tagline: companyData.tagline || "",
          logoUrl: companyData.logoUrl || "",
          invoiceCompanyLogoUrl: companyData.invoiceCompanyLogoUrl || "",
          brandRelationType: companyData.brandRelationType || "A Brand of",
          gstin: companyData.gstin || "",
          stateCode: companyData.stateCode || "",
          cinNo: companyData.cinNo || "",
          panNo: companyData.panNo || "",
          iecCode: companyData.iecCode || "",
          bankName: companyData.bankName || "",
          bankAccountHolder: companyData.bankAccountHolder || "",
          bankAccountNumber: companyData.bankAccountNumber || "",
          bankIfscCode: companyData.bankIfscCode || "",
          bankSwiftCode: companyData.bankSwiftCode || "",
          paymentMode: companyData.paymentMode || "Online",
          regdOfficeAddress: companyData.regdOfficeAddress || "",
          salesOfficeAddress: companyData.salesOfficeAddress || "",
          invoiceTerms: companyData.invoiceTerms || "",
          invoicePrefix: companyData.invoicePrefix || "INV-",
          proformaPrefix: companyData.proformaPrefix || "PRO-",
          invoiceNextNumber: companyData.invoiceNextNumber || 1,
          proformaNextNumber: companyData.proformaNextNumber || 1,
        });

        // Fetch departments for this company
        const deptRes = await fetch(
          `/api/departments?companyId=${companyData.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData);
        }

        // Fetch staff specifically for this company
        const staffRes = await fetch(`/api/users?companyId=${companyData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (staffRes.ok) {
          const staffResponse = await staffRes.json();
          const staffData = Array.isArray(staffResponse)
            ? staffResponse
            : staffResponse.data || [];
          setStaffList(staffData);
        }

        // Fetch brands
        fetchBrands(companyData.id);
      }

      // Fetch users for department assignment (might be all visible users)
      const usersRes = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const usersResponse = await usersRes.json();
        const usersList = Array.isArray(usersResponse)
          ? usersResponse
          : usersResponse.data || [];
        setUsers(usersList);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, [companyIdParam]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }

    // Set active tab from URL parameter
    if (tabParam === "analytics") {
      setActiveTab("OVERVIEW");
    } else if (tabParam === "workforce") {
      setActiveTab("WORKFORCE");
    } else if (tabParam === "details") {
      setActiveTab("DETAILS");
    } else if (tabParam === "brands") {
      setActiveTab("BRANDS");
    }

    fetchData();
    fetchDesignations();
  }, [companyIdParam, tabParam, fetchData]);

  const fetchDesignations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/hr/designations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setDesignations(result.data || result || []);
      }
    } catch (err) {
      console.error("Failed to fetch designations", err);
    }
  };

  const Field = ({
    label,
    children,
    hint,
  }: {
    label: string;
    children: React.ReactNode;
    hint?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-xs text-secondary-500 uppercase font-black tracking-wider">
        {label}
      </label>
      {hint && (
        <p className="text-[10px] text-secondary-400 leading-tight mb-1">
          {hint}
        </p>
      )}
      {children}
    </div>
  );

  const handleUpdateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      domain: formData.get("domain"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      website: formData.get("website"),
      currency: formData.get("currency"),
      timezone: formData.get("timezone"),
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setCompany(updated);
        setShowEditModal(false);
        alert("Company updated successfully!");
      } else {
        alert("Failed to update company");
      }
    } catch (err) {
      alert("Error updating company");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveInvoiceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceSaving(true);
    setInvoiceSaved(false);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...invoiceSettings,
        invoiceNextNumber:
          parseInt(invoiceSettings.invoiceNextNumber as any) || 1,
        proformaNextNumber:
          parseInt(invoiceSettings.proformaNextNumber as any) || 1,
      };

      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setCompany(updated);
        setInvoiceSaved(true);
        setTimeout(() => setInvoiceSaved(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save invoice settings");
      }
    } catch (err) {
      alert("Error saving invoice settings");
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleCreateDepartment = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setActionLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      companyId: company.id,
      name: formData.get("name"),
      code: formData.get("code"),
      description: formData.get("description"),
      headUserId: formData.get("headUserId") || null,
      parentDepartmentId: formData.get("parentDepartmentId") || null,
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowDeptModal(false);
        fetchData();
        e.currentTarget.reset();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create department");
      }
    } catch (err) {
      alert("Error creating department");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload: any = Object.fromEntries(formData.entries());

    // Force the companyId to be the current company
    payload.companyId = company.id;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowUserModal(false);
        fetchData();
        form.reset();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create user");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveBrand = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      companyId: company.id,
      name: formData.get("name"),
      tagline: formData.get("tagline"),
      address: formData.get("address"),
      email: formData.get("email"),
      website: formData.get("website"),
      logoUrl: formData.get("logoUrl"),
      companyLogoUrl: formData.get("companyLogoUrl"),
      brandRelationType: (() => {
        const preset = formData.get("brandRelationType") as string;
        const custom = (
          formData.get("brandRelationTypeCustom") as string
        )?.trim();
        // If user chose "Custom..." from dropdown, use the custom text box value
        if (preset === "custom") return custom || "A Brand of";
        // Otherwise use the preset value
        return preset || "A Brand of";
      })(),
      regdOfficeAddress: formData.get("regdOfficeAddress"),
      salesOfficeAddress: formData.get("salesOfficeAddress"),
      invoiceTerms: formData.get("invoiceTerms"),
      legalEntityName: formData.get("legalEntityName"),
      gstin: formData.get("gstin"),
      cinNo: formData.get("cinNo"),
      panNo: formData.get("panNo"),
      iecCode: formData.get("iecCode"),
      bankName: formData.get("bankName"),
      bankAccountHolder: formData.get("bankAccountHolder"),
      bankAccountNumber: formData.get("bankAccountNumber"),
      bankIfscCode: formData.get("bankIfscCode"),
      bankSwiftCode: formData.get("bankSwiftCode"),
      paymentMode: formData.get("paymentMode"),
      invoicePrefix: formData.get("invoicePrefix"),
      proformaPrefix: formData.get("proformaPrefix"),
      invoiceNextNumber: formData.get("invoiceNextNumber")
        ? parseInt(formData.get("invoiceNextNumber") as string)
        : null,
      proformaNextNumber: formData.get("proformaNextNumber")
        ? parseInt(formData.get("proformaNextNumber") as string)
        : null,
    };

    try {
      const token = localStorage.getItem("token");
      const url = editingBrand
        ? `/api/brands/${editingBrand.id}`
        : "/api/brands";
      const method = editingBrand ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowBrandModal(false);
        setEditingBrand(null);
        fetchBrands(company.id);
        form.reset();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save brand");
      }
    } catch (err) {
      alert("Error saving brand");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the brand "${name}"? This action cannot be undone.`,
      )
    )
      return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/brands/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchBrands(company.id);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete brand");
      }
    } catch (err) {
      alert("Error deleting brand");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <CompanyClientLayout>
        <DashboardSkeleton />
      </CompanyClientLayout>
    );
  }

  if (!company) {
    return (
      <CompanyClientLayout>
        <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-3xl shadow-2xl text-center border border-secondary-100">
          <div className="w-20 h-20 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-secondary-400">🏢</span>
          </div>
          <h3 className="text-2xl font-black text-secondary-900 mb-2">
            No Company Active
          </h3>
          <p className="text-secondary-500 mb-8 font-medium">
            We couldn&apos;t find a company profile associated with your account
            or the current selection.
          </p>

          <div className="space-y-3">
            {userRole === "SUPER_ADMIN" ? (
              <Link
                href="/dashboard/companies"
                className="btn btn-primary w-full py-4 uppercase tracking-widest text-xs font-black"
              >
                Go to System Companies
              </Link>
            ) : (
              <div className="p-4 bg-primary-50 rounded-xl text-primary-700 text-xs font-bold">
                Please contact your System Administrator to assign you to a
                company.
              </div>
            )}
            <button
              onClick={fetchData}
              className="btn btn-secondary w-full py-4 text-xs font-black uppercase"
            >
              Retry Sync
            </button>
          </div>
        </div>
      </CompanyClientLayout>
    );
  }

  return (
    <CompanyClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">
              {company.name}
            </h1>
            <p className="text-secondary-600">Strategic Dashboard</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-secondary-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "OVERVIEW" ? "bg-white text-primary-600 shadow" : "text-secondary-500 hover:text-secondary-700"}`}
          >
            Growth & Financials
          </button>
          <button
            onClick={() => setActiveTab("WORKFORCE")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "WORKFORCE" ? "bg-white text-primary-600 shadow" : "text-secondary-500 hover:text-secondary-700"}`}
          >
            Workforce Intelligence
          </button>
          <button
            onClick={() => setActiveTab("DETAILS")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "DETAILS" ? "bg-white text-primary-600 shadow-sm" : "text-secondary-500 hover:text-secondary-700"}`}
          >
            Identity & Settings
          </button>
          <button
            onClick={() => setActiveTab("BRANDS")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "BRANDS" ? "bg-white text-primary-600 shadow-sm" : "text-secondary-500 hover:text-secondary-700"}`}
          >
            Brand Portfolios
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "OVERVIEW" && (
            <CompanyAnalyticsOverview companyId={company.id} />
          )}

          {activeTab === "WORKFORCE" && (
            <WorkforceAnalytics companyId={company.id} />
          )}

          {activeTab === "DETAILS" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Company Overview */}
              <div className="flex justify-end">
                {["SUPER_ADMIN", "ADMIN"].includes(userRole) && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="btn btn-primary"
                  >
                    Edit Company Details
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-6">
                  <h2 className="text-xl font-bold mb-4 font-primary">
                    Organization Details
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Company Name
                      </label>
                      <p className="text-lg font-medium text-secondary-900">
                        {company.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Domain
                      </label>
                      <p className="text-secondary-900">
                        {company.domain || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Website
                      </label>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {company.website || "N/A"}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="card-premium p-6">
                  <h2 className="text-xl font-bold mb-4 font-primary">
                    Contact Information
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Email
                      </label>
                      <p className="text-secondary-900">
                        {company.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Phone
                      </label>
                      <p className="text-secondary-900">
                        {company.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Address
                      </label>
                      <p className="text-secondary-900">
                        {company.address || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-premium p-6">
                  <h2 className="text-xl font-bold mb-4 font-primary">
                    Settings
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Currency
                      </label>
                      <p className="text-secondary-900">
                        {company.currency || "INR"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Timezone
                      </label>
                      <p className="text-secondary-900">
                        {company.timezone || "Asia/Kolkata"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-500 uppercase font-bold">
                        Employees
                      </label>
                      <p className="text-secondary-900 text-2xl font-bold">
                        {company._count?.users || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── INVOICE & LEGAL IDENTITY SECTION ─── */}
              <div className="card-premium p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32" />

                <div className="relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-secondary-100">
                    <div>
                      <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                        <span className="p-2 bg-secondary-100 rounded-xl text-xl">
                          🧾
                        </span>
                        Invoice & Legal Identity
                      </h3>
                      <p className="text-secondary-500 text-sm font-medium mt-1">
                        Manage global billing defaults and registered entity
                        information
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {invoiceSaved && (
                        <div className="bg-success-50 text-success-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest animate-fadeIn border border-success-100 italic">
                          ✨ Identity Synchronized
                        </div>
                      )}
                      <button
                        onClick={handleSaveInvoiceSettings}
                        disabled={invoiceSaving}
                        className={`btn ${invoiceSaving ? "btn-secondary" : "btn-primary"} px-8 flex items-center gap-2 shadow-lg shadow-primary-100`}
                      >
                        {invoiceSaving ? (
                          <>
                            <span className="animate-spin text-sm">⏳</span>
                            Saving...
                          </>
                        ) : (
                          "Update Identity"
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="md:col-span-2">
                      <Field
                        label="Legal Name"
                        hint="Full registered name of your business organization"
                      >
                        <input
                          className="input-premium"
                          value={invoiceSettings.legalEntityName}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              legalEntityName: e.target.value,
                            })
                          }
                          placeholder="e.g. Consortium e-Learning Network Pvt. Ltd."
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <Field
                        label="Corporate tagline"
                        hint="Appears below company name on invoices"
                      >
                        <input
                          className="input-premium italic font-serif"
                          value={invoiceSettings.tagline}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              tagline: e.target.value,
                            })
                          }
                          placeholder="Focusing on S&T Research Journals"
                        />
                      </Field>
                    </div>
                    <div>
                      <Field
                        label="Relationship Label"
                        hint="e.g. 'A Brand of'"
                      >
                        <select
                          className="input-premium"
                          value={invoiceSettings.brandRelationType}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              brandRelationType: e.target.value,
                            })
                          }
                        >
                          <option value="A Brand of">A Brand of</option>
                          <option value="An imprint of">An imprint of</option>
                          <option value="Published by">Published by</option>
                          <option value="A Subsidiary of">
                            A Subsidiary of
                          </option>
                          <option value="A Unit of">A Unit of</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 bg-secondary-50/50 p-6 rounded-2xl border border-secondary-100">
                    <Field label="GSTIN Number">
                      <input
                        className="input-premium font-mono bg-white"
                        value={invoiceSettings.gstin}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            gstin: e.target.value,
                          })
                        }
                        placeholder="09..."
                        maxLength={15}
                      />
                    </Field>
                    <Field label="State Code" hint="Numeric GST state code">
                      <input
                        className="input-premium font-mono bg-white"
                        value={invoiceSettings.stateCode}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            stateCode: e.target.value,
                          })
                        }
                        placeholder="09"
                        maxLength={2}
                      />
                    </Field>
                    <Field label="PAN Number">
                      <input
                        className="input-premium font-mono bg-white"
                        value={invoiceSettings.panNo}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            panNo: e.target.value,
                          })
                        }
                        placeholder="AAC..."
                      />
                    </Field>
                    <Field label="CIN (Corporate ID)">
                      <input
                        className="input-premium font-mono bg-white text-[11px]"
                        value={invoiceSettings.cinNo}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            cinNo: e.target.value,
                          })
                        }
                        placeholder="U80..."
                      />
                    </Field>
                    <Field label="IEC Code" hint="Import Export Code">
                      <input
                        className="input-premium font-mono bg-white"
                        value={invoiceSettings.iecCode}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            iecCode: e.target.value,
                          })
                        }
                        placeholder="AAC..."
                      />
                    </Field>
                  </div>

                  <div className="mt-12">
                    <h4 className="font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                      <span className="w-8 h-8 bg-indigo-100 flex items-center justify-center rounded-lg text-lg">
                        🏦
                      </span>
                      Banking & Settlement Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <Field label="Account Holder">
                        <input
                          className="input-premium"
                          value={invoiceSettings.bankAccountHolder}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              bankAccountHolder: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Bank Name">
                        <input
                          className="input-premium"
                          value={invoiceSettings.bankName}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              bankName: e.target.value,
                            })
                          }
                          placeholder="e.g. HDFC BANK"
                        />
                      </Field>
                      <Field label="Account Number">
                        <input
                          className="input-premium font-mono"
                          value={invoiceSettings.bankAccountNumber}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              bankAccountNumber: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="IFSC Code">
                        <input
                          className="input-premium font-mono"
                          value={invoiceSettings.bankIfscCode}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              bankIfscCode: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Swift Code"
                        hint="For International Payments"
                      >
                        <input
                          className="input-premium font-mono"
                          value={invoiceSettings.bankSwiftCode}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              bankSwiftCode: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Settlement Mode">
                        <select
                          className="input-premium"
                          value={invoiceSettings.paymentMode}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              paymentMode: e.target.value,
                            })
                          }
                        >
                          <option value="Online">Online / Card</option>
                          <option value="NEFT/RTGS">NEFT / RTGS</option>
                          <option value="Cheque/DD">
                            Cheque / Demand Draft
                          </option>
                          <option value="UPI">UPI / QR</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="mt-12 bg-indigo-50/30 p-8 rounded-3xl border border-indigo-100/50">
                    <h4 className="font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                      <span className="w-8 h-8 bg-indigo-100 flex items-center justify-center rounded-lg text-lg">
                        📍
                      </span>
                      Corporate Office Addresses
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field
                        label="Registered Office Address"
                        hint="Legal address for registrations and notices (Regd. Office:)"
                      >
                        <textarea
                          className="input-premium bg-white"
                          rows={3}
                          value={invoiceSettings.regdOfficeAddress}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              regdOfficeAddress: e.target.value,
                            })
                          }
                          placeholder="Enter full registered office address..."
                        />
                      </Field>
                      <Field
                        label="Sales & Admin Office"
                        hint="Operating address for communications (Sales & Admin Office:)"
                      >
                        <textarea
                          className="input-premium bg-white"
                          rows={3}
                          value={invoiceSettings.salesOfficeAddress}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              salesOfficeAddress: e.target.value,
                            })
                          }
                          placeholder="Enter operating office address..."
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Field
                      label="Invoice Terms & Conditions"
                      hint="Standard legal terms that appear at the bottom of every invoice"
                    >
                      <textarea
                        className="input-premium min-h-[150px]"
                        value={invoiceSettings.invoiceTerms}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            invoiceTerms: e.target.value,
                          })
                        }
                        placeholder="1. Payment is due within... 2. All disputes subject to..."
                      />
                    </Field>
                  </div>

                  <div className="mt-12 bg-amber-50/30 p-8 rounded-3xl border border-amber-100/50">
                    <h4 className="font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                      <span className="w-8 h-8 bg-amber-100 flex items-center justify-center rounded-lg text-lg">
                        🔢
                      </span>
                      Document Serial Numbering
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <Field label="Tax Invoice Prefix" hint="e.g. INV-2026-">
                        <input
                          className="input-premium font-mono bg-white"
                          value={invoiceSettings.invoicePrefix}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              invoicePrefix: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="INV-"
                        />
                      </Field>
                      <Field
                        label="Tax Invoice Next #"
                        hint="Starts auto-incrementing from here"
                      >
                        <input
                          type="number"
                          min="1"
                          className="input-premium font-mono bg-white"
                          value={invoiceSettings.invoiceNextNumber}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              invoiceNextNumber: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </Field>
                      <Field label="Proforma Prefix" hint="e.g. PRO-2026-">
                        <input
                          className="input-premium font-mono bg-white"
                          value={invoiceSettings.proformaPrefix}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              proformaPrefix: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="PRO-"
                        />
                      </Field>
                      <Field
                        label="Proforma Next #"
                        hint="Starts auto-incrementing from here"
                      >
                        <input
                          type="number"
                          min="1"
                          className="input-premium font-mono bg-white"
                          value={invoiceSettings.proformaNextNumber}
                          onChange={(e) =>
                            setInvoiceSettings({
                              ...invoiceSettings,
                              proformaNextNumber: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-secondary-100">
                    <h4 className="font-black text-secondary-900 mb-6 flex items-center gap-2 uppercase tracking-tighter">
                      <span className="w-8 h-8 bg-pink-100 flex items-center justify-center rounded-lg text-lg">
                        🖼️
                      </span>
                      Visual Identity Assets
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Field
                        label="Primary Logo URL"
                        hint="Main company logo used in portal"
                      >
                        <div className="flex gap-4 items-center">
                          <input
                            className="input-premium flex-1"
                            value={invoiceSettings.logoUrl}
                            onChange={(e) =>
                              setInvoiceSettings({
                                ...invoiceSettings,
                                logoUrl: e.target.value,
                              })
                            }
                            placeholder="https://..."
                          />
                          {invoiceSettings.logoUrl && (
                            <div className="w-12 h-12 rounded-xl bg-secondary-50 border p-1 border-secondary-200 overflow-hidden flex-shrink-0">
                              <img
                                src={invoiceSettings.logoUrl}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </Field>
                      <Field
                        label="Invoice Company Logo"
                        hint="Specific logo for invoice footers/headers (if different)"
                      >
                        <div className="flex gap-4 items-center">
                          <input
                            className="input-premium flex-1"
                            value={invoiceSettings.invoiceCompanyLogoUrl}
                            onChange={(e) =>
                              setInvoiceSettings({
                                ...invoiceSettings,
                                invoiceCompanyLogoUrl: e.target.value,
                              })
                            }
                            placeholder="https://..."
                          />
                          {invoiceSettings.invoiceCompanyLogoUrl && (
                            <div className="w-12 h-12 rounded-xl bg-secondary-50 border p-1 border-secondary-200 overflow-hidden flex-shrink-0">
                              <img
                                src={invoiceSettings.invoiceCompanyLogoUrl}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              </div>

              {/* Departments Section */}
              <div className="card-premium p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold font-primary">
                      Departments
                    </h2>
                    <p className="text-secondary-600">
                      Organizational structure and hierarchy
                    </p>
                  </div>
                  {["SUPER_ADMIN", "ADMIN"].includes(userRole) && (
                    <button
                      onClick={() => setShowDeptModal(true)}
                      className="btn btn-primary"
                    >
                      + Add Department
                    </button>
                  )}
                </div>

                {departments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="border border-secondary-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-secondary-900">
                              {dept.name}
                            </h3>
                            {dept.code && (
                              <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded">
                                {dept.code}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${dept.isActive ? "bg-success-100 text-success-700" : "bg-danger-100 text-danger-700"}`}
                          >
                            {dept.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {dept.description && (
                          <p className="text-sm text-secondary-600 mb-3">
                            {dept.description}
                          </p>
                        )}

                        <div className="space-y-2 text-sm">
                          {dept.headUser && (
                            <div>
                              <span className="text-secondary-500">Head:</span>
                              <span className="ml-2 font-medium">
                                {dept.headUser.email}
                              </span>
                            </div>
                          )}
                          {dept.parentDepartment && (
                            <div>
                              <span className="text-secondary-500">
                                Parent:
                              </span>
                              <span className="ml-2">
                                {dept.parentDepartment.name}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-secondary-100">
                            <span className="text-secondary-500">
                              👥 {dept._count.users} members
                            </span>
                            <span className="text-secondary-500">
                              📁 {dept._count.subDepartments} sub-depts
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-secondary-50 rounded-xl">
                    <p className="text-secondary-500">
                      No departments created yet.
                    </p>
                    {["SUPER_ADMIN", "ADMIN"].includes(userRole) && (
                      <button
                        onClick={() => setShowDeptModal(true)}
                        className="mt-4 btn btn-secondary"
                      >
                        Create First Department
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Staff Members Section */}
              <div className="card-premium p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold font-primary">
                      Staff Members
                    </h2>
                    <p className="text-secondary-600">
                      Personnel associated with this organization
                    </p>
                  </div>
                  {["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(userRole) && (
                    <button
                      onClick={() => setShowUserModal(true)}
                      className="btn btn-primary"
                    >
                      + Add New Employee
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-secondary-100">
                        <th className="pb-3 font-bold text-secondary-500 uppercase text-xs">
                          User
                        </th>
                        <th className="pb-3 font-bold text-secondary-500 uppercase text-xs">
                          Role
                        </th>
                        <th className="pb-3 font-bold text-secondary-500 uppercase text-xs">
                          Department
                        </th>
                        <th className="pb-3 font-bold text-secondary-500 uppercase text-xs text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.length > 0 ? (
                        staffList.map((staff) => (
                          <tr
                            key={staff.id}
                            className="border-b border-secondary-50 hover:bg-secondary-50"
                          >
                            <td className="py-4">
                              <div>
                                <p className="font-medium text-secondary-900">
                                  {staff.email}
                                </p>
                                <p className="text-xs text-secondary-400">
                                  ID: {staff.id.split("-")[0]}
                                </p>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="badge badge-secondary">
                                {staff.role.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-4">
                              <p className="text-sm text-secondary-600">
                                {staff.department?.name || "Unassigned"}
                              </p>
                            </td>
                            <td className="py-4 text-right">
                              <Link
                                href={`/dashboard/users?search=${encodeURIComponent(staff.email)}`}
                                className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-secondary-500"
                          >
                            No staff members found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "BRANDS" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold font-primary">
                    Brand Portfolio
                  </h2>
                  <p className="text-secondary-600">
                    Represent multiple trade names or subsidiaries under your
                    company
                  </p>
                </div>
                {["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(userRole) && (
                  <button
                    onClick={() => setShowBrandModal(true)}
                    className="btn btn-primary"
                  >
                    + Create New Brand
                  </button>
                )}
              </div>

              {brands.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="card-premium p-6 hover:shadow-xl transition-all border border-secondary-100 flex flex-col group"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-secondary-50 rounded-2xl flex items-center justify-center p-2 border border-secondary-100 overflow-hidden">
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-2xl">🏷️</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-secondary-900 leading-tight">
                            {brand.name}
                          </h3>
                          {brand.tagline && (
                            <p className="text-xs text-secondary-500 mt-0.5 line-clamp-1 italic">
                              {brand.tagline}
                            </p>
                          )}
                          <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            {brand.brandRelationType || "A Brand of"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-2 text-sm text-secondary-600">
                          <span className="mt-0.5 text-secondary-400">📍</span>
                          <span className="line-clamp-2">
                            {brand.address || "No address registered"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary-600">
                          <span className="text-secondary-400">✉️</span>
                          <span>{brand.email || "No email registered"}</span>
                        </div>
                        {brand.website && (
                          <div className="flex items-center gap-2 text-sm text-primary-600 font-bold">
                            <span className="text-secondary-400">🌐</span>
                            <a
                              href={brand.website}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline truncate"
                            >
                              {brand.website.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-secondary-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] uppercase font-black text-secondary-300 tracking-tighter">
                          ID: {brand.id.split("-")[0]}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingBrand(brand);
                              setShowBrandModal(true);
                            }}
                            className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-primary-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteBrand(brand.id, brand.name)
                            }
                            className="text-xs font-bold text-danger-600 hover:bg-danger-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-danger-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary-50 rounded-3xl border-2 border-dashed border-secondary-200">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <span className="text-3xl">🏗️</span>
                  </div>
                  <h3 className="text-xl font-bold text-secondary-900 mb-2">
                    Build Your Brand Portfolio
                  </h3>
                  <p className="text-secondary-500 max-w-sm mx-auto mb-8 font-medium">
                    Create distinct brands to handle multiple publications,
                    outlets, or service lines under your primary company.
                  </p>
                  <button
                    onClick={() => setShowBrandModal(true)}
                    className="btn btn-primary px-8"
                  >
                    Create Your First Brand
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Company Modal */}
      {showEditModal && company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">
              Edit Company Details
            </h2>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Company Name *</label>
                  <input
                    name="name"
                    className="input"
                    defaultValue={company.name}
                    required
                  />
                </div>
                <div>
                  <label className="label">Domain</label>
                  <input
                    name="domain"
                    className="input"
                    defaultValue={company.domain || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="input"
                    defaultValue={company.email || ""}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    name="phone"
                    className="input"
                    defaultValue={company.phone || ""}
                  />
                </div>
              </div>

              <div>
                <label className="label">Address</label>
                <textarea
                  name="address"
                  className="input"
                  rows={2}
                  defaultValue={company.address || ""}
                ></textarea>
              </div>

              <div>
                <label className="label">Website</label>
                <input
                  name="website"
                  type="url"
                  className="input"
                  defaultValue={company.website || ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Currency</label>
                  <select
                    name="currency"
                    className="input"
                    defaultValue={company.currency || "INR"}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select
                    name="timezone"
                    className="input"
                    defaultValue={company.timezone || "Asia/Kolkata"}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">
                      America/New_York (EST)
                    </option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary px-8"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">
              Create Department
            </h2>
            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="label">Department Name *</label>
                <input
                  name="name"
                  className="input"
                  required
                  placeholder="e.g., Sales Department"
                />
              </div>

              <div>
                <label className="label">Department Code</label>
                <input
                  name="code"
                  className="input"
                  placeholder="e.g., SALES"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  name="description"
                  className="input"
                  rows={2}
                  placeholder="Brief description of the department"
                ></textarea>
              </div>

              <div>
                <label className="label">Parent Department (Optional)</label>
                <select name="parentDepartmentId" className="input">
                  <option value="">None (Top Level)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Department Head (Optional)</label>
                <select name="headUserId" className="input">
                  <option value="">Select a user...</option>
                  {users
                    .filter((u) =>
                      ["MANAGER", "TEAM_LEADER", "ADMIN"].includes(u.role),
                    )
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email} ({user.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary px-8"
                >
                  {actionLoading ? "Creating..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Invite Staff Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-primary">
              Add New Employee
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  name="name"
                  type="text"
                  className="input"
                  required
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="label">Work Email *</label>
                <input
                  name="email"
                  type="email"
                  className="input"
                  required
                  placeholder="staff@company.com"
                />
              </div>

              <div>
                <label className="label">Temporary Password *</label>
                <input
                  name="password"
                  type="password"
                  className="input"
                  required
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="label">System Role *</label>
                <select name="role" className="input" required>
                  <option value="EXECUTIVE">Executive</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Company Admin</option>
                  <option value="FINANCE_ADMIN">Finance Admin</option>
                </select>
              </div>

              <div>
                <label className="label">Department (Optional)</label>
                <select name="departmentId" className="input">
                  <option value="">Select a department...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Designation (Optional)</label>
                <select name="designationId" className="input">
                  <option value="">Select a designation...</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  className="input"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="label">Date of Joining</label>
                <input name="dateOfJoining" type="date" className="input" />
              </div>

              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary px-8"
                >
                  {actionLoading ? "Creating..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-secondary-900 font-primary">
                {editingBrand ? "Update Brand" : "Register New Brand"}
              </h2>
              <button
                onClick={() => {
                  setShowBrandModal(false);
                  setEditingBrand(null);
                }}
                className="text-2xl text-secondary-400 hover:text-secondary-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveBrand} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Brand Name *</label>
                  <input
                    name="name"
                    className="input"
                    required
                    defaultValue={editingBrand?.name || ""}
                    placeholder="e.g. STM Journals"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Tagline / Sub-name</label>
                  <input
                    name="tagline"
                    className="input"
                    defaultValue={editingBrand?.tagline || ""}
                    placeholder="e.g. Scientific, Technical and Medical Journals"
                  />
                </div>
                <div>
                  <label className="label">Official Email</label>
                  <input
                    name="email"
                    type="email"
                    className="input"
                    defaultValue={editingBrand?.email || ""}
                    placeholder="brand@company.com"
                  />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input
                    name="website"
                    type="url"
                    className="input"
                    defaultValue={editingBrand?.website || ""}
                    placeholder="https://brand.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">
                    Registered Office Address (Regd. Office:)
                  </label>
                  <textarea
                    name="regdOfficeAddress"
                    className="input"
                    rows={2}
                    defaultValue={editingBrand?.regdOfficeAddress || ""}
                    placeholder="Full registered address"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Sales & Admin Office Address</label>
                  <textarea
                    name="salesOfficeAddress"
                    className="input"
                    rows={2}
                    defaultValue={editingBrand?.salesOfficeAddress || ""}
                    placeholder="Operational address"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label">
                    General Business Address (Display)
                  </label>
                  <textarea
                    name="address"
                    className="input"
                    rows={2}
                    defaultValue={editingBrand?.address || ""}
                    placeholder="Brand-specific office address"
                  ></textarea>
                </div>
                <div>
                  <label className="label">Brand Logo URL</label>
                  <input
                    name="logoUrl"
                    className="input"
                    defaultValue={editingBrand?.logoUrl || ""}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="label">
                    Parent Company Logo URL (Optional)
                  </label>
                  <input
                    name="companyLogoUrl"
                    className="input"
                    defaultValue={editingBrand?.companyLogoUrl || ""}
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Relationship Label on Invoice</label>
                  <p className="text-xs text-secondary-400 mb-2">
                    This text appears below the brand name on invoices, e.g.{" "}
                    <em>&ldquo;— A Brand of [Company Name] —&rdquo;</em>
                  </p>
                  <select
                    name="brandRelationType"
                    className="input"
                    defaultValue={
                      [
                        "A Brand of",
                        "An Imprint of",
                        "A Division of",
                        "A Subsidiary of",
                        "A Publication of",
                        "A Member of",
                      ].includes(editingBrand?.brandRelationType)
                        ? editingBrand?.brandRelationType
                        : editingBrand?.brandRelationType
                          ? "custom"
                          : "A Brand of"
                    }
                    onChange={(e) => {
                      const customInput = e.currentTarget
                        .closest("div")
                        ?.querySelector(
                          'input[name="brandRelationTypeCustom"]',
                        ) as HTMLInputElement;
                      if (customInput)
                        customInput.style.display =
                          e.target.value === "custom" ? "block" : "none";
                    }}
                  >
                    <option value="A Brand of">A Brand of</option>
                    <option value="An Imprint of">An Imprint of</option>
                    <option value="A Division of">A Division of</option>
                    <option value="A Subsidiary of">A Subsidiary of</option>
                    <option value="A Publication of">A Publication of</option>
                    <option value="A Member of">A Member of</option>
                    <option value="custom">Custom...</option>
                  </select>
                  <input
                    name="brandRelationTypeCustom"
                    className="input mt-2"
                    placeholder="Enter custom relationship label"
                    defaultValue={
                      ![
                        "A Brand of",
                        "An Imprint of",
                        "A Division of",
                        "A Subsidiary of",
                        "A Publication of",
                        "A Member of",
                        undefined,
                        null,
                        "",
                      ].includes(editingBrand?.brandRelationType)
                        ? editingBrand?.brandRelationType
                        : ""
                    }
                    style={{
                      display: [
                        "A Brand of",
                        "An Imprint of",
                        "A Division of",
                        "A Subsidiary of",
                        "A Publication of",
                        "A Member of",
                        undefined,
                        null,
                        "",
                      ].includes(editingBrand?.brandRelationType)
                        ? "none"
                        : "block",
                    }}
                  />
                </div>

                <div className="md:col-span-2 pt-4 border-t border-secondary-100">
                  <h4 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
                    ⚖️ Legal Identity
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="label">Legal Name</label>
                      <input
                        name="legalEntityName"
                        className="input"
                        defaultValue={editingBrand?.legalEntityName || ""}
                        placeholder="Registered Name of Brand Entity"
                      />
                    </div>
                    <div>
                      <label className="label">GSTIN</label>
                      <input
                        name="gstin"
                        className="input font-mono"
                        defaultValue={editingBrand?.gstin || ""}
                        placeholder="GST Number"
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="label">PAN Number</label>
                      <input
                        name="panNo"
                        className="input font-mono"
                        defaultValue={editingBrand?.panNo || ""}
                        placeholder="PAN Card Number"
                      />
                    </div>
                    <div>
                      <label className="label">CIN Number</label>
                      <input
                        name="cinNo"
                        className="input font-mono"
                        defaultValue={editingBrand?.cinNo || ""}
                        placeholder="Corporate Identity Number"
                      />
                    </div>
                    <div>
                      <label className="label">IEC Code</label>
                      <input
                        name="iecCode"
                        className="input font-mono"
                        defaultValue={editingBrand?.iecCode || ""}
                        placeholder="Import Export Code"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-secondary-100">
                  <h4 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
                    🏦 Banking & Payment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Account Holder</label>
                      <input
                        name="bankAccountHolder"
                        className="input"
                        defaultValue={editingBrand?.bankAccountHolder || ""}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Bank Name</label>
                      <input
                        name="bankName"
                        className="input"
                        defaultValue={editingBrand?.bankName || ""}
                      />
                    </div>
                    <div>
                      <label className="label">Account Number</label>
                      <input
                        name="bankAccountNumber"
                        className="input font-mono"
                        defaultValue={editingBrand?.bankAccountNumber || ""}
                      />
                    </div>
                    <div>
                      <label className="label">IFSC Code</label>
                      <input
                        name="bankIfscCode"
                        className="input font-mono"
                        defaultValue={editingBrand?.bankIfscCode || ""}
                      />
                    </div>
                    <div>
                      <label className="label">Payment Mode</label>
                      <select
                        name="paymentMode"
                        className="input"
                        defaultValue={editingBrand?.paymentMode || "Online"}
                      >
                        <option value="Online">Online / Card</option>
                        <option value="NEFT/RTGS">NEFT / RTGS</option>
                        <option value="Cheque/DD">Cheque / Demand Draft</option>
                        <option value="UPI">UPI / QR</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-secondary-100">
                  <h4 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
                    📄 Terms & Conditions
                  </h4>
                  <div className="space-y-2">
                    <label className="label">Invoice Specific Terms</label>
                    <textarea
                      name="invoiceTerms"
                      className="input"
                      rows={4}
                      defaultValue={editingBrand?.invoiceTerms || ""}
                      placeholder="Standard terms specific to this brand (falls back to company terms if empty)..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBrandModal(false);
                    setEditingBrand(null);
                  }}
                  className="btn btn-secondary px-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary px-10 shadow-lg shadow-primary-200"
                >
                  {actionLoading
                    ? "Saving..."
                    : editingBrand
                      ? "Update Brand"
                      : "Register Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CompanyClientLayout>
  );
}
