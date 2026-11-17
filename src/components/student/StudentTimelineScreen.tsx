import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, UserCheck } from 'lucide-react';
import { Complaint, UserAccount } from '../../types/hostelCare';
import { formatDateTime } from '../../utils/complaintHelpers';
import { ComplaintTimeline } from '../shared/ComplaintTimeline';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface StudentTimelineScreenProps {
  currentUser: UserAccount;
  complaints: Complaint[];
  initialComplaintId?: string;
  onOpenComplaintDetail: (complaintId: string) => void;
  onViewedScheduled: (complaintId: string) => void;
}

export function StudentTimelineScreen({
  currentUser,
  complaints,
  initialComplaintId,
  onOpenComplaintDetail,
  onViewedScheduled,
}: StudentTimelineScreenProps) {
  const myComplaints = complaints.filter(
    (c) =>
      c.studentEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      c.studentId === currentUser.id
  );
  const selectable = myComplaints.length > 0 ? myComplaints : complaints;
  const [selectedId, setSelectedId] = useState<string>(
    initialComplaintId && selectable.some((c) => c.id === initialComplaintId)
      ? initialComplaintId
      : selectable[0]?.id ?? ''
  );

  const selected = selectable.find((c) => c.id === selectedId) ?? selectable[0];

  useEffect(() => {
    if (selected?.scheduledVisitStart) {
      onViewedScheduled(selected.id);
    }
  }, [selected?.id, selected?.scheduledVisitStart, onViewedScheduled]);

  if (!selected) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#0c1322]">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          No complaints to track yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
          Complaint Tracking Timeline
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Every status change, person responsible, and scheduled visit time recorded chronologically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Ticket selector */}
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-4">
          <p className="px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Select Complaint ({selectable.length})
          </p>
          <div className="max-h-[560px] space-y-1.5 overflow-y-auto">
            {selectable.map((c) => {
              const active = c.id === selected.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? 'border-navy-900 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-navy-900 dark:text-sky-400">
                      {c.id}
                    </span>
                    <StatusReadout status={c.status} compact />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {c.category} · Room {c.roomNumber}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Timeline */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-8">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                  {selected.id}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selected.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {selected.hostelName} {selected.block} · Room {selected.roomNumber}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {selected.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PriorityReadout priority={selected.priority} />
              <StatusReadout status={selected.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 text-xs">
              <UserCheck className="h-4 w-4 shrink-0 text-navy-900 dark:text-sky-400" />
              <div>
                <p className="text-slate-500 dark:text-slate-400">Person Responsible</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selected.assignedTechnicianName ?? 'Warden Assignment Queue'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <CalendarClock className="h-4 w-4 shrink-0 text-navy-900 dark:text-sky-400" />
              <div>
                <p className="text-slate-500 dark:text-slate-400">Scheduled Visit</p>
                <p className="font-semibold text-slate-900 dark:text-sky-300">
                  {selected.scheduledVisitStart
                    ? formatDateTime(selected.scheduledVisitStart)
                    : 'Awaiting technician schedule'}
                </p>
              </div>
            </div>
          </div>

          <ComplaintTimeline complaint={selected} />

          <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onOpenComplaintDetail(selected.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
            >
              <span>Open Full Details & Photos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
