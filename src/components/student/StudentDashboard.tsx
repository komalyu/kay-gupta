import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Wrench,
} from 'lucide-react';
import { Complaint, UserAccount } from '../../types/hostelCare';
import {
  computeAverageResolutionHours,
  formatDateTime,
  formatRelativeHours,
} from '../../utils/complaintHelpers';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface StudentDashboardProps {
  currentUser: UserAccount;
  complaints: Complaint[];
  simulatedOffsetHours: number;
  onNewComplaint: () => void;
  onOpenComplaint: (complaintId: string) => void;
  onOpenTimelines: (complaintId?: string) => void;
}

export function StudentDashboard({
  currentUser,
  complaints,
  simulatedOffsetHours,
  onNewComplaint,
  onOpenComplaint,
  onOpenTimelines,
}: StudentDashboardProps) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'progress' | 'resolved'>('all');
  const [search, setSearch] = useState('');

  const myComplaints = useMemo(
    () =>
      complaints.filter(
        (c) =>
          c.studentEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          c.studentId === currentUser.id
      ),
    [complaints, currentUser]
  );

  const scopedList = scope === 'mine' ? myComplaints : complaints;

  const stats = useMemo(() => {
    const total = myComplaints.length;
    const pending = myComplaints.filter(
      (c) => c.status === 'Submitted' || c.status === 'Rejected'
    ).length;
    const inProgress = myComplaints.filter((c) =>
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
    const resolved = myComplaints.filter(
      (c) => c.status === 'Completed' || c.status === 'Closed'
    ).length;
    const avgExpectedHours = computeAverageResolutionHours(complaints);
    return { total, pending, inProgress, resolved, avgExpectedHours };
  }, [myComplaints, complaints]);

  const awaitingConfirmation = myComplaints.filter((c) => c.status === 'Completed');

  const filtered = useMemo(() => {
    return scopedList.filter((c) => {
      if (
        statusFilter === 'pending' &&
        !['Submitted', 'Rejected'].includes(c.status)
      ) {
        return false;
      }
      if (
        statusFilter === 'progress' &&
        ![
          'Assigned',
          'Accepted',
          'Scheduled',
          'On the Way',
          'Work in Progress',
          'Waiting for Materials',
          'Reopened',
        ].includes(c.status)
      ) {
        return false;
      }
      if (
        statusFilter === 'resolved' &&
        !['Completed', 'Closed'].includes(c.status)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.roomNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedList, statusFilter, search]);

  const recentActivity = useMemo(() => {
    const events = myComplaints.flatMap((c) =>
      c.timeline.map((t) => ({ ...t, complaintId: c.id, complaintTitle: c.title }))
    );
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [myComplaints]);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Welcome back, {currentUser.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {currentUser.hostel ?? 'North Hall'} · {currentUser.block ?? 'Block A'} · Room{' '}
            {currentUser.roomNumber ?? '204'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenTimelines(myComplaints[0]?.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Clock className="h-4 w-4 text-slate-500 dark:text-sky-400" />
            <span>Track Timelines</span>
          </button>
          <button
            type="button"
            onClick={onNewComplaint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Report Complaint</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Complaints
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pending Assignment
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            In Progress
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-sky-800 dark:text-sky-400">
            {stats.inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Resolved / Closed
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {stats.resolved}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg Resolution Time
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {stats.avgExpectedHours}h
          </p>
        </div>
      </div>

      {/* Action Required Banner: Student Resolution Confirmation */}
      {awaitingConfirmation.length > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700/70 dark:bg-emerald-950/40">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                  {awaitingConfirmation.length} completed repair
                  {awaitingConfirmation.length === 1 ? ' awaits' : 's await'} your confirmation
                </h2>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Inspect the uploaded completion photograph and confirm whether your problem is
                  resolved before the ticket is closed.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenComplaint(awaitingConfirmation[0].id)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 whitespace-nowrap sm:self-center"
            >
              <span>Review {awaitingConfirmation[0].id}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Split: Complaints List + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    scope === 'mine'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  My Complaints ({myComplaints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    scope === 'all'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  All Hostel Records ({complaints.length})
                </button>
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, issue, room..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'progress', label: 'In Progress' },
                  { id: 'resolved', label: 'Resolved' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No complaints match this filter.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Submit a new maintenance request or clear your search filter.
                </p>
                <button
                  type="button"
                  onClick={onNewComplaint}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Report New Issue</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenComplaint(c.id)}
                    className="flex w-full flex-col gap-2 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-medium text-navy-900 dark:text-sky-400">
                          {c.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{c.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {c.hostelName} {c.block} · Room {c.roomNumber}
                        </span>
                        {c.isDemoSample && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-400 dark:text-slate-500">
                              Sample Data
                            </span>
                          </>
                        )}
                      </div>
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {c.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Wrench className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span>
                            {c.assignedTechnicianName ?? 'Awaiting technician assignment'}
                          </span>
                        </span>
                        {c.scheduledVisitStart && (
                          <span className="inline-flex items-center gap-1 font-medium text-sky-900 dark:text-sky-300">
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span>Visit: {formatDateTime(c.scheduledVisitStart)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <PriorityReadout priority={c.priority} />
                      <StatusReadout status={c.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Complaint Activity
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Latest transparent timeline events on your reports.
            </p>

            <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {recentActivity.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No recent activity recorded.
                </p>
              ) : (
                recentActivity.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onOpenComplaint(ev.complaintId)}
                    className="block w-full py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-navy-900 dark:text-sky-400">
                        {ev.complaintId}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                        {formatRelativeHours(ev.timestamp, simulatedOffsetHours)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-white">
                      {ev.updatedStatus} · {ev.complaintTitle}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                      {ev.description}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
