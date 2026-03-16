# Architecture: HRMS Module Structure

## Module Overview

The HRMS module manages employee lifecycle within a tenant — from onboarding to attendance, leave workflows, and payroll-ready data structures. It integrates with LMS for training tracking and CRM for employee-client relationship visibility.

## Data Models

```typescript
// Employee Profile
interface Employee {
  _id: ObjectId;
  tenantId: string;
  userId: string;          // Linked to User document
  employeeCode: string;    // AUTO: EMP-0001
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation: string;
  departmentId: ObjectId;
  managerId?: string;
  dateOfJoining: Date;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  status: 'active' | 'on_leave' | 'terminated';
  address?: Address;
  documents: EmployeeDocument[];
  salary: SalaryStructure;
  createdAt: Date;
}

// Department
interface Department {
  _id: ObjectId;
  tenantId: string;
  name: string;
  headId?: string;       // Employee who leads this dept
  parentId?: ObjectId;   // For nested departments
}

// Attendance
interface AttendanceRecord {
  _id: ObjectId;
  tenantId: string;
  employeeId: ObjectId;
  date: Date;            // YYYY-MM-DD, indexed
  checkIn?: Date;
  checkOut?: Date;
  totalHours?: number;
  status: 'present' | 'absent' | 'half_day' | 'work_from_home' | 'on_leave';
  location?: GeoPoint;   // For geofenced check-in
  note?: string;
}

// Leave Request
interface LeaveRequest {
  _id: ObjectId;
  tenantId: string;
  employeeId: ObjectId;
  type: 'casual' | 'sick' | 'annual' | 'unpaid' | 'maternity' | 'paternity';
  fromDate: Date;
  toDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedById?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}

// Payroll Structure (data model only — payroll processing TBD)
interface SalaryStructure {
  basic: number;
  hra: number;            // House Rent Allowance
  specialAllowance: number;
  pf: number;             // Provident Fund deduction
  professionalTax: number;
  grossSalary: number;    // Computed
  netSalary: number;      // Computed
  currency: string;
}
```

## API Endpoints

```
POST   /api/v1/hrms/employees               # Create employee
GET    /api/v1/hrms/employees               # List (scoped by role)
GET    /api/v1/hrms/employees/:id           # Employee profile
PUT    /api/v1/hrms/employees/:id           # Update profile
DELETE /api/v1/hrms/employees/:id           # Deactivate (soft delete)

POST   /api/v1/hrms/attendance/check-in     # Mobile check-in
POST   /api/v1/hrms/attendance/check-out    # Mobile check-out
GET    /api/v1/hrms/attendance              # List attendance records
GET    /api/v1/hrms/attendance/summary/:employeeId    # Monthly summary

POST   /api/v1/hrms/leaves/apply            # Apply for leave
GET    /api/v1/hrms/leaves                  # My leave requests
PUT    /api/v1/hrms/leaves/:id/review       # Approve/reject (Manager+)
GET    /api/v1/hrms/leaves/balance          # Leave balance summary

GET    /api/v1/hrms/departments             # Org chart data
POST   /api/v1/hrms/departments             # Create department
```

## Attendance System — Mobile Geofencing

```typescript
// Mobile check-in with optional geolocation validation
interface CheckInPayload {
  employeeId: string;
  tenantId: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;     // meters
  };
}

function isWithinGeofence(employeeLocation: GeoPoint, officeLocation: GeoPoint, radiusMeters: number): boolean {
  const distance = haversineDistance(employeeLocation, officeLocation);
  return distance <= radiusMeters;
}
```

## Leave Balance Engine

```typescript
interface LeaveBalance {
  employeeId: string;
  year: number;
  casual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  annual: { total: number; used: number; remaining: number };
}

// Recalculated on every leave approval
async function recalculateBalance(employeeId: string, year: number) {
  const approvedLeaves = await Leave.find({
    employeeId,
    status: 'approved',
    fromDate: { $gte: new Date(year, 0, 1) },
  });

  const used = approvedLeaves.reduce((acc, leave) => {
    acc[leave.type] = (acc[leave.type] || 0) + leave.days;
    return acc;
  }, {});

  await LeaveBalance.findOneAndUpdate(
    { employeeId, year },
    { $set: { used } },
    { upsert: true }
  );
}
```

## LMS Integration

When an employee is onboarded:
```
Employee created → eventBus.emit('hrms.employee.onboarded')
  → LMS listener: auto-enroll in company onboarding courses
  → CRM listener: create internal contact record
```


## Updated: 2026-03-16

**Leave balance recalculation:** Moved leave balance computation from synchronous API response to post-approval event. Manager sees approval response in 40ms; balance update happens async within 200ms. Resolves latency spike on high-volume approval days.
