import {
  CheckCircle2,
  Circle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { HostelCareState, UserRole } from '../../types/hostelCare';

interface GuidedDemoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: HostelCareState;
  currentRole: UserRole;
  onSwitchRole: (role: UserRole, targetScreen?: string, complaintId?: string) => void;
  onAdvanceTime: (hours: number) => void;
  onResetDemo: () => void;
}

export function GuidedDemoPanel({
  isOpen,
  onClose,
  state,
  currentRole,
  onSwitchRole,
  onAdvanceTime,
  onResetDemo,
}: GuidedDemoPanelProps) {
  if (!isOpen) return null;

  const g = state.guidedDemo;
  const trackedId = g.trackedComplaintId;

  const steps: {
    num: number;
    label: string;
    role: UserRole;
    done: boolean;
    screen: string;
  }[] = [
    {
      num: 1,
      label: 'Student reports water leakage',
      role: 'student',
      done: g.step1Reported,
      screen: 'student-submit',
    },
    {
      num: 2,
      label: 'Warden assigns the complaint',
      role: 'warden',
      done: g.step2Assigned,
      screen: 'admin-complaints',
    },
    {
      num: 3,
      label: 'Technician accepts the job',
      role: 'technician',
      done: g.step3Accepted,
      screen: trackedId ? 'tech-detail' : 'tech-dashboard',
    },
    {
      num: 4,
      label: 'Technician schedules a visit',
      role: 'technician',
      done: g.step4Scheduled,
      screen: trackedId ? 'tech-detail' : 'tech-schedule',
    },
    {
      num: 5,
      label: 'Student sees the scheduled visit',
      role: 'student',
      done: g.step5StudentViewedSchedule,
      screen: trackedId ? 'student-detail' : 'student-dashboard',
    },
    {
      num: 6,
      label: 'Technician marks job in progress',
      role: 'technician',
      done: g.step6InProgress,
      screen: trackedId ? 'tech-detail' : 'tech-dashboard',
    },
    {
      num: 7,
      label: 'Technician uploads an after-photo',
      role: 'technician',
      done: g.step7AfterPhotoUploaded,
      screen: trackedId ? 'tech-detail' : 'tech-dashboard',
    },
    {
      num: 8,
      label: 'Technician marks complaint completed',
      role: 'technician',
      done: g.step8Completed,
      screen: trackedId ? 'tech-detail' : 'tech-dashboard',
    },
    {
      num: 9,
      label: 'Student confirms resolution',
      role: 'student',
      done: g.step9StudentConfirmed,
      screen: trackedId ? 'student-detail' : 'student-dashboard',
    },
    {
      num: 10,
      label: 'Warden verifies complaint closed',
      role: 'warden',
      done: g.step10WardenVerifiedClosed,
      screen: 'admin-complaints',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <aside
      aria-label="Prototype Testing Mode"
      className="fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-2rem))] rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#0c1322]"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Prototype Testing Mode
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Guided 10-step scenario ·{' '}
            <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-sky-400">
              {completedCount}/10
            </span>{' '}
            verified
            {trackedId ? ` · Tracking ${trackedId}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Close Prototype Testing Panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Switch Role (Preserves Shared Data)
          </p>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1 sm:grid-cols-4 dark:bg-slate-900">
            {(
              [
                { id: 'student', label: 'Student' },
                { id: 'mess_staff', label: 'Mess Staff' },
                { id: 'warden', label: 'Warden' },
                { id: 'technician', label: 'Tech' },
              ] as { id: UserRole; label: string }[]
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSwitchRole(r.id)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  currentRole === r.id
                    ? 'bg-navy-900 text-white shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
          {steps.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => onSwitchRole(s.role, s.screen, trackedId ?? undefined)}
              className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                s.done
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                {s.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                )}
                <span>
                  {s.num}. {s.label}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[11px] capitalize text-slate-500 dark:text-sky-400">
                {s.role}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAdvanceTime(6)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
              title="Advance simulated clock by 6 hours to test overdue escalation"
            >
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>+6h Time</span>
            </button>
            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              +{state.simulatedHoursOffset}h
            </span>
          </div>

          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function PrototypeModeTrigger({
  onClick,
  completedSteps,
}: {
  onClick: () => void;
  completedSteps: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-100 dark:hover:border-sky-500/60 dark:hover:bg-slate-800"
    >
      <SlidersHorizontal className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
      <span className="hidden sm:inline">Demo Walkthrough</span>
      <span className="font-mono tabular-nums text-slate-500 dark:text-sky-400">
        {completedSteps}/10
      </span>
    </button>
  );
}
