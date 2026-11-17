import { ArrowRight, Check } from 'lucide-react';
import { Complaint } from '../../types/hostelCare';
import {
  formatDateTime,
  getMilestoneIndex,
  LIFECYCLE_MILESTONES,
} from '../../utils/complaintHelpers';

export function ComplaintMilestoneBar({ complaint }: { complaint: Complaint }) {
  const activeIdx = getMilestoneIndex(complaint.status);

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {LIFECYCLE_MILESTONES.map((step, idx) => {
          const isComplete = idx < activeIdx || (complaint.status === 'Closed' && idx === 5);
          const isCurrent = idx === activeIdx && complaint.status !== 'Closed';

          return (
            <div key={step.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                    isComplete
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                      : isCurrent
                      ? 'bg-navy-900 text-white ring-2 ring-navy-900/20 dark:bg-sky-400 dark:text-slate-950 dark:ring-sky-400/30'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                <div
                  className={`h-1 flex-1 rounded-full ${
                    isComplete
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : isCurrent
                      ? 'bg-navy-900 dark:bg-sky-400'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              </div>
              <span
                className={`text-xs leading-tight ${
                  isComplete || isCurrent
                    ? 'font-semibold text-slate-900 dark:text-white'
                    : 'font-normal text-slate-500 dark:text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComplaintTimeline({ complaint }: { complaint: Complaint }) {
  const events = [...complaint.timeline].reverse();

  return (
    <div className="space-y-4">
      <ComplaintMilestoneBar complaint={complaint} />

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#0c1322]">
        {events.map((ev, index) => (
          <div
            key={ev.id}
            className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono text-[11px] text-slate-500 dark:text-sky-400">
                  #{events.length - index}
                </span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {ev.previousStatus}
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {ev.updatedStatus}
                </span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {ev.actorName}{' '}
                  <span className="capitalize text-slate-500 dark:text-slate-400">
                    ({ev.actorRole})
                  </span>
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{ev.description}</p>
            </div>
            <time className="shrink-0 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {formatDateTime(ev.timestamp)}
            </time>
          </div>
        ))}
      </div>
    </div>
  );
}
