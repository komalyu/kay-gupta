import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  PackageOpen,
  RotateCcw,
  Truck,
  UserCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { ComplaintPriority, ComplaintStatus } from '../../types/hostelCare';

export function StatusReadout({
  status,
  compact = false,
}: {
  status: ComplaintStatus;
  compact?: boolean;
}) {
  const Icon =
    status === 'Submitted'
      ? Clock
      : status === 'Assigned'
      ? UserCheck
      : status === 'Accepted'
      ? CheckCircle2
      : status === 'Scheduled'
      ? CalendarClock
      : status === 'On the Way'
      ? Truck
      : status === 'Work in Progress'
      ? Wrench
      : status === 'Waiting for Materials'
      ? PackageOpen
      : status === 'Completed' || status === 'Closed'
      ? CheckCircle2
      : status === 'Reopened'
      ? RotateCcw
      : XCircle;

  const toneClass =
    status === 'Submitted'
      ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700/60 dark:text-amber-300'
      : status === 'Waiting for Materials'
      ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/60 dark:border-orange-700/60 dark:text-orange-300'
      : status === 'Completed' || status === 'Closed'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-700/60 dark:text-emerald-300'
      : status === 'Reopened' || status === 'Rejected'
      ? 'bg-red-50 border-red-200 text-red-800 dark:bg-rose-950/60 dark:border-rose-700/60 dark:text-rose-300'
      : 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/60 dark:border-sky-700/60 dark:text-sky-300';

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${toneClass} ${
        compact ? 'text-[11px] px-1.5 py-0.5' : ''
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function PriorityReadout({ priority }: { priority: ComplaintPriority }) {
  const Icon =
    priority === 'Critical'
      ? AlertCircle
      : priority === 'High'
      ? AlertTriangle
      : Clock;

  const textClass =
    priority === 'Critical'
      ? 'text-red-700 font-semibold dark:text-rose-400'
      : priority === 'High'
      ? 'text-orange-700 font-semibold dark:text-amber-400'
      : priority === 'Medium'
      ? 'text-sky-800 font-medium dark:text-sky-300'
      : 'text-slate-600 font-medium dark:text-slate-400';

  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-xs ${textClass}`}>
      {priority === 'Critical' || priority === 'High' ? (
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : null}
      <span>{priority}</span>
    </span>
  );
}
