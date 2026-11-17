import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Phone,
  RotateCcw,
  Star,
  UserCheck,
} from 'lucide-react';
import { Complaint, TechnicianProfile, UserAccount } from '../../types/hostelCare';
import { formatDateTime } from '../../utils/complaintHelpers';
import { ComplaintTimeline } from '../shared/ComplaintTimeline';
import { MessageThread } from '../shared/MessageThread';
import { PhotoGallery } from '../shared/PhotoGallery';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface StudentComplaintDetailProps {
  complaint: Complaint;
  technician?: TechnicianProfile;
  currentUser: UserAccount;
  onBack: () => void;
  onConfirmResolution: (
    complaintId: string,
    resolved: boolean,
    options?: { rating?: number; feedbackComment?: string; reopenReason?: string }
  ) => void;
  onSendMessage: (complaintId: string, content: string) => void;
  onViewedScheduled: (complaintId: string) => void;
}

export function StudentComplaintDetail({
  complaint,
  technician,
  currentUser,
  onBack,
  onConfirmResolution,
  onSendMessage,
  onViewedScheduled,
}: StudentComplaintDetailProps) {
  const [confirmMode, setConfirmMode] = useState<'none' | 'yes' | 'no'>('none');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    if (complaint.scheduledVisitStart) {
      onViewedScheduled(complaint.id);
    }
  }, [complaint.id, complaint.scheduledVisitStart, onViewedScheduled]);

  const handleConfirmYes = (e: FormEvent) => {
    e.preventDefault();
    onConfirmResolution(complaint.id, true, {
      rating,
      feedbackComment,
    });
    setConfirmMode('none');
  };

  const handleConfirmNo = (e: FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    onConfirmResolution(complaint.id, false, {
      reopenReason,
    });
    setConfirmMode('none');
    setReopenReason('');
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-sky-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Complaints</span>
        </button>

        <div className="flex items-center gap-2.5">
          <PriorityReadout priority={complaint.priority} />
          <StatusReadout status={complaint.status} />
        </div>
      </div>

      {/* Main Details Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                {complaint.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>{complaint.category}</span>
              <span aria-hidden="true">·</span>
              <span>
                {complaint.hostelName} {complaint.block} · Room {complaint.roomNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>Reported {formatDateTime(complaint.createdAt)}</span>
            </div>
            <h1 className="text-xl font-bold text-navy-950 dark:text-white">
              {complaint.title}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {complaint.description}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900/70">
            <p className="font-medium text-slate-500 dark:text-slate-400">
              Expected Resolution Target
            </p>
            <p className="mt-1 font-mono font-semibold tabular-nums text-slate-900 dark:text-sky-300">
              {formatDateTime(complaint.expectedResolutionAt)}
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Preferred Window: {complaint.preferredAvailability}
            </p>
          </div>
        </div>

        {/* Assigned Technician & Scheduled Visit Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <UserCheck className="h-4 w-4 text-navy-900 dark:text-sky-400" />
              <span>Assigned Technician</span>
            </div>
            {technician ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {technician.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {technician.specialty} · Rating {technician.rating}/5
                </p>
                <p className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{technician.phone}</span>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Pending Warden assignment. You will be notified as soon as a technician is
                assigned.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <CalendarClock className="h-4 w-4 text-navy-900 dark:text-sky-400" />
              <span>Scheduled Visit & Estimate</span>
            </div>
            {complaint.scheduledVisitStart ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-semibold text-navy-900 dark:text-sky-300">
                  Visit: {formatDateTime(complaint.scheduledVisitStart)}
                </p>
                {complaint.estimatedCompletionTime && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Estimated Completion: {formatDateTime(complaint.estimatedCompletionTime)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Technician has not locked a visit slot yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Student Resolution Confirmation Section */}
      {complaint.status === 'Completed' && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-700/70 dark:bg-emerald-950/40">
          <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
            Confirm Repair Resolution
          </h2>
          <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-300">
            The technician marked this job completed and uploaded completion photography below.
            Has the issue in Room {complaint.roomNumber} actually been resolved?
          </p>

          {confirmMode === 'none' && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmMode('yes')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Yes, my problem is resolved</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmMode('no')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>No, the problem still exists</span>
              </button>
            </div>
          )}

          {confirmMode === 'yes' && (
            <form
              onSubmit={handleConfirmYes}
              className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-white p-4 dark:border-emerald-800/70 dark:bg-[#0c1322]"
            >
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Rate Maintenance Quality (1–5)
                </p>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                        rating >= num
                          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-600/70 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>{num}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Feedback Comment (Optional)
                </label>
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="e.g. Fixed neatly within scheduled slot."
                  className={inputCls}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                >
                  Confirm & Close Complaint
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('none')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {confirmMode === 'no' && (
            <form
              onSubmit={handleConfirmNo}
              className="mt-4 space-y-3 rounded-lg border border-red-200 bg-white p-4 dark:border-red-800/70 dark:bg-[#0c1322]"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Describe What Still Needs Attention
                </label>
                <textarea
                  rows={2}
                  required
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Pipe still drips slightly when hot water tap is opened."
                  className={inputCls}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Reopen & Notify Warden
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('none')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {complaint.studentFeedback && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Your Confirmed Feedback
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            Rated {complaint.studentFeedback.rating}/5 · "{complaint.studentFeedback.comment}"
          </p>
        </div>
      )}

      {/* Photo Verification Gallery */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          Before & After Photographic Evidence
        </h2>
        <PhotoGallery
          beforePhotos={complaint.beforePhotos}
          afterPhotos={complaint.afterPhotos}
        />
      </div>

      {/* Timeline & Communication */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Transparent Status Timeline
          </h2>
          <ComplaintTimeline complaint={complaint} />
        </div>
        <div className="lg:col-span-5">
          <MessageThread
            complaint={complaint}
            currentUser={currentUser}
            onSendMessage={(content) => onSendMessage(complaint.id, content)}
          />
        </div>
      </div>
    </div>
  );
}
