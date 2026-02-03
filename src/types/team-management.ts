/**
 * TypeScript type definitions for Unified Team Management Module
 * 
 * These types define the response structures for cross-company team management APIs.
 * All types include companyId and companyName for proper context when viewing data
 * across multiple companies.
 */

export interface TeamMemberWithDetails {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  companyId: string;
  companyName: string;
  designation: string | null;
  role: string | null;
  isActive: boolean;
  assignedAt: Date;
  employeeProfile: {
    employeeId: string | null;
    designation: string | null;
    dateOfJoining: Date | null;
    baseSalary: number | null;
  } | null;
}

export interface UnifiedAttendanceRecord {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  lateMinutes: number | null;
  shortLeaveMinutes: number | null;
  workFrom: string | null;
  employee: {
    id: string;
    userId: string;
    user: {
      name: string | null;
      email: string;
      companyId: string | null;
    };
  };
  companyId: string | null;
  companyName: string;
}

export interface UnifiedLeaveRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  reason: string | null;
  employee: {
    id: string;
    userId: string;
    user: {
      name: string | null;
      email: string;
      companyId: string | null;
    };
  };
  companyId: string;
  companyName: string;
  approvedBy: {
    name: string | null;
    email: string;
  } | null;
}

export interface UnifiedWorkReport {
  id: string;
  date: Date;
  tasks: string | null;
  achievements: string | null;
  challenges: string | null;
  status: string;
  employee: {
    id: string;
    userId: string;
    user: {
      name: string | null;
      email: string;
      companyId: string | null;
    };
  };
  companyId: string;
  companyName: string;
}

export interface UnifiedSalaryInfo {
  userId: string;
  userName: string | null;
  userEmail: string;
  companyId: string;
  companyName: string;
  employeeProfile: {
    employeeId: string | null;
    designation: string | null;
    baseSalary: number | null;
    fixedSalary: number | null;
    variableSalary: number | null;
    lastIncrementDate: Date | null;
    lastIncrementPercentage: number | null;
  } | null;
  incrementHistory: Array<{
    id: string;
    effectiveDate: Date;
    previousSalary: number | null;
    newSalary: number | null;
    incrementPercentage: number | null;
    status: string;
  }>;
}

export interface UnifiedPerformanceData {
  userId: string;
  userName: string | null;
  userEmail: string;
  companyId: string;
  companyName: string;
  kpis: Array<{
    id: string;
    metric: string;
    target: number | null;
    achieved: number | null;
    period: string;
  }>;
  reviews: Array<{
    id: string;
    period: string;
    rating: number | null;
    feedback: string | null;
    createdAt: Date;
  }>;
}

// Request body types
export interface AddTeamMemberRequest {
  userId: string;
  companyId: string;
  role?: string;
}

export interface ProposeIncrementRequest {
  userId: string;
  companyId: string;
  incrementPercentage: number;
  effectiveDate: Date;
  justification: string;
}

export interface ApproveLeaveRequest {
  status: 'APPROVED' | 'REJECTED';
  remarks?: string;
}
