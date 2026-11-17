import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  MessManagementState,
  TechnicianProfile,
} from '../types/hostelCare';
import { getTechnicianWorkloadLabel } from '../utils/complaintHelpers';

export interface AiTriageResult {
  suggestedTitle: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  safetyNotice: string;
  likelyPartsNeeded: string[];
  reasoning: string;
  analyzedPhoto: boolean;
}

export interface AiDispatchPlanResult {
  recommendedTechnicianId: string;
  recommendedTechnicianName: string;
  assignmentRationale: string;
  estimatedDurationMinutes: number;
  diagnosticSteps: string[];
  toolsAndSpares: string[];
  draftStudentMessage: string;
}

export interface AiRepairAuditResult {
  verificationStatus: 'Verified' | 'Needs Closer Inspection' | 'Insufficient Proof';
  summary: string;
  checksPassed: string[];
  recommendation: string;
  comparedBeforeAfter: boolean;
}

export interface AiWardenBriefingResult {
  headline: string;
  urgentActions: Array<{ complaintId: string; action: string }>;
  bottlenecks: string[];
  answer: string;
}

export interface AiMessBriefingResult {
  headline: string;
  crowdRiskLevel: 'Nominal' | 'Elevated' | 'Surge Alert';
  recommendedActions: Array<{ hallName: string; action: string }>;
  kitchenPrepGuidance: string;
  answer: string;
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string' && data.error
        ? data.error
        : `AI request failed (${res.status})`
    );
  }
  return data as T;
}

export function requestAiFaultTriage(payload: {
  description?: string;
  title?: string;
  photoDataUrl?: string;
}): Promise<AiTriageResult> {
  return postJson<AiTriageResult>('/api/ai/triage', payload);
}

export function requestAiDispatchPlan(
  complaint: Complaint,
  technicians: TechnicianProfile[],
  allComplaints: Complaint[]
): Promise<AiDispatchPlanResult> {
  return postJson<AiDispatchPlanResult>('/api/ai/dispatch-plan', {
    complaint: {
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      hostelName: complaint.hostelName,
      block: complaint.block,
      roomNumber: complaint.roomNumber,
      preferredAvailability: complaint.preferredAvailability,
      beforePhotos: complaint.beforePhotos,
    },
    technicians: technicians.map((t) => {
      const load = getTechnicianWorkloadLabel(t, allComplaints);
      return {
        id: t.id,
        name: t.name,
        specialty: t.specialty,
        categories: t.categories,
        availability: t.availability,
        activeJobs: load.active,
        maxDailyJobs: t.maxDailyJobs,
        rating: t.rating,
      };
    }),
  });
}

export function requestAiRepairVerification(payload: {
  complaintTitle: string;
  category: string;
  beforePhoto?: string;
  afterPhoto?: string;
}): Promise<AiRepairAuditResult> {
  return postJson<AiRepairAuditResult>('/api/ai/verify-repair', payload);
}

export function requestAiWardenBriefing(payload: {
  complaints: Complaint[];
  technicians: TechnicianProfile[];
  allComplaints: Complaint[];
  simulatedOffsetHours: number;
  question?: string;
}): Promise<AiWardenBriefingResult> {
  return postJson<AiWardenBriefingResult>('/api/ai/warden-briefing', {
    complaints: payload.complaints.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      hostelName: c.hostelName,
      block: c.block,
      roomNumber: c.roomNumber,
      assignedTechnicianName: c.assignedTechnicianName,
      isOverdue: c.isOverdue,
      reopenCount: c.reopenCount,
      escalationLevel: c.escalationLevel,
    })),
    technicians: payload.technicians.map((t) => {
      const load = getTechnicianWorkloadLabel(t, payload.allComplaints);
      return {
        name: t.name,
        specialty: t.specialty,
        availability: t.availability,
        activeJobs: load.active,
        maxDailyJobs: t.maxDailyJobs,
      };
    }),
    simulatedOffsetHours: payload.simulatedOffsetHours,
    question: payload.question,
  });
}

export function requestAiMessBriefing(payload: {
  mess: MessManagementState;
  question?: string;
}): Promise<AiMessBriefingResult> {
  return postJson<AiMessBriefingResult>('/api/ai/mess-briefing', {
    activeMeal: payload.mess.activeMeal,
    halls: payload.mess.halls.map((h) => ({
      id: h.id,
      name: h.name,
      capacity: h.capacity,
      currentOccupancy: h.currentOccupancy,
      entryRatePerMin: h.entryRatePerMin,
      exitRatePerMin: h.exitRatePerMin,
      overflowRedirectTo: h.overflowRedirectTo,
      counters: h.counters.map((c) => ({
        name: c.name,
        status: c.status,
        queueLength: c.queueLength,
        avgWaitMinutes: c.avgWaitMinutes,
        batchLevelPct: c.batchLevelPct,
      })),
    })),
    slots: payload.mess.slots
      .filter((s) => s.mealType === payload.mess.activeMeal)
      .map((s) => ({
        messHallId: s.messHallId,
        mealType: s.mealType,
        windowLabel: s.windowLabel,
        maxCapacity: s.maxCapacity,
        bookedCount: s.bookedCount,
        checkedInCount: s.checkedInCount,
      })),
    skipCount: payload.mess.skipNotices.filter(
      (n) => n.mealType === payload.mess.activeMeal
    ).length,
    question: payload.question,
  });
}
