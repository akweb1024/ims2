'use client';

// HR/manager view for Onboarding System B — NEW-HIRE WORKFLOW STEPS (data via onboarding/workflow-state).
// This is NOT the training/quiz modules (System A) — that is staff/EmployeeOnboarding.tsx.
import { useEffect, useMemo, useState } from 'react';

type Mode = 'NEW' | 'UPGRADE';
type TeamFilter = 'ALL' | 'PENDING_APPROVAL' | 'COMPLETED' | 'BLOCKED';

type StepKey = 'joining' | 'verification' | 'job' | 'perks';

const STEPS: Array<{ key: StepKey; title: string; subtitle: string }> = [
  { key: 'joining', subtitle: 'Step 1', title: 'Joining' },
  { key: 'verification', subtitle: 'Step 2', title: 'Profile Verification' },
  { key: 'job', subtitle: 'Step 3', title: 'Job Description & Work Details' },
  { key: 'perks', subtitle: 'Step 4', title: 'Perks & Allotments' },
];
const STEP_KEYS: StepKey[] = STEPS.map((s) => s.key);

export default function EmployeeOnboardingWorkflow() {
  const [mode, setMode] = useState<Mode>('NEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>('joining');
  const [userRole, setUserRole] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState('ONBOARDING_DRAFT');
  const [workflowStatusDetail, setWorkflowStatusDetail] = useState('IN_PROGRESS');
  const [workflowStepsMeta, setWorkflowStepsMeta] = useState<Record<string, any>>({});
  const [workflowActors, setWorkflowActors] = useState<Record<string, string>>({});
  const [teamRows, setTeamRows] = useState<any[]>([]);
  const [teamActorMap, setTeamActorMap] = useState<Record<string, string>>({});
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('ALL');
  const [summary, setSummary] = useState<{ inProgress: number; blockedAtVerification: number; blockedAtPerks: number; pendingApprovals: number; completedThisMonth: number; avgCompletionDays: number } | null>(null);

  const [stepSaved, setStepSaved] = useState<Record<StepKey, boolean>>({
    joining: false,
    verification: false,
    job: false,
    perks: false,
  });
  const [stepApproved, setStepApproved] = useState<Record<StepKey, boolean>>({
    joining: false,
    verification: false,
    job: false,
    perks: false,
  });

  const [form, setForm] = useState<any>({
    // Joining
    name: '',
    email: '',
    password: '',
    role: 'EXECUTIVE',
    designation: '',
    departmentId: '',
    managerId: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employeeType: 'FULL_TIME',
    baseSalary: '',

    // Verification
    phoneNumber: '',
    officialEmail: '',
    personalEmail: '',
    panNumber: '',
    aadharNumber: '',
    uanNumber: '',
    pfNumber: '',
    offerLetterUrl: '',
    contractUrl: '',

    // Job
    jobDescription: '',
    kra: '',
    monthlyTarget: '',
    yearlyTarget: '',

    // Perks (stored in metrics)
    pcAllotted: false,
    mobileAllotted: false,
    softwareAccess: '',
    backupAccess: false,
    securityTools: '',
    otherBenefits: '',
    assetIds: [] as string[],
  });
  const [assets, setAssets] = useState<any[]>([]);

  const progress = useMemo(() => {
    const done = Object.values(stepSaved).filter(Boolean).length;
    return Math.round((done / STEPS.length) * 100);
  }, [stepSaved]);
  const canApprove = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER'].includes(userRole);

  const handoverRows = useMemo(() => {
    const actorLabel = (id: any) => (id ? (workflowActors[String(id)] || String(id)) : '');
    return STEPS.map((s) => {
      const meta = workflowStepsMeta?.[s.key] || {};
      return {
        step: s.subtitle,
        title: s.title,
        savedAt: meta?.savedAt || '',
        savedBy: actorLabel(meta?.savedBy),
        reviewedAt: meta?.reviewedAt || '',
        reviewedBy: actorLabel(meta?.reviewedBy),
        approvedAt: meta?.approvedAt || '',
        approvedBy: actorLabel(meta?.approvedBy),
        approvalDecision: meta?.approvalDecision || '',
        approvalReason: meta?.approvalReason || '',
      };
    });
  }, [workflowActors, workflowStepsMeta]);

  const filteredTeamRows = useMemo(() => {
    return teamRows.filter((row) => {
      if (teamFilter === 'ALL') return true;
      if (teamFilter === 'PENDING_APPROVAL') return row?.statusDetail === 'PENDING_APPROVAL';
      if (teamFilter === 'COMPLETED') return row?.status === 'ONBOARDING_COMPLETED';
      if (teamFilter === 'BLOCKED') return row?.status === 'ONBOARDING_DRAFT' && ['verification', 'perks'].includes(String(row?.currentStep || '').toLowerCase());
      return true;
    });
  }, [teamFilter, teamRows]);

  const exportTimelineCsv = () => {
    const header = [
      'Employee',
      'Profile ID',
      'Workflow Status',
      'Workflow Detail',
      'Step',
      'Title',
      'Saved At',
      'Saved By',
      'Reviewed At',
      'Reviewed By',
      'Approved At',
      'Approved By',
      'Approval Decision',
      'Approval Reason',
    ];

    const rows = handoverRows.map((row) => [
      form.name || form.email || 'N/A',
      profileId || selectedEmployeeId || 'N/A',
      workflowStatus,
      workflowStatusDetail,
      row.step,
      row.title,
      row.savedAt || 'Not yet',
      row.savedBy || '-',
      row.reviewedAt || 'Not reviewed',
      row.reviewedBy || '-',
      row.approvedAt || 'Pending approval',
      row.approvedBy || '-',
      row.approvalDecision || '',
      row.approvalReason || '',
    ]);

    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `onboarding-handover-${(form.name || profileId || 'employee').toString().replace(/\s+/g, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printHandoverSheet = () => {
    const printableRows = handoverRows.map((row) => `
      <tr>
        <td>${row.step}</td>
        <td>${row.title}</td>
        <td>${row.savedAt || 'Not yet'}</td>
        <td>${row.savedBy || '-'}</td>
        <td>${row.reviewedAt || 'Not reviewed'}</td>
        <td>${row.reviewedBy || '-'}</td>
        <td>${row.approvedAt || 'Pending approval'}</td>
        <td>${row.approvedBy || '-'}</td>
        <td>${row.approvalDecision || '-'}</td>
        <td>${row.approvalReason || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Onboarding Handover Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 22px; margin-bottom: 6px; }
            .meta { font-size: 12px; margin-bottom: 16px; color: #374151; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Employee Onboarding Handover Sheet</h1>
          <div class="meta">
            <div><strong>Employee:</strong> ${form.name || form.email || 'N/A'}</div>
            <div><strong>Profile ID:</strong> ${profileId || selectedEmployeeId || 'N/A'}</div>
            <div><strong>Workflow:</strong> ${workflowStatus} (${workflowStatusDetail})</div>
            <div><strong>Generated At:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Title</th>
                <th>Saved At</th>
                <th>Saved By</th>
                <th>Reviewed At</th>
                <th>Reviewed By</th>
                <th>Approved At</th>
                <th>Approved By</th>
                <th>Decision</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${printableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1024,height=720');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const persistStepState = async (employeeId: string, step: StepKey, completed: boolean, stepCursor: StepKey, stepData?: Record<string, any>) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/hr/onboarding/workflow-state', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
        body: JSON.stringify({
          employeeId,
          step,
          completed,
          mode,
          currentStep: stepCursor,
          ...(stepData ? { stepData } : {}),
        }),
      });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to persist onboarding state');
  };

  const loadWorkflowState = async (employeeId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/hr/onboarding/workflow-state?employeeId=${employeeId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setWorkflowStatus(String(payload?.state?.status || 'ONBOARDING_DRAFT'));
    setWorkflowStatusDetail(String(payload?.state?.statusDetail || 'IN_PROGRESS'));
    const steps = payload?.state?.steps || {};
    setWorkflowActors(payload?.actorMap || {});
    setWorkflowStepsMeta(steps);
    const normalized: Record<StepKey, boolean> = {
      joining: Boolean(steps?.joining?.completed),
      verification: Boolean(steps?.verification?.completed),
      job: Boolean(steps?.job?.completed),
      perks: Boolean(steps?.perks?.completed),
    };
    setStepSaved(normalized);
    const approvedNormalized: Record<StepKey, boolean> = {
      joining: false,
      verification: Boolean(steps?.verification?.approvedAt),
      job: false,
      perks: Boolean(steps?.perks?.approvedAt),
    };
    setStepApproved(approvedNormalized);
    if (payload?.state?.currentStep && STEP_KEYS.includes(payload.state.currentStep)) {
      setActiveStep(payload.state.currentStep);
    }
  };

  const loadSummary = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/hr/onboarding/workflow-state?summary=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setSummary(payload?.summary || null);
  };

  const loadTeamSnapshot = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/hr/onboarding/workflow-state?teamView=true', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setTeamRows(Array.isArray(payload?.rows) ? payload.rows : []);
    setTeamActorMap(payload?.actorMap || {});
  };

  const loadAssets = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/it/assets', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const payload = await res.json().catch(() => []);
    setAssets(Array.isArray(payload) ? payload : []);
  };

  const loadEmployeeFromTeamRow = async (employeeId: string) => {
    if (!employeeId) return;
    setMode('UPGRADE');
    setSelectedEmployeeId(employeeId);
    await loadEmployeeForUpgrade(employeeId);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          setUserRole(JSON.parse(userData)?.role || '');
        }
        const token = localStorage.getItem('token');
        const [empRes, depRes] = await Promise.all([
          fetch('/api/hr/employees?all=true', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch('/api/departments', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ]);

        const empData = empRes.ok ? await empRes.json() : [];
        const depPayload = depRes.ok ? await depRes.json() : [];
        const depData = depPayload?.data || depPayload || [];

        setEmployees(Array.isArray(empData) ? empData : []);
        setManagers((Array.isArray(empData) ? empData : []).filter((e: any) => ['MANAGER', 'TEAM_LEADER', 'ADMIN', 'SUPER_ADMIN', 'HR', 'HR_MANAGER'].includes(e?.user?.role)));
        setDepartments(Array.isArray(depData) ? depData : []);
        await Promise.all([loadSummary(), loadTeamSnapshot(), loadAssets()]);
      } catch {
        setEmployees([]);
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadEmployeeForUpgrade = async (id: string) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hr/employees/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Failed to load employee profile');
      const p = await res.json();
      const perks = p?.metrics?.onboardingWorkflow?.steps?.perks?.details || p?.metrics?.onboarding?.perks || {};
      setProfileId(p.id);
      setForm((prev: any) => ({
        ...prev,
        name: p.user?.name || '',
        email: p.user?.email || '',
        role: p.user?.role || 'EXECUTIVE',
        designation: p.designation || '',
        departmentId: p.user?.departmentId || '',
        managerId: p.user?.managerId || '',
        dateOfJoining: p.dateOfJoining ? p.dateOfJoining.split('T')[0] : '',
        employeeType: p.employeeType || 'FULL_TIME',
        baseSalary: p.baseSalary || '',
        phoneNumber: p.phoneNumber || '',
        officialEmail: p.officialEmail || '',
        personalEmail: p.personalEmail || '',
        panNumber: p.panNumber || '',
        aadharNumber: p.aadharNumber || '',
        uanNumber: p.uanNumber || '',
        pfNumber: p.pfNumber || '',
        offerLetterUrl: p.offerLetterUrl || '',
        contractUrl: p.contractUrl || '',
        jobDescription: p.jobDescription || '',
        kra: p.kra || '',
        monthlyTarget: p.monthlyTarget || '',
        yearlyTarget: p.yearlyTarget || '',
        pcAllotted: Boolean(perks.pcAllotted),
        mobileAllotted: Boolean(perks.mobileAllotted),
        softwareAccess: perks.softwareAccess || '',
        backupAccess: Boolean(perks.backupAccess),
        securityTools: perks.securityTools || '',
        otherBenefits: perks.otherBenefits || '',
        assetIds: Array.isArray(perks.assetIds) ? perks.assetIds : [],
      }));
      await loadWorkflowState(p.id);
      await loadTeamSnapshot();
      setStatusMessage('Loaded employee profile for upgrade mode.');
    } catch (e: any) {
      alert(e?.message || 'Failed to load employee profile');
    }
  };

  const clean = (value: any) => (value === '' ? null : value);

  const saveStep = async (step: StepKey) => {
    setSaving(true);
    setStatusMessage('');
    try {
      const token = localStorage.getItem('token');
      let effectiveProfileId = profileId;

      if (mode === 'NEW' && step === 'joining' && !effectiveProfileId) {
        if (!form.email || !form.password || !form.name || !form.designation || !form.baseSalary || !form.dateOfJoining) {
          throw new Error('Joining step requires name, email, password, designation, joining date, and base salary.');
        }
        const createPayload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          designation: form.designation,
          departmentId: clean(form.departmentId),
          managerId: clean(form.managerId),
          dateOfJoining: form.dateOfJoining,
          employeeType: form.employeeType,
          baseSalary: Number(form.baseSalary || 0),
        };
        const createRes = await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(createPayload),
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok) throw new Error(createData?.error || createData?.message || 'Failed to create employee');
        effectiveProfileId = createData?.profile?.id || '';
        setProfileId(effectiveProfileId);
        setSelectedEmployeeId(effectiveProfileId);
      }

      if (!effectiveProfileId && !(mode === 'NEW' && step === 'joining')) {
        throw new Error('Please complete Step 1 (Joining) first to create the employee profile.');
      }

      const targetId = effectiveProfileId || selectedEmployeeId;
      const basePatch: any = { id: targetId };

      if (step === 'joining') {
        Object.assign(basePatch, {
          name: form.name,
          role: form.role,
          designation: form.designation,
          departmentId: clean(form.departmentId),
          managerId: clean(form.managerId),
          dateOfJoining: clean(form.dateOfJoining),
          employeeType: form.employeeType,
          baseSalary: Number(form.baseSalary || 0),
        });
      }

      if (step === 'verification') {
        Object.assign(basePatch, {
          phoneNumber: clean(form.phoneNumber),
          officialEmail: clean(form.officialEmail),
          personalEmail: clean(form.personalEmail),
          panNumber: clean(form.panNumber),
          aadharNumber: clean(form.aadharNumber),
          uanNumber: clean(form.uanNumber),
          pfNumber: clean(form.pfNumber),
          offerLetterUrl: clean(form.offerLetterUrl),
          contractUrl: clean(form.contractUrl),
        });
      }

      if (step === 'job') {
        Object.assign(basePatch, {
          jobDescription: clean(form.jobDescription),
          kra: clean(form.kra),
          monthlyTarget: Number(form.monthlyTarget || 0),
          yearlyTarget: Number(form.yearlyTarget || 0),
        });
      }

      if (step === 'perks') {
        const stepData = {
          pcAllotted: Boolean(form.pcAllotted),
          mobileAllotted: Boolean(form.mobileAllotted),
          softwareAccess: form.softwareAccess || '',
          backupAccess: Boolean(form.backupAccess),
          securityTools: form.securityTools || '',
          otherBenefits: form.otherBenefits || '',
          assetIds: Array.isArray(form.assetIds) ? form.assetIds : [],
        };
        await persistStepState(targetId, step, true, step, stepData);
        setStepSaved((prev) => ({ ...prev, [step]: true }));
        await Promise.all([loadWorkflowState(targetId), loadSummary(), loadTeamSnapshot()]);
        setStatusMessage(`${STEPS.find((s) => s.key === step)?.title} saved successfully.`);
        return;
      }

      if (!(mode === 'NEW' && step === 'joining' && !targetId)) {
        const patchRes = await fetch('/api/hr/employees', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(basePatch),
        });
        const patchData = await patchRes.json().catch(() => ({}));
        if (!patchRes.ok) throw new Error(patchData?.error || patchData?.message || 'Failed to save step');
      }

      setStepSaved((prev) => ({ ...prev, [step]: true }));
      await persistStepState(targetId, step, true, step);
      await Promise.all([loadWorkflowState(targetId), loadSummary(), loadTeamSnapshot()]);
      setStatusMessage(`${STEPS.find((s) => s.key === step)?.title} saved successfully.`);
    } catch (e: any) {
      alert(e?.message || 'Failed to save step');
    } finally {
      setSaving(false);
    }
  };

  const approvableStep = activeStep === 'verification' || activeStep === 'perks';

  const approveStep = async (step: 'verification' | 'perks', decision: 'approved' | 'rejected') => {
    const targetId = profileId || selectedEmployeeId;
    if (!targetId) {
      alert('Please load or create an employee first.');
      return;
    }
    setApproving(true);
    try {
      const token = localStorage.getItem('token');
      const reason = decision === 'rejected' ? (prompt('Reason for rejection') || '').trim() : '';
      const res = await fetch('/api/hr/onboarding/workflow-state', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          employeeId: targetId,
          step,
          action: 'approve',
          approvalDecision: decision,
          approvalReason: reason || null,
          currentStep: step,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.message || 'Failed to update approval');
      await Promise.all([loadWorkflowState(targetId), loadSummary(), loadTeamSnapshot(), loadAssets()]);
      const assignedNote = step === 'perks' && payload?.assignedAssetCount
        ? ` ${payload.assignedAssetCount} asset(s) assigned.`
        : '';
      setStatusMessage(`${step === 'verification' ? 'Verification' : 'Perks'} ${decision}.${assignedNote}`);
    } catch (e: any) {
      alert(e?.message || 'Failed to update approval');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-secondary-500">Preparing onboarding workflow...</div>;

  return (
    <div className="space-y-6">
      <div className="card-premium p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-secondary-900">Employee Onboarding Workflow</h2>
            <p className="text-sm text-secondary-500">Structured 4-step flow for onboarding and profile upgrades.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={`btn text-xs ${mode === 'NEW' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('NEW'); setSelectedEmployeeId(''); setProfileId(''); setStatusMessage(''); setStepSaved({ joining: false, verification: false, job: false, perks: false }); setStepApproved({ joining: false, verification: false, job: false, perks: false }); setWorkflowStatus('ONBOARDING_DRAFT'); setWorkflowStatusDetail('IN_PROGRESS'); }}>
              New Onboarding
            </button>
            <button className={`btn text-xs ${mode === 'UPGRADE' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('UPGRADE')}>
              Upgrade Existing Profile
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-secondary-100 text-secondary-700 border border-secondary-200">
            {workflowStatus}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-primary-50 text-primary-700 border border-primary-200">
            {workflowStatusDetail}
          </span>
        </div>

        {mode === 'UPGRADE' ? (
          <div className="mt-4 flex gap-2">
            <select
              className="input w-full"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">Select employee</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>{e.user?.name || e.user?.email} ({e.designation || 'N/A'})</option>
              ))}
            </select>
            <button className="btn btn-secondary text-xs" onClick={() => loadEmployeeForUpgrade(selectedEmployeeId)} disabled={!selectedEmployeeId}>Load</button>
          </div>
        ) : null}
      </div>

      {canApprove ? (
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-secondary-900">Team Workflow Snapshot</h3>
            <div className="flex items-center gap-2">
              <button className={`btn text-[11px] px-2 py-1 ${teamFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTeamFilter('ALL')}>All</button>
              <button className={`btn text-[11px] px-2 py-1 ${teamFilter === 'PENDING_APPROVAL' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTeamFilter('PENDING_APPROVAL')}>Pending Approval</button>
              <button className={`btn text-[11px] px-2 py-1 ${teamFilter === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTeamFilter('COMPLETED')}>Completed</button>
              <button className={`btn text-[11px] px-2 py-1 ${teamFilter === 'BLOCKED' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTeamFilter('BLOCKED')}>Blocked</button>
            </div>
          </div>
          <p className="text-xs text-secondary-500 mb-2">Latest 50 profiles with audit ownership</p>
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left border-b border-secondary-100">
                  <th className="py-2 pr-3 font-black text-secondary-600">Employee</th>
                  <th className="py-2 pr-3 font-black text-secondary-600">Status</th>
                  <th className="py-2 pr-3 font-black text-secondary-600">Verification</th>
                  <th className="py-2 pr-3 font-black text-secondary-600">Perks</th>
                  <th className="py-2 pr-3 font-black text-secondary-600">Updated</th>
                  <th className="py-2 pr-3 font-black text-secondary-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamRows.map((row: any) => {
                  const verification = row?.steps?.verification || {};
                  const perks = row?.steps?.perks || {};
                  const verificationApprover = verification?.approvedBy ? (teamActorMap[String(verification.approvedBy)] || String(verification.approvedBy)) : '-';
                  const perksApprover = perks?.approvedBy ? (teamActorMap[String(perks.approvedBy)] || String(perks.approvedBy)) : '-';
                  return (
                    <tr key={row.employeeId} className="border-b border-secondary-50">
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-secondary-900">{row.employeeName || row.employeeEmail || row.employeeId}</div>
                        <div className="text-secondary-500">{row.designation || 'N/A'}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-secondary-800">{row.status}</div>
                        <div className="text-secondary-500">{row.statusDetail}</div>
                      </td>
                      <td className="py-2 pr-3 text-secondary-700">
                        <div>{verification?.approvedAt ? 'Approved' : verification?.completed ? 'Pending Approval' : 'Pending Save'}</div>
                        <div className="text-secondary-500">By: {verificationApprover}</div>
                      </td>
                      <td className="py-2 pr-3 text-secondary-700">
                        <div>{perks?.approvedAt ? 'Approved' : perks?.completed ? 'Pending Approval' : 'Pending Save'}</div>
                        <div className="text-secondary-500">By: {perksApprover}</div>
                      </td>
                      <td className="py-2 pr-3 text-secondary-600">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : 'N/A'}</td>
                      <td className="py-2 pr-3">
                        <button
                          className="btn btn-secondary text-[11px] px-2 py-1"
                          onClick={() => loadEmployeeFromTeamRow(row.employeeId)}
                        >
                          Load
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredTeamRows.length ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-secondary-500">No workflows found for selected filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="card-premium p-5">
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
            <Stat label="In Progress" value={summary.inProgress} />
            <Stat label="Blocked at Verification" value={summary.blockedAtVerification} />
            <Stat label="Blocked at Perks" value={summary.blockedAtPerks} />
            <Stat label="Pending Approvals" value={summary.pendingApprovals} />
            <Stat label="Completed This Month" value={summary.completedThisMonth} />
            <Stat label="Avg Completion Days" value={summary.avgCompletionDays} />
          </div>
        ) : null}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-wider text-secondary-500">Overall Progress</p>
          <p className="text-sm font-black text-secondary-900">{progress}%</p>
        </div>
        <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-4">
          {STEPS.map((s) => (
            <button
              key={s.key}
              className={`text-left p-3 rounded-xl border ${activeStep === s.key ? 'border-primary-500 bg-primary-50' : 'border-secondary-100 bg-white'}`}
              onClick={() => setActiveStep(s.key)}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-secondary-500">{s.subtitle}</p>
              <p className="text-sm font-black text-secondary-900">{s.title}</p>
              <p className={`text-[10px] font-bold mt-1 ${stepSaved[s.key] ? 'text-success-600' : 'text-secondary-400'}`}>
                {stepSaved[s.key] ? 'Saved' : 'Pending'}
              </p>
              {(s.key === 'verification' || s.key === 'perks') ? (
                <p className={`text-[10px] font-bold mt-1 ${stepApproved[s.key] ? 'text-primary-700' : 'text-amber-600'}`}>
                  {stepApproved[s.key] ? 'Approved' : 'Pending Approval'}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-secondary-900">Onboarding Activity Timeline</h3>
          <div className="flex gap-2">
            <button className="btn btn-secondary text-xs" onClick={exportTimelineCsv}>Export CSV</button>
            <button className="btn btn-primary text-xs" onClick={printHandoverSheet}>Print Handover Sheet</button>
          </div>
        </div>
        <div className="space-y-3">
          {STEPS.map((s) => {
            const meta = workflowStepsMeta?.[s.key] || {};
            const savedAt = meta?.savedAt ? new Date(meta.savedAt).toLocaleString() : null;
            const approvedAt = meta?.approvedAt ? new Date(meta.approvedAt).toLocaleString() : null;
            const reviewedAt = meta?.reviewedAt ? new Date(meta.reviewedAt).toLocaleString() : null;
            const savedBy = meta?.savedBy ? (workflowActors[String(meta.savedBy)] || String(meta.savedBy)) : null;
            const reviewedBy = meta?.reviewedBy ? (workflowActors[String(meta.reviewedBy)] || String(meta.reviewedBy)) : null;
            const approvedBy = meta?.approvedBy ? (workflowActors[String(meta.approvedBy)] || String(meta.approvedBy)) : null;
            return (
              <div key={s.key} className="border border-secondary-100 rounded-xl p-3 bg-white">
                <p className="text-xs font-black uppercase tracking-wider text-secondary-500">{s.subtitle}</p>
                <p className="text-sm font-bold text-secondary-900">{s.title}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary-50 px-2 py-1">
                    <span className="font-black text-secondary-600">Saved:</span>{' '}
                    <span className="text-secondary-700">{savedAt || 'Not yet'}{savedBy ? ` by ${savedBy}` : ''}</span>
                  </div>
                  <div className="rounded-lg bg-secondary-50 px-2 py-1">
                    <span className="font-black text-secondary-600">Reviewed:</span>{' '}
                    <span className="text-secondary-700">{reviewedAt || 'Not reviewed'}{reviewedBy ? ` by ${reviewedBy}` : ''}</span>
                  </div>
                  <div className="rounded-lg bg-secondary-50 px-2 py-1">
                    <span className="font-black text-secondary-600">Approved:</span>{' '}
                    <span className="text-secondary-700">{approvedAt || 'Pending approval'}{approvedBy ? ` by ${approvedBy}` : ''}</span>
                  </div>
                </div>
                {meta?.approvalDecision ? (
                  <p className="mt-2 text-xs text-secondary-700">
                    Decision: <span className="font-bold uppercase">{String(meta.approvalDecision)}</span>
                    {meta?.approvalReason ? ` | Reason: ${meta.approvalReason}` : ''}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-premium p-5 space-y-4">
        {activeStep === 'joining' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Work Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={mode === 'UPGRADE'} />
            <input className="input" type="password" placeholder="Password (new onboarding)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={mode === 'UPGRADE'} />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {['EXECUTIVE', 'TEAM_LEADER', 'MANAGER', 'HR', 'HR_MANAGER'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="input" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Department</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">Reporting Manager</option>
              {managers.map((m: any) => <option key={m.id} value={m.user?.id}>{m.user?.name || m.user?.email}</option>)}
            </select>
            <input className="input" type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} />
            <select className="input" value={form.employeeType} onChange={(e) => setForm({ ...form, employeeType: e.target.value })}>
              {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TRAINEE'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="input" type="number" placeholder="Base Salary" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
          </div>
        ) : null}

        {activeStep === 'verification' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="input" placeholder="Phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
            <input className="input" placeholder="Official Email" value={form.officialEmail} onChange={(e) => setForm({ ...form, officialEmail: e.target.value })} />
            <input className="input" placeholder="Personal Email" value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
            <input className="input" placeholder="PAN Number" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
            <input className="input" placeholder="Aadhar Number" value={form.aadharNumber} onChange={(e) => setForm({ ...form, aadharNumber: e.target.value })} />
            <input className="input" placeholder="UAN Number" value={form.uanNumber} onChange={(e) => setForm({ ...form, uanNumber: e.target.value })} />
            <input className="input" placeholder="PF Number" value={form.pfNumber} onChange={(e) => setForm({ ...form, pfNumber: e.target.value })} />
            <input className="input" placeholder="Offer Letter URL" value={form.offerLetterUrl} onChange={(e) => setForm({ ...form, offerLetterUrl: e.target.value })} />
            <input className="input md:col-span-2" placeholder="Contract URL" value={form.contractUrl} onChange={(e) => setForm({ ...form, contractUrl: e.target.value })} />
          </div>
        ) : null}

        {activeStep === 'job' ? (
          <div className="space-y-3">
            <textarea className="input w-full min-h-[120px]" placeholder="Job Description" value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} />
            <textarea className="input w-full min-h-[120px]" placeholder="KRA / Responsibilities" value={form.kra} onChange={(e) => setForm({ ...form, kra: e.target.value })} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input" type="number" placeholder="Monthly Target" value={form.monthlyTarget} onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })} />
              <input className="input" type="number" placeholder="Yearly Target" value={form.yearlyTarget} onChange={(e) => setForm({ ...form, yearlyTarget: e.target.value })} />
            </div>
          </div>
        ) : null}

        {activeStep === 'perks' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-secondary-700"><input type="checkbox" checked={form.pcAllotted} onChange={(e) => setForm({ ...form, pcAllotted: e.target.checked })} /> PC/Laptop Allotted</label>
              <label className="flex items-center gap-2 text-sm font-semibold text-secondary-700"><input type="checkbox" checked={form.mobileAllotted} onChange={(e) => setForm({ ...form, mobileAllotted: e.target.checked })} /> Mobile Allotted</label>
              <label className="flex items-center gap-2 text-sm font-semibold text-secondary-700"><input type="checkbox" checked={form.backupAccess} onChange={(e) => setForm({ ...form, backupAccess: e.target.checked })} /> Backup Access Enabled</label>
            </div>
            <input className="input" placeholder="Software Access (comma-separated)" value={form.softwareAccess} onChange={(e) => setForm({ ...form, softwareAccess: e.target.value })} />
            <input className="input" placeholder="Security Tools / Access" value={form.securityTools} onChange={(e) => setForm({ ...form, securityTools: e.target.value })} />
            <textarea className="input w-full min-h-[90px]" placeholder="Other Benefits / Allotments" value={form.otherBenefits} onChange={(e) => setForm({ ...form, otherBenefits: e.target.value })} />

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-secondary-500 mb-1">Company Assets</p>
              <p className="text-xs text-secondary-500 mb-2">Selected assets are marked assigned to this employee when Perks is approved.</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-secondary-200 p-2 space-y-1">
                {(() => {
                  const selectable = assets.filter((a) => a.status === 'AVAILABLE' || form.assetIds.includes(a.id));
                  if (selectable.length === 0) {
                    return <p className="text-xs text-secondary-400">No available assets. Add assets under IT Management → Assets.</p>;
                  }
                  return selectable.map((a) => {
                    const checked = form.assetIds.includes(a.id);
                    const alreadyAssigned = a.status === 'ASSIGNED' && checked;
                    return (
                      <label key={a.id} className="flex items-center gap-2 text-sm text-secondary-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={alreadyAssigned}
                          onChange={(e) => setForm((f: any) => ({
                            ...f,
                            assetIds: e.target.checked
                              ? [...f.assetIds, a.id]
                              : f.assetIds.filter((x: string) => x !== a.id),
                          }))}
                        />
                        <span className="font-semibold">{a.name}</span>
                        <span className="text-secondary-400">({a.type}{a.serialNumber ? ` · ${a.serialNumber}` : ''})</span>
                        {alreadyAssigned ? <span className="text-[10px] font-black text-success-600 uppercase">Assigned</span> : null}
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary-100 pt-4">
          <p className="text-xs font-semibold text-secondary-500">
            {statusMessage || (approvableStep && !stepSaved[activeStep]
              ? 'Save this step first, then approval actions will unlock.'
              : 'Save each step independently to keep onboarding structured and trackable.')}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-secondary text-xs" onClick={() => setActiveStep(STEPS[Math.max(0, STEPS.findIndex((s) => s.key === activeStep) - 1)].key)} disabled={STEPS.findIndex((s) => s.key === activeStep) === 0}>Previous</button>
            <button className="btn btn-primary text-xs" onClick={() => saveStep(activeStep)} disabled={saving}>{saving ? 'Saving...' : `Save ${STEPS.find((s) => s.key === activeStep)?.title}`}</button>
            {canApprove && approvableStep ? (
              <>
                <button className="btn btn-secondary text-xs" onClick={() => approveStep(activeStep as 'verification' | 'perks', 'approved')} disabled={approving || !stepSaved[activeStep]}>
                  {approving ? 'Updating...' : `Approve ${activeStep === 'verification' ? 'Verification' : 'Perks'}`}
                </button>
                <button className="btn bg-danger-50 text-danger-700 border border-danger-200 text-xs" onClick={() => approveStep(activeStep as 'verification' | 'perks', 'rejected')} disabled={approving || !stepSaved[activeStep]}>
                  Reject
                </button>
              </>
            ) : null}
            <button className="btn btn-secondary text-xs" onClick={() => setActiveStep(STEPS[Math.min(STEPS.length - 1, STEPS.findIndex((s) => s.key === activeStep) + 1)].key)} disabled={STEPS.findIndex((s) => s.key === activeStep) === STEPS.length - 1}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-secondary-100 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider font-black text-secondary-500">{label}</p>
      <p className="text-lg font-black text-secondary-900 mt-1">{value}</p>
    </div>
  );
}
