import { ChangeEvent, FormEvent, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  CheckCircle2,
  Cpu,
  Loader2,
  MapPin,
  PackagePlus,
  ScanSearch,
  Send,
  Upload,
  XCircle,
} from 'lucide-react';
import { DEMO_IMAGES } from '../../data/seedData';
import {
  AiDispatchPlanResult,
  AiRepairAuditResult,
  requestAiDispatchPlan,
  requestAiRepairVerification,
} from '../../services/aiClient';
import {
  Complaint,
  ComplaintStatus,
  TechnicianProfile,
  UserAccount,
} from '../../types/hostelCare';
import { formatDateTime, readFileAsDataUrl } from '../../utils/complaintHelpers';
import { ComplaintTimeline } from '../shared/ComplaintTimeline';
import { MessageThread } from '../shared/MessageThread';
import { PhotoGallery } from '../shared/PhotoGallery';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface TechnicianJobDetailProps {
  job: Complaint;
  currentUser: UserAccount;
  technicians?: TechnicianProfile[];
  allComplaints?: Complaint[];
  onBack: () => void;
  onAcceptOrDecline: (
    complaintId: string,
    decision: 'accept' | 'decline',
    reason?: string
  ) => void;
  onScheduleVisit: (
    complaintId: string,
    visitStartIso: string,
    estCompletionIso: string,
    note?: string
  ) => void;
  onUpdateStatus: (
    complaintId: string,
    status: ComplaintStatus,
    workNote?: string,
    afterPhotos?: string[]
  ) => string | undefined;
  onUploadAfterPhotos: (complaintId: string, photos: string[]) => void;
  onRequestMaterial: (
    complaintId: string,
    item: string,
    quantity: string,
    urgency: 'Standard' | 'Urgent'
  ) => void;
  onSendMessage: (complaintId: string, content: string) => void;
}

