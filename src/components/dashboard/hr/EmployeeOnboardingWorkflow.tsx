'use client';

import { useEffect, useMemo, useState } from 'react';

type Mode = 'NEW' | 'UPGRADE';

type StepKey = 'joining' | 'verification' | 'job' | 'perks';

const STEPS: Array<{ key: StepKey; title: string; subtitle: string }> = [
  { key: 'joining', subtitle: 'Step 1', title: 'Joining' },
  { key: 'verification', subtitle: 'Step 2', title: 'Profile Verification' },
  { key: 'job', subtitle: 'Step 3', title: 'Job Description & Work Details' },
  { key: 'perks', subtitle: 'Step 4', title: 'Perks & Allotments' },
];

export default function EmployeeOnboardingWorkflow() {
  const [mode, setMode] = useState<Mode>('NEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>('joining');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [stepSaved, setStepSaved] = useState<Record<StepKey, boolean>>({
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
  });

  const progress = useMemo(() => {
    const done = Object.values(stepSaved).filter(Boolean).length;
    return Math.round((done / STEPS.length) * 100);
  }, [stepSaved]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
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
      const perks = p?.metrics?.onboarding?.perks || {};
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
      }));
      setStepSaved({ joining: true, verification: true, job: true, perks: true });
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

      if (mode === 'NEW' && step === 'joining' && !profileId) {
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
        setProfileId(createData?.profile?.id || '');
        setSelectedEmployeeId(createData?.profile?.id || '');
      }

      if (!profileId && !(mode === 'NEW' && step === 'joining')) {
        throw new Error('Please complete Step 1 (Joining) first to create the employee profile.');
      }

      const targetId = profileId || selectedEmployeeId;
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
        const selected = employees.find((e: any) => e.id === targetId);
        const currentMetrics = selected?.metrics || {};
        Object.assign(basePatch, {
          metrics: {
            ...currentMetrics,
            onboarding: {
              ...(currentMetrics?.onboarding || {}),
              perks: {
                pcAllotted: Boolean(form.pcAllotted),
                mobileAllotted: Boolean(form.mobileAllotted),
                softwareAccess: form.softwareAccess || '',
                backupAccess: Boolean(form.backupAccess),
                securityTools: form.securityTools || '',
                otherBenefits: form.otherBenefits || '',
              }
            }
          }
        });
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
      setStatusMessage(`${STEPS.find((s) => s.key === step)?.title} saved successfully.`);
    } catch (e: any) {
      alert(e?.message || 'Failed to save step');
    } finally {
      setSaving(false);
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
            <button className={`btn text-xs ${mode === 'NEW' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('NEW'); setSelectedEmployeeId(''); setProfileId(''); setStatusMessage(''); setStepSaved({ joining: false, verification: false, job: false, perks: false }); }}>
              New Onboarding
            </button>
            <button className={`btn text-xs ${mode === 'UPGRADE' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('UPGRADE')}>
              Upgrade Existing Profile
            </button>
          </div>
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

      <div className="card-premium p-5">
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
            </button>
          ))}
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
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary-100 pt-4">
          <p className="text-xs font-semibold text-secondary-500">{statusMessage || 'Save each step independently to keep onboarding structured and trackable.'}</p>
          <div className="flex gap-2">
            <button className="btn btn-secondary text-xs" onClick={() => setActiveStep(STEPS[Math.max(0, STEPS.findIndex((s) => s.key === activeStep) - 1)].key)} disabled={STEPS.findIndex((s) => s.key === activeStep) === 0}>Previous</button>
            <button className="btn btn-primary text-xs" onClick={() => saveStep(activeStep)} disabled={saving}>{saving ? 'Saving...' : `Save ${STEPS.find((s) => s.key === activeStep)?.title}`}</button>
            <button className="btn btn-secondary text-xs" onClick={() => setActiveStep(STEPS[Math.min(STEPS.length - 1, STEPS.findIndex((s) => s.key === activeStep) + 1)].key)} disabled={STEPS.findIndex((s) => s.key === activeStep) === STEPS.length - 1}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
