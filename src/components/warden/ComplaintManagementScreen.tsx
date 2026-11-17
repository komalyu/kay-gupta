import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Loader2,
  RotateCcw,
  ScanSearch,
  Search,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { COMPLAINT_CATEGORIES, HOSTEL_BLOCKS } from '../../data/seedData';
import {
  AiDispatchPlanResult,
  AiRepairAuditResult,
  requestAiDispatchPlan,
  requestAiRepairVerification,
} from '../../services/aiClient';
import {
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  TechnicianProfile,
  UserAccount,
} from '../../types/hostelCare';
import {
  formatDateTime,
  getTechnicianWorkloadLabel,
} from '../../utils/complaintHelpers';
import { ComplaintTimeline } from '../shared/ComplaintTimeline';
import { MessageThread } from '../shared/MessageThread';
import { PhotoGallery } from '../shared/PhotoGallery';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface ComplaintManagementScreenProps {
  currentUser: UserAccount;
  complaints: Complaint[];
  technicians: TechnicianProfile[];
  initialSelectedId?: string;
  onAssignTechnician: (
    complaintId: string,
    technicianId: string,
    priority?: ComplaintPriority
  ) => void;
  onChangePriority: (complaintId: string, priority: ComplaintPriority) => void;
  onVerifyOrReopen: (
    complaintId: string,
    action: 'verify' | 'reopen' | 'escalate',
    note?: string
  ) => void;
  onSendMessage: (complaintId: string, content: string) => void;
}

const ALL_STATUSES: ComplaintStatus[] = [
  'Submitted',
  'Assigned',
  'Accepted',
  'Scheduled',
  'On the Way',
  'Work in Progress',
  'Waiting for Materials',
  'Completed',
  'Closed',
  'Reopened',
  'Rejected',
];

