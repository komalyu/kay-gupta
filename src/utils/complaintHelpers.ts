import { Complaint, ComplaintPriority, ComplaintStatus, TechnicianProfile } from '../types/hostelCare';

export function formatDateTime(iso?: string): string {
  if (!iso) return 'Not set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelativeHours(iso: string, simulatedOffsetHours = 0): string {
  const now = Date.now() + simulatedOffsetHours * 3600 * 1000;
  const diffMs = now - new Date(iso).getTime();
  const absHours = Math.round(Math.abs(diffMs) / 3600000);
  if (absHours < 1) {
    const mins = Math.max(1, Math.round(Math.abs(diffMs) / 60000));
    return diffMs >= 0 ? `${mins}m ago` : `in ${mins}m`;
  }
  if (absHours < 48) {
    return diffMs >= 0 ? `${absHours}h ago` : `in ${absHours}h`;
  }
  const days = Math.round(absHours / 24);
  return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
}

export function getStatusTone(status: ComplaintStatus): {
  text: string;
  dot: string;
  surface: string;
} {
  switch (status) {
    case 'Submitted':
      return {
        text: 'text-amber-800',
        dot: 'bg-amber-500',
        surface: 'bg-amber-50 border-amber-200',
      };
    case 'Assigned':
    case 'Accepted':
    case 'Scheduled':
    case 'On the Way':
    case 'Work in Progress':
      return {
        text: 'text-sky-900',
        dot: 'bg-sky-700',
        surface: 'bg-sky-50 border-sky-200',
      };
    case 'Waiting for Materials':
      return {
        text: 'text-orange-800',
        dot: 'bg-orange-500',
        surface: 'bg-orange-50 border-orange-200',
      };
    case 'Completed':
      return {
        text: 'text-emerald-800',
        dot: 'bg-emerald-600',
        surface: 'bg-emerald-50 border-emerald-200',
      };
    case 'Closed':
      return {
        text: 'text-emerald-900',
        dot: 'bg-emerald-700',
        surface: 'bg-emerald-50 border-emerald-300',
      };
    case 'Reopened':
    case 'Rejected':
      return {
        text: 'text-red-800',
        dot: 'bg-red-600',
        surface: 'bg-red-50 border-red-200',
      };
  }
}

export function getPriorityTone(priority: ComplaintPriority): {
  text: string;
  border: string;
} {
  switch (priority) {
    case 'Critical':
      return { text: 'text-red-700 font-semibold', border: 'border-red-200 bg-red-50' };
    case 'High':
      return { text: 'text-orange-700 font-semibold', border: 'border-orange-200 bg-orange-50' };
    case 'Medium':
      return { text: 'text-sky-800 font-medium', border: 'border-sky-200 bg-sky-50' };
    case 'Low':
      return { text: 'text-slate-600 font-medium', border: 'border-slate-200 bg-slate-50' };
  }
}

export function getActiveJobCount(complaints: Complaint[], technicianId: string): number {
  return complaints.filter(
    (c) =>
      c.assignedTechnicianId === technicianId &&
      c.status !== 'Closed' &&
      c.status !== 'Completed' &&
      c.status !== 'Rejected'
  ).length;
}

export function getTechnicianWorkloadLabel(
  tech: TechnicianProfile,
  complaints: Complaint[]
): { active: number; ratio: number; label: string } {
  const active = getActiveJobCount(complaints, tech.id);
  const ratio = active / Math.max(1, tech.maxDailyJobs);
  const label = ratio >= 1 ? 'At Capacity' : ratio >= 0.6 ? 'Moderate Load' : 'Light Load';
  return { active, ratio, label };
}

export function computeAverageResolutionHours(complaints: Complaint[]): number {
  const resolved = complaints.filter((c) => c.resolvedAt);
  if (resolved.length === 0) return 18;
  const totalHours = resolved.reduce((acc, c) => {
    const start = new Date(c.createdAt).getTime();
    const end = new Date(c.resolvedAt!).getTime();
    return acc + Math.max(1, (end - start) / 3600000);
  }, 0);
  return Math.round(totalHours / resolved.length);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const rawUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const LIFECYCLE_MILESTONES: { key: string; label: string; statuses: ComplaintStatus[] }[] = [
  { key: 'submitted', label: 'Reported', statuses: ['Submitted', 'Rejected'] },
  { key: 'assigned', label: 'Assigned', statuses: ['Assigned', 'Accepted'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['Scheduled', 'On the Way'] },
  {
    key: 'progress',
    label: 'In Progress',
    statuses: ['Work in Progress', 'Waiting for Materials', 'Reopened'],
  },
  { key: 'completed', label: 'Proof Uploaded', statuses: ['Completed'] },
  { key: 'closed', label: 'Confirmed & Closed', statuses: ['Closed'] },
];

export function getMilestoneIndex(status: ComplaintStatus): number {
  if (status === 'Submitted' || status === 'Rejected') return 0;
  if (status === 'Assigned' || status === 'Accepted') return 1;
  if (status === 'Scheduled' || status === 'On the Way') return 2;
  if (status === 'Work in Progress' || status === 'Waiting for Materials' || status === 'Reopened')
    return 3;
  if (status === 'Completed') return 4;
  if (status === 'Closed') return 5;
  return 0;
}
