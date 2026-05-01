import { prisma } from '@/lib/prisma';
import { TokenPayload } from '@/lib/auth-core';
import { getDownlineUserIds } from '@/lib/hierarchy';

type ListStaffEmployeesInput = {
  user: TokenPayload;
  params: URLSearchParams;
};

export async function listStaffEmployees({ user, params }: ListStaffEmployeesInput) {
  const companyId = params.get('companyId');
  const departmentId = params.get('departmentId');
  const id = params.get('id');
  const status = params.get('status');
  const showAll = params.get('all') === 'true';

  const where: any = {
    employeeProfile: {
      isNot: null,
    },
  };

  // Canonical tenant scoping:
  // - SUPER_ADMIN can see all (unless companyId is specified)
  // - Everyone else is always scoped to their session companyId
  if (user.role === 'SUPER_ADMIN') {
    if (companyId && companyId !== 'all') where.companyId = companyId;
  } else {
    if (!user.companyId) return [];
    where.companyId = user.companyId;

    // ADMIN/HR roles can still request "showAll", but within company
    void showAll;
  }

  if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
    where.id = { in: Array.from(new Set([...subIds, user.id])) };
  }

  if (departmentId && departmentId !== 'all') {
    where.departmentId = departmentId;
  }

  if (id && id !== 'all') {
    where.id = id;
  }

  if (status && status !== 'all') {
    where.isActive = status === 'ACTIVE';
  }

  const search = params.get('search');
  const searchType = params.get('searchType') || 'all';

  if (search) {
    if (searchType === 'all') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeProfile: { phoneNumber: { contains: search, mode: 'insensitive' } } },
        { employeeProfile: { employeeId: { contains: search, mode: 'insensitive' } } },
      ];
    } else if (searchType === 'name') {
      where.name = { contains: search, mode: 'insensitive' };
    } else if (searchType === 'email') {
      where.email = { contains: search, mode: 'insensitive' };
    } else if (searchType === 'phone') {
      where.employeeProfile = { ...where.employeeProfile, phoneNumber: { contains: search, mode: 'insensitive' } };
    } else if (searchType === 'id') {
      where.employeeProfile = { ...where.employeeProfile, employeeId: { contains: search, mode: 'insensitive' } };
    }
  }

  const employees = await prisma.user.findMany({
    where,
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      employeeProfile: {
        include: {
          designatRef: true,
          performanceSnapshots: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 1,
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return employees.map((emp: any) => {
    const profile = emp.employeeProfile;

    let experienceStr = '';
    if (profile) {
      const years = (profile.totalExperienceYears || 0) + (profile.relevantExperienceYears || 0);
      const months = (profile.totalExperienceMonths || 0) + (profile.relevantExperienceMonths || 0);
      const totalYears = years + Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (totalYears > 0) experienceStr += `${totalYears} Y `;
      if (remainingMonths > 0) experienceStr += `${remainingMonths} M`;
    }

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: profile?.phoneNumber || '',
      companyId: emp.companyId,
      companyName: emp.company?.name || '-',
      departmentId: emp.departmentId,
      designationId: profile?.designationId,
      dateOfJoining: profile?.dateOfJoining,
      status: emp.isActive ? 'ACTIVE' : 'INACTIVE',
      department: emp.department,
      manager: emp.manager ? { name: emp.manager.name, id: emp.manager.id } : null,
      designation: profile?.designatRef
        ? {
            title: profile.designatRef.name,
            ...profile.designatRef,
          }
        : null,
      baseSalary: profile?.baseSalary || 0,
      skills: profile?.skills || [],
      performanceSnapshots: profile?.performanceSnapshots || [],
      calculatedTotalExperience: experienceStr.trim(),
      profilePicture: profile?.profilePicture,
    };
  });
}