function toLocalDatetimeInput(iso?: string, fallbackHoursAhead = 2): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + fallbackHoursAhead * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function TechnicianJobDetail({
  job,
  currentUser,
  technicians = [],
  allComplaints = [],
  onBack,
  onAcceptOrDecline,
  onScheduleVisit,
  onUpdateStatus,
  onUploadAfterPhotos,
  onRequestMaterial,
  onSendMessage,
}: TechnicianJobDetailProps) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const [visitStart, setVisitStart] = useState(
    toLocalDatetimeInput(job.scheduledVisitStart, 2)
  );
  const [estCompletion, setEstCompletion] = useState(
    toLocalDatetimeInput(job.estimatedCompletionTime, 4)
  );
  const [scheduleNote, setScheduleNote] = useState('');

  const [workNote, setWorkNote] = useState('');
  const [stagedAfterPhotos, setStagedAfterPhotos] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [materialItem, setMaterialItem] = useState('');
  const [materialQty, setMaterialQty] = useState('1 unit');
  const [materialUrgency, setMaterialUrgency] = useState<'Standard' | 'Urgent'>('Standard');

  const [repairBriefLoading, setRepairBriefLoading] = useState(false);
  const [repairBriefError, setRepairBriefError] = useState<string | null>(null);
  const [repairBrief, setRepairBrief] = useState<AiDispatchPlanResult | null>(null);

  const [photoCheckLoading, setPhotoCheckLoading] = useState(false);
  const [photoCheckError, setPhotoCheckError] = useState<string | null>(null);
  const [photoCheckResult, setPhotoCheckResult] = useState<AiRepairAuditResult | null>(null);

  const handleAfterUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    setStagedAfterPhotos((prev) => [...prev, ...urls]);
    onUploadAfterPhotos(job.id, urls);
    setStatusError(null);
    setStatusMessage('After-repair verification photo uploaded.');
  };

  const handleAttachSampleAfter = (src: string) => {
    if (job.afterPhotos.includes(src)) {
      setStatusMessage('This sample completion photograph is already attached.');
      return;
    }
    setStagedAfterPhotos((prev) => (prev.includes(src) ? prev : [...prev, src]));
    onUploadAfterPhotos(job.id, [src]);
    setStatusError(null);
    setStatusMessage('Sample completion photograph attached to job record.');
  };

  const handleScheduleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onScheduleVisit(
      job.id,
      new Date(visitStart).toISOString(),
      new Date(estCompletion).toISOString(),
      scheduleNote
    );
    setScheduleNote('');
    setStatusMessage('Visit schedule saved and shared with student.');
  };

  const handleStatusChange = (nextStatus: ComplaintStatus) => {
    setStatusError(null);
    setStatusMessage(null);
    const err = onUpdateStatus(job.id, nextStatus, workNote);
    if (err) {
      setStatusError(err);
      return;
    }
    setWorkNote('');
    setStatusMessage(`Job status updated to ${nextStatus}.`);
  };

  const handleMaterialSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!materialItem.trim()) return;
    onRequestMaterial(job.id, materialItem, materialQty, materialUrgency);
    setMaterialItem('');
    setStatusMessage('Material request sent to Hostel Warden.');
  };

  const handleGenerateRepairBrief = async () => {
    setRepairBriefError(null);
    setRepairBriefLoading(true);
    try {
      const roster =
        technicians.length > 0
          ? technicians
          : [
              {
                id: job.assignedTechnicianId ?? 'tech-1',
                name: job.assignedTechnicianName ?? currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone ?? '',
                specialty: job.category,
                categories: [job.category],
                availability: 'Available' as const,
                maxDailyJobs: 5,
                rating: 4.8,
                completedJobsTotal: 30,
              },
            ];
      const result = await requestAiDispatchPlan(
        job,
        roster,
        allComplaints.length > 0 ? allComplaints : [job]
      );
      setRepairBrief(result);
    } catch (err) {
      setRepairBriefError(
        err instanceof Error ? err.message : 'Unable to generate repair brief.'
      );
    } finally {
      setRepairBriefLoading(false);
    }
  };

  const handleRunPhotoPreCheck = async () => {
    setPhotoCheckError(null);
    setPhotoCheckLoading(true);
    try {
      const result = await requestAiRepairVerification({
        complaintTitle: job.title,
        category: job.category,
        beforePhoto: job.beforePhotos[0],
        afterPhoto: job.afterPhotos[0],
      });
      setPhotoCheckResult(result);
    } catch (err) {
      setPhotoCheckError(
        err instanceof Error ? err.message : 'Unable to verify completion photograph.'
      );
    } finally {
      setPhotoCheckLoading(false);
    }
  };

  const totalAfterCount = job.afterPhotos.length;

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-sky-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Technician Jobs</span>
        </button>

        <div className="flex items-center gap-2.5">
          <PriorityReadout priority={job.priority} />
          <StatusReadout status={job.status} />
        </div>
      </div>

      {/* Job Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-start">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                {job.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{job.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {job.hostelName} {job.block} · Room {job.roomNumber}
                </span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-navy-950 dark:text-white">{job.title}</h1>
            <p className="max-w-3xl text-sm text-slate-700 dark:text-slate-300">
              {job.description}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
            <p className="font-medium text-slate-500 dark:text-slate-400">
              Student & Availability
            </p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {job.studentName}
            </p>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300">
              {job.preferredAvailability}
            </p>
          </div>
        </div>

        {/* Accept or Decline Banner for Assigned / Reopened */}
        {(job.status === 'Assigned' || job.status === 'Reopened') && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/70 dark:bg-amber-950/35">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                  {job.status === 'Reopened'
                    ? 'Complaint Reopened — Review & Re-Accept'
                    : 'New Job Assignment — Accept or Decline'}
                </h2>
                <p className="text-xs text-amber-900 dark:text-amber-300">
                  {job.reopenReason
                    ? `Student note: "${job.reopenReason}"`
                    : 'Review room details and uploaded photos before accepting into your schedule.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onAcceptOrDecline(job.id, 'accept')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Accept Job</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeclineOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>

            {declineOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!declineReason.trim()) return;
                  onAcceptOrDecline(job.id, 'decline', declineReason);
                  setDeclineOpen(false);
                }}
                className="mt-3 flex flex-col gap-2 border-t border-amber-200 pt-3 dark:border-amber-800/60 sm:flex-row"
              >
                <input
                  type="text"
                  required
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Provide reason for declining (notifies Warden for reassignment)..."
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-amber-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm Decline
                </button>
              </form>
            )}
          </div>
        )}

        {statusError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {statusError}
          </div>
        )}
        {statusMessage && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            {statusMessage}
          </div>
        )}
      </div>

      {/* AI Field Diagnostic & Repair Brief */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Cpu className="h-4 w-4 text-navy-900 dark:text-sky-400" />
              <span>AI Field Repair Brief & Tool Checklist</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Analyzes student description and uploaded fault photo to list required spares,
              diagnostic steps, and a draft arrival message.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateRepairBrief}
            disabled={repairBriefLoading}
            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
          >
            {repairBriefLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cpu className="h-3.5 w-3.5" />
            )}
            <span>{repairBriefLoading ? 'Generating Brief...' : 'Generate Field Brief'}</span>
          </button>
        </div>

        {repairBriefError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {repairBriefError}
          </div>
        )}

        {repairBrief && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-5">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Diagnostic Steps · Est.{' '}
                <span className="font-mono tabular-nums text-navy-900 dark:text-sky-400">
                  {repairBrief.estimatedDurationMinutes} mins
                </span>
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-700 dark:text-slate-300">
                {repairBrief.diagnosticSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Tools & Spares to Pack
              </p>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {repairBrief.toolsAndSpares.map((tool, i) => (
                  <li key={i}>• {tool}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-4">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Suggested Student Message
              </p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                &ldquo;{repairBrief.draftStudentMessage}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  onSendMessage(job.id, repairBrief.draftStudentMessage);
                  setStatusMessage('Sent drafted arrival update to student thread.');
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-navy-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
              >
                <Send className="h-3 w-3" />
                <span>Post Draft to Thread</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Technician Controls Grid: Scheduling + Status & Completion Proof */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Realistic Scheduling & Material Request */}
        <div className="space-y-6 lg:col-span-6">
          <form
            onSubmit={handleScheduleSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <CalendarClock className="h-5 w-5 text-navy-900 dark:text-sky-400" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Schedule Maintenance Visit
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set arrival and completion times that fit your real field workload.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estimated Arrival Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={visitStart}
                  onChange={(e) => setVisitStart(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estimated Completion Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={estCompletion}
                  onChange={(e) => setEstCompletion(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Schedule Note (Optional)
              </label>
              <input
                type="text"
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                placeholder="e.g. Bringing spare 32mm P-trap and PTFE tape."
                className={inputCls}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Current:{' '}
                {job.scheduledVisitStart
                  ? formatDateTime(job.scheduledVisitStart)
                  : 'Unscheduled'}
              </span>
              <button
                type="submit"
                className="rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Save Visit Schedule
              </button>
            </div>
          </form>

          {/* Material Request */}
          <form
            onSubmit={handleMaterialSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <PackagePlus className="h-5 w-5 text-navy-900 dark:text-sky-400" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Request Additional Materials / Assistance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Logs part request to Warden and sets job to Waiting for Materials.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Required Part / Assistance
                </label>
                <input
                  type="text"
                  value={materialItem}
                  onChange={(e) => setMaterialItem(e.target.value)}
                  placeholder="e.g. 32mm PVC elbow + sealant"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Quantity
                </label>
                <input
                  type="text"
                  value={materialQty}
                  onChange={(e) => setMaterialQty(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={materialUrgency}
                onChange={(e) =>
                  setMaterialUrgency(e.target.value as 'Standard' | 'Urgent')
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
              >
                <option value="Standard">Standard Store Request</option>
                <option value="Urgent">Urgent Procurement</option>
              </select>
              <button
                type="submit"
                disabled={!materialItem.trim()}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Submit Material Request
              </button>
            </div>

            {job.materialRequests.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
                {job.materialRequests.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300"
                  >
                    <span>
                      {m.item} ({m.quantity})
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-sky-400">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Right: Work Status Updates & Mandatory After-Photo Proof */}
        <div className="space-y-6 lg:col-span-6">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
            <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Work Progress & Completion Proof
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uploading an after-repair photograph is required before marking the job Completed.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Internal Work Note
              </label>
              <textarea
                rows={2}
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="Record repair actions taken, parts replaced, or observations..."
                className={inputCls}
              />
            </div>

            {/* After-Photo Upload */}
            <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Completion Photographs ({totalAfterCount} uploaded)
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAttachSampleAfter(DEMO_IMAGES.leakAfter)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-900 hover:underline dark:text-sky-400"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Repaired Pipe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttachSampleAfter(DEMO_IMAGES.socketFixed)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-900 hover:underline dark:text-sky-400"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Fixed Socket</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttachSampleAfter(DEMO_IMAGES.doorLockFixed)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-navy-900 hover:underline dark:text-sky-400"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Door Lock</span>
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-medium text-slate-700 hover:border-navy-900 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:border-sky-400">
                <Upload className="h-4 w-4 text-slate-500 dark:text-sky-400" />
                <span>Upload After-Repair Photo from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAfterUpload}
                  className="hidden"
                />
              </label>

              {stagedAfterPhotos.length > 0 && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {stagedAfterPhotos.length} photo(s) added this session and visible below.
                </p>
              )}

              {totalAfterCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleRunPhotoPreCheck}
                    disabled={photoCheckLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:underline disabled:opacity-50 dark:text-sky-400"
                  >
                    {photoCheckLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ScanSearch className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {photoCheckLoading
                        ? 'Checking Proof Photo...'
                        : 'Pre-Check Completion Photo with AI'}
                    </span>
                  </button>
                </div>
              )}

              {photoCheckError && (
                <p className="text-[11px] text-red-700 dark:text-red-400">{photoCheckError}</p>
              )}

              {photoCheckResult && (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-[#0c1322]">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    AI Proof Pre-Check: {photoCheckResult.verificationStatus}
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {photoCheckResult.summary}
                  </p>
                </div>
              )}
            </div>

            {/* Status Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Update Job Status
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('On the Way')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Mark On the Way
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('Work in Progress')}
                  className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/70"
                >
                  Mark Work in Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('Waiting for Materials')}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-900 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-300 dark:hover:bg-orange-900/60"
                >
                  Waiting for Materials
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('Completed')}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                >
                  Mark Completed
                </button>
              </div>
            </div>

            {job.internalWorkNotes.length > 0 && (
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Recorded Work Notes
                </p>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {job.internalWorkNotes.map((n, i) => (
                    <li key={i}>• {n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          Before & After Job Photographs
        </h2>
        <PhotoGallery beforePhotos={job.beforePhotos} afterPhotos={job.afterPhotos} />
      </div>

      {/* Timeline & Thread */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Job Audit Timeline
          </h2>
          <ComplaintTimeline complaint={job} />
        </div>
        <div className="lg:col-span-5">
          <MessageThread
            complaint={job}
            currentUser={currentUser}
            onSendMessage={(content) => onSendMessage(job.id, content)}
          />
        </div>
      </div>
    </div>
  );
}
