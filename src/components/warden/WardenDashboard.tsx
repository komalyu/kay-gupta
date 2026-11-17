import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Cpu,
  FileBarChart,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { COMPLAINT_CATEGORIES, HOSTEL_BLOCKS } from '../../data/seedData';
import {
  AiWardenBriefingResult,
  requestAiWardenBriefing,
} from '../../services/aiClient';
import { Complaint, TechnicianProfile } from '../../types/hostelCare';
import {
  computeAverageResolutionHours,
  formatDateTime,
  getTechnicianWorkloadLabel,
} from '../../utils/complaintHelpers';
import { ChartCanvas } from '../shared/ChartCanvas';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';
import { useTheme } from '../shared/ThemeProvider';

interface WardenDashboardProps {
  complaints: Complaint[];
  technicians: TechnicianProfile[];
  simulatedOffsetHours: number;
  onOpenComplaintManagement: (complaintId?: string) => void;
  onOpenReports: () => void;
  onAdvanceTime: (hours: number) => void;
}

export function WardenDashboard({
  complaints,
  technicians,
  simulatedOffsetHours,
  onOpenComplaintManagement,
  onOpenReports,
  onAdvanceTime,
}: WardenDashboardProps) {
  const { theme } = useTheme();
  const [briefingQuestion, setBriefingQuestion] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<AiWardenBriefingResult | null>(null);

  const handleRunBriefing = async (customQuestion?: string) => {
    const q = customQuestion ?? briefingQuestion;
    if (customQuestion) setBriefingQuestion(customQuestion);
    setBriefingError(null);
    setBriefingLoading(true);
    try {
      const res = await requestAiWardenBriefing({
        complaints,
        technicians,
        allComplaints: complaints,
        simulatedOffsetHours,
        question: q,
      });
      setBriefing(res);
    } catch (err) {
      setBriefingError(
        err instanceof Error ? err.message : 'Unable to generate operations briefing.'
      );
    } finally {
      setBriefingLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(
      (c) => c.status === 'Submitted' || c.status === 'Rejected'
    ).length;
    const inProgress = complaints.filter((c) =>
      [
        'Assigned',
        'Accepted',
        'Scheduled',
        'On the Way',
        'Work in Progress',
        'Waiting for Materials',
        'Reopened',
      ].includes(c.status)
    ).length;
    const completed = complaints.filter(
      (c) => c.status === 'Completed' || c.status === 'Closed'
    ).length;
    const overdue = complaints.filter((c) => c.isOverdue).length;
    const critical = complaints.filter(
      (c) => c.priority === 'Critical' && c.status !== 'Closed'
    ).length;
    const availableTechs = technicians.filter(
      (t) => t.availability !== 'Off Shift'
    ).length;
    const avgResolutionHours = computeAverageResolutionHours(complaints);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      critical,
      availableTechs,
      avgResolutionHours,
    };
  }, [complaints, technicians]);

  const escalatedQueue = useMemo(() => {
    return complaints
      .filter(
        (c) =>
          c.status !== 'Closed' &&
          (c.isOverdue ||
            c.priority === 'Critical' ||
            c.escalationLevel > 0 ||
            c.status === 'Rejected' ||
            c.status === 'Reopened')
      )
      .sort((a, b) => {
        const scoreA =
          (a.isOverdue ? 4 : 0) +
          a.escalationLevel * 2 +
          (a.priority === 'Critical' ? 2 : 0);
        const scoreB =
          (b.isOverdue ? 4 : 0) +
          b.escalationLevel * 2 +
          (b.priority === 'Critical' ? 2 : 0);
        return scoreB - scoreA;
      });
  }, [complaints]);

  const categoryChartData = useMemo(() => {
    const counts = COMPLAINT_CATEGORIES.map(
      (cat) => complaints.filter((c) => c.category === cat).length
    );
    return {
      labels: [...COMPLAINT_CATEGORIES],
      datasets: [
        {
          label: 'Complaints',
          data: counts,
          backgroundColor: theme === 'dark' ? '#38bdf8' : '#0f2942',
          borderRadius: 4,
        },
      ],
    };
  }, [complaints, theme]);

  const blockChartData = useMemo(() => {
    const activeByBlock = HOSTEL_BLOCKS.map(
      (b) =>
        complaints.filter(
          (c) => c.block === b && c.status !== 'Closed' && c.status !== 'Completed'
        ).length
    );
    const resolvedByBlock = HOSTEL_BLOCKS.map(
      (b) =>
        complaints.filter(
          (c) => c.block === b && (c.status === 'Closed' || c.status === 'Completed')
        ).length
    );
    return {
      labels: [...HOSTEL_BLOCKS],
      datasets: [
        {
          label: 'Open / Active',
          data: activeByBlock,
          backgroundColor: theme === 'dark' ? '#fbbf24' : '#d97706',
          borderRadius: 4,
        },
        {
          label: 'Completed / Closed',
          data: resolvedByBlock,
          backgroundColor: theme === 'dark' ? '#34d399' : '#16a34a',
          borderRadius: 4,
        },
      ],
    };
  }, [complaints, theme]);

  return (
    <div className="space-y-6">
      {/* Header + Escalation Simulation Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Warden & Facilities Oversight
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Monitor hostel maintenance load, assign technicians, and verify resolved work.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAdvanceTime(6)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            title="Advance simulated clock to test automatic overdue escalation"
          >
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Simulate +6h (+{simulatedOffsetHours}h)</span>
          </button>
          <button
            type="button"
            onClick={onOpenReports}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <FileBarChart className="h-4 w-4 text-navy-900 dark:text-sky-400" />
            <span>Analytics & Reports</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenComplaintManagement()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
          >
            <span>Manage All Complaints</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 8-Metric Administrative KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Registered
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {metrics.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pending Assignment
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {metrics.pending}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            In Progress
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-sky-900 dark:text-sky-400">
            {metrics.inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed / Closed
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {metrics.completed}
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            metrics.overdue > 0
              ? 'border-red-300 bg-red-50 dark:border-red-800/70 dark:bg-red-950/40'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0c1322]'
          }`}
        >
          <p className="text-xs font-medium text-red-800 dark:text-red-300">
            Overdue Complaints
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-red-700 dark:text-red-400">
            {metrics.overdue}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Critical Open
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-red-700 dark:text-red-400">
            {metrics.critical}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Technician Availability
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {metrics.availableTechs}/{technicians.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg Resolution Time
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {metrics.avgResolutionHours}h
          </p>
        </div>
      </div>

      {/* AI Operations Briefing & Facilities Q&A */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Cpu className="h-4 w-4 text-navy-900 dark:text-sky-400" />
              <span>AI Operations Briefing & Bottleneck Advisor</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ask questions across live tickets and technician capacity or generate an instant
              shift action brief.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              'Summarize overdue risks',
              'Who has capacity for urgent jobs?',
              'Identify recurring block faults',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleRunBriefing(preset)}
                disabled={briefingLoading}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-500 hover:text-navy-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-400 dark:hover:text-sky-300"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunBriefing();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={briefingQuestion}
            onChange={(e) => setBriefingQuestion(e.target.value)}
            placeholder="Ask about overdue tickets, technician load, or block trends (or leave blank for full shift brief)..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={briefingLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
          >
            {briefingLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cpu className="h-3.5 w-3.5" />
            )}
            <span>{briefingLoading ? 'Analyzing Operations...' : 'Generate AI Briefing'}</span>
          </button>
        </form>

        {briefingError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {briefingError}
          </div>
        )}

        {briefing && (
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="text-sm font-semibold text-navy-950 dark:text-white">
              {briefing.headline}
            </p>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {briefing.answer}
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {briefing.urgentActions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Prioritized Actions
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {briefing.urgentActions.map((item) => (
                      <li
                        key={item.complaintId}
                        className="flex items-start gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenComplaintManagement(item.complaintId)}
                          className="shrink-0 font-mono font-semibold text-navy-900 hover:underline dark:text-sky-400"
                        >
                          {item.complaintId}
                        </button>
                        <span>{item.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {briefing.bottlenecks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Detected Bottlenecks
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {briefing.bottlenecks.map((b, i) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Escalation Queue + Technician Workload */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Escalated / Overdue / Critical Queue */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Escalation & High-Attention Queue ({escalatedQueue.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Overdue, Critical, Rejected, or repeatedly reopened complaints.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenComplaintManagement()}
              className="text-xs font-semibold text-navy-900 hover:underline dark:text-sky-400"
            >
              View All
            </button>
          </div>

          {escalatedQueue.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No overdue or escalated complaints at this time.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {escalatedQueue.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                        {c.id}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {c.hostelName} {c.block} Room {c.roomNumber}
                      </span>
                      {c.isOverdue && (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Overdue</span>
                        </span>
                      )}
                      {c.reopenCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Reopened {c.reopenCount}x</span>
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.escalationReason ?? `Target: ${formatDateTime(c.expectedResolutionAt)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <PriorityReadout priority={c.priority} />
                    <StatusReadout status={c.status} compact />
                    <button
                      type="button"
                      onClick={() => onOpenComplaintManagement(c.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technician Availability & Load Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Technician Availability & Load
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live assignment capacity across maintenance specialties.
            </p>
          </div>

          <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {technicians.map((tech) => {
              const load = getTechnicianWorkloadLabel(tech, complaints);
              return (
                <div
                  key={tech.id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {tech.name}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">{tech.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        tech.availability === 'Available'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : tech.availability === 'On Field'
                          ? 'text-sky-800 dark:text-sky-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tech.availability}
                    </p>
                    <p className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {load.active}/{tech.maxDailyJobs} jobs · {load.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            Complaint Category Distribution
          </h2>
          <ChartCanvas
            type="bar"
            data={categoryChartData}
            height={230}
            ariaLabel="Bar chart of complaints by maintenance category"
            options={{
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
              },
            }}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            Hostel Block-wise Statistics
          </h2>
          <ChartCanvas
            type="bar"
            data={blockChartData}
            height={230}
            ariaLabel="Grouped bar chart comparing active vs resolved complaints per hostel block"
            options={{
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
