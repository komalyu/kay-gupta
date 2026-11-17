import { ArrowRight, ArrowUpRight, Clock, Users } from 'lucide-react';
import { MessHall } from '../../types/hostelCare';
import {
  getCounterStatusTextClass,
  getCrowdBarClass,
  getCrowdLevel,
  getCrowdTextClass,
  getHallAvgWaitMinutes,
  getOccupancyPercent,
} from '../../utils/messHelpers';

interface MessOccupancyCardProps {
  hall: MessHall;
  allHalls: MessHall[];
  selected?: boolean;
  onSelect?: (hallId: string) => void;
  actionLabel?: string;
}

export function MessOccupancyCard({
  hall,
  allHalls,
  selected = false,
  onSelect,
  actionLabel,
}: MessOccupancyCardProps) {
  const pct = getOccupancyPercent(hall);
  const level = getCrowdLevel(hall);
  const avgWait = getHallAvgWaitMinutes(hall);
  const netFlow = hall.entryRatePerMin - hall.exitRatePerMin;
  const redirectTarget = hall.overflowRedirectTo
    ? allHalls.find((h) => h.id === hall.overflowRedirectTo)
    : undefined;

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border bg-white p-5 transition-colors dark:bg-[#0c1322] ${
        selected
          ? 'border-navy-900 dark:border-sky-400'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">{hall.wing}</p>
            <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900 dark:text-white">
              {hall.name}
            </h3>
          </div>
          <span
            className={`shrink-0 text-xs font-semibold ${getCrowdTextClass(level)}`}
          >
            {level} · {pct}%
          </span>
        </div>

        {/* Occupancy Progress Bar */}
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full transition-all duration-200 ${getCrowdBarClass(level)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>
                {hall.currentOccupancy}/{hall.capacity} seats
              </span>
            </span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>~{avgWait} min wait</span>
            </span>
            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {netFlow > 0
                ? `+${netFlow}/min rising`
                : netFlow < 0
                ? `${netFlow}/min easing`
                : 'Steady flow'}
            </span>
          </div>
        </div>

        {redirectTarget && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
            <span>
              Overflow advisory active: try <strong>{redirectTarget.name}</strong>
            </span>
          </div>
        )}

        {/* Serving Counters Summary */}
        <div className="mt-4 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {hall.counters.map((cnt) => (
            <div
              key={cnt.id}
              className="flex items-center justify-between gap-2 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                  {cnt.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {cnt.stationType} · Batch {cnt.batchLevelPct}%
                </p>
              </div>
              <div className="shrink-0 text-right font-mono tabular-nums">
                <p className={`font-semibold ${getCounterStatusTextClass(cnt.status)}`}>
                  {cnt.status}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {cnt.status === 'Paused'
                    ? 'Closed'
                    : `${cnt.queueLength} in line · ${cnt.avgWaitMinutes}m`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(hall.id)}
          className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            selected
              ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950'
              : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <span>{actionLabel ?? (selected ? 'Viewing Slots' : 'Select Dining Hall')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