export function ComplaintManagementScreen({
  currentUser,
  complaints,
  technicians,
  initialSelectedId,
  onAssignTechnician,
  onChangePriority,
  onVerifyOrReopen,
  onSendMessage,
}: ComplaintManagementScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedId && complaints.some((c) => c.id === initialSelectedId)
      ? initialSelectedId
      : complaints[0]?.id ?? ''
  );

  const [assignTechId, setAssignTechId] = useState<string>(technicians[0]?.id ?? '');
  const [adminNote, setAdminNote] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchPlan, setDispatchPlan] = useState<AiDispatchPlanResult | null>(null);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AiRepairAuditResult | null>(null);

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (blockFilter !== 'all' && c.block !== blockFilter) return false;
      if (overdueOnly && !c.isOverdue) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.roomNumber.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [complaints, statusFilter, categoryFilter, blockFilter, overdueOnly, search]);

  const selected =
    complaints.find((c) => c.id === selectedId) ?? filtered[0] ?? complaints[0];

  const handleAssign = () => {
    if (!selected || !assignTechId) return;
    onAssignTechnician(selected.id, assignTechId, selected.priority);
    const tech = technicians.find((t) => t.id === assignTechId);
    setFeedbackBanner(`Assigned ${selected.id} to ${tech?.name ?? 'Technician'}.`);
  };

  const handleRecommendDispatch = async () => {
    if (!selected) return;
    setDispatchError(null);
    setDispatchLoading(true);
    try {
      const result = await requestAiDispatchPlan(selected, technicians, complaints);
      setDispatchPlan(result);
      if (result.recommendedTechnicianId) {
        setAssignTechId(result.recommendedTechnicianId);
      }
    } catch (err) {
      setDispatchError(
        err instanceof Error ? err.message : 'Unable to generate AI dispatch plan.'
      );
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleAuditPhotos = async () => {
    if (!selected) return;
    setAuditError(null);
    setAuditLoading(true);
    try {
      const result = await requestAiRepairVerification({
        complaintTitle: selected.title,
        category: selected.category,
        beforePhoto: selected.beforePhotos[0],
        afterPhoto: selected.afterPhotos[0],
      });
      setAuditResult(result);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Unable to audit repair photos.');
    } finally {
      setAuditLoading(false);
    }
  };

  const controlCls =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
          Complaint Management & Assignment
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Search, filter, assign technicians, escalate overdue complaints, and verify completion
          photographs.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322] sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, title, room, student..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={controlCls}
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={controlCls}
        >
          <option value="all">All Categories</option>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className={controlCls}
        >
          <option value="all">All Blocks</option>
          {HOSTEL_BLOCKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-red-600"
          />
          <span>Overdue Only</span>
        </label>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Complaints List */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Showing {filtered.length} of {complaints.length} complaints
          </div>
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No complaints match your active filters.
            </p>
          ) : (
            <div className="max-h-[760px] divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
              {filtered.map((c) => {
                const isSelected = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setFeedbackBanner(null);
                      setDispatchPlan(null);
                      setDispatchError(null);
                      setAuditResult(null);
                      setAuditError(null);
                      if (c.assignedTechnicianId) {
                        setAssignTechId(c.assignedTechnicianId);
                      }
                    }}
                    className={`block w-full px-4 py-3.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/45'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-navy-900 dark:text-sky-400">
                        {c.id}
                      </span>
                      <StatusReadout status={c.status} compact />
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {c.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {c.hostelName} {c.block} · Rm {c.roomNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <PriorityReadout priority={c.priority} />
                      {c.isOverdue && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-red-700 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Overdue</span>
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Tech: {c.assignedTechnicianName ?? 'Unassigned'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Complaint Control Panel */}
        <div className="space-y-6 lg:col-span-7">
          {!selected ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0c1322] dark:text-slate-400">
              Select a complaint from the list to inspect and manage it.
            </div>
          ) : (
            <>
              <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
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
                        {selected.studentName} ({selected.hostelName} {selected.block} Rm{' '}
                        {selected.roomNumber})
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-navy-950 dark:text-white">
                      {selected.title}
                    </h2>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {selected.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityReadout priority={selected.priority} />
                    <StatusReadout status={selected.status} />
                  </div>
                </div>

                {feedbackBanner && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                    {feedbackBanner}
                  </div>
                )}

                {selected.declineReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                    <strong>Technician Declined:</strong> {selected.declineReason}
                  </div>
                )}

                {/* Assignment & Priority Controls */}
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Assign / Reassign Technician
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={assignTechId}
                        onChange={(e) => setAssignTechId(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {technicians.map((t) => {
                          const load = getTechnicianWorkloadLabel(t, complaints);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.specialty}) · {load.active}/{t.maxDailyJobs}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssign}
                        className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Adjust Priority Level
                    </label>
                    <select
                      value={selected.priority}
                      onChange={(e) => {
                        onChangePriority(
                          selected.id,
                          e.target.value as ComplaintPriority
                        );
                        setFeedbackBanner(`Updated priority to ${e.target.value}.`);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* AI Dispatch Recommendation Bar */}
                <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                      <Cpu className="h-4 w-4 text-navy-900 dark:text-sky-400" />
                      <span>AI Technician Match & Scope Estimate</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRecommendDispatch}
                      disabled={dispatchLoading}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-navy-900 hover:border-sky-500 hover:bg-sky-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
                    >
                      {dispatchLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Cpu className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {dispatchLoading ? 'Evaluating Workload...' : 'Recommend Best Technician'}
                      </span>
                    </button>
                  </div>

                  {dispatchError && (
                    <p className="text-xs text-red-700 dark:text-red-400">{dispatchError}</p>
                  )}

                  {dispatchPlan && (
                    <div className="space-y-2 border-t border-slate-200 pt-2.5 text-xs dark:border-slate-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-700 dark:text-slate-300">
                          Recommended:{' '}
                          <strong className="text-navy-900 dark:text-sky-400">
                            {dispatchPlan.recommendedTechnicianName}
                          </strong>{' '}
                          · Est.{' '}
                          <span className="font-mono tabular-nums">
                            {dispatchPlan.estimatedDurationMinutes}m
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onAssignTechnician(
                              selected.id,
                              dispatchPlan.recommendedTechnicianId,
                              selected.priority
                            );
                            setAssignTechId(dispatchPlan.recommendedTechnicianId);
                            setFeedbackBanner(
                              `Applied AI recommendation: assigned ${selected.id} to ${dispatchPlan.recommendedTechnicianName}.`
                            );
                          }}
                          className="rounded-md bg-navy-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                        >
                          Assign {dispatchPlan.recommendedTechnicianName}
                        </button>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {dispatchPlan.assignmentRationale}
                      </p>
                    </div>
                  )}
                </div>

                {/* Warden Audit Actions: Verify / Escalate / Reopen */}
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>
                      Scheduled Visit:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {selected.scheduledVisitStart
                          ? formatDateTime(selected.scheduledVisitStart)
                          : 'Not scheduled'}
                      </strong>
                    </span>
                    <span>
                      Warden Audit:{' '}
                      <strong
                        className={
                          selected.wardenVerified
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }
                      >
                        {selected.wardenVerified ? 'Verified Closed' : 'Pending Verification'}
                      </strong>
                    </span>
                  </div>

                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Optional warden audit or escalation note..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onVerifyOrReopen(selected.id, 'verify', adminNote);
                        setAdminNote('');
                        setFeedbackBanner(
                          `Verified and closed ${selected.id} in warden audit log.`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Verify & Close</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onVerifyOrReopen(selected.id, 'escalate', adminNote);
                        setAdminNote('');
                        setFeedbackBanner(`Escalated ${selected.id} to Critical priority.`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/60"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Escalate Overdue / Critical</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onVerifyOrReopen(selected.id, 'reopen', adminNote);
                        setAdminNote('');
                        setFeedbackBanner(`Reopened ${selected.id} for follow-up.`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reopen Complaint</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Before / After Photos + AI Repair Audit */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Before & After Verification Photos
                  </h3>
                  <button
                    type="button"
                    onClick={handleAuditPhotos}
                    disabled={auditLoading || selected.afterPhotos.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:border-sky-500 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
                  >
                    {auditLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ScanSearch className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {auditLoading ? 'Auditing Photos...' : 'Audit Repair Proof with AI'}
                    </span>
                  </button>
                </div>

                {auditError && (
                  <p className="text-xs text-red-700 dark:text-red-400">{auditError}</p>
                )}

                {auditResult && (
                  <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/70 p-4 text-xs dark:border-sky-800/70 dark:bg-sky-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-navy-950 dark:text-sky-300">
                        AI Visual Audit: {auditResult.verificationStatus}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {auditResult.comparedBeforeAfter
                          ? 'Compared Before + After photos'
                          : 'Evaluated After completion photo'}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200">{auditResult.summary}</p>
                    {auditResult.checksPassed.length > 0 && (
                      <ul className="space-y-0.5 text-slate-600 dark:text-slate-300">
                        {auditResult.checksPassed.map((check, i) => (
                          <li key={i}>• {check}</li>
                        ))}
                      </ul>
                    )}
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Recommendation: {auditResult.recommendation}
                    </p>
                  </div>
                )}

                <PhotoGallery
                  beforePhotos={selected.beforePhotos}
                  afterPhotos={selected.afterPhotos}
                />
              </div>

              {/* Timeline + Message Thread */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  Chronological Audit Timeline
                </h3>
                <ComplaintTimeline complaint={selected} />
              </div>

              <MessageThread
                complaint={selected}
                currentUser={currentUser}
                onSendMessage={(content) => onSendMessage(selected.id, content)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
