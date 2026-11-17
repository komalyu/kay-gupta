import { FormEvent, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { Complaint, TechnicianProfile, UserAccount } from '../../types/hostelCare';
import { formatDateTime, getTechnicianWorkloadLabel } from '../../utils/complaintHelpers';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface TechnicianScheduleScreenProps {
  currentUser: UserAccount;
  technicians: TechnicianProfile[];
  complaints: Complaint[];
  onScheduleVisit: (
    complaintId: string,
    visitStartIso: string,
    estCompletionIso: string,
    note?: string
  ) => void;
  onOpenJob: (complaintId: string) => void;
}

function toInputLocal(iso?: string, addHours = 2): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + addHours * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function TechnicianScheduleScreen({
  currentUser,
  technicians,
  complaints,
  onScheduleVisit,
  onOpenJob,
}: TechnicianScheduleScreenProps) {
  const myTech =
    technicians.find(
      (t) =>
        t.id === currentUser.technicianId ||
        t.email.toLowerCase() === currentUser.email.toLowerCase()
    ) ?? technicians[0];

  const [selectedTechId, setSelectedTechId] = useState(myTech.id);
  const activeTech = technicians.find((t) => t.id === selectedTechId) ?? myTech;
  const workload = getTechnicianWorkloadLabel(activeTech, complaints);

  const activeJobs = complaints.filter(
    (c) =>
      c.assignedTechnicianId === activeTech.id &&
      c.status !== 'Closed' &&
      c.status !== 'Rejected'
  );

  const scheduled = [...activeJobs]
    .filter((c) => Boolean(c.scheduledVisitStart))
    .sort(
      (a, b) =>
        new Date(a.scheduledVisitStart!).getTime() -
        new Date(b.scheduledVisitStart!).getTime()
    );

  const unscheduled = activeJobs.filter((c) => !c.scheduledVisitStart);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const startEditing = (job: Complaint) => {
    setEditingId(job.id);
    setStartInput(toInputLocal(job.scheduledVisitStart, 2));
    setEndInput(toInputLocal(job.estimatedCompletionTime, 4));
    setSavedNotice(null);
  };

  const handleSaveSlot = (e: FormEvent, jobId: string) => {
    e.preventDefault();
    onScheduleVisit(
      jobId,
      new Date(startInput).toISOString(),
      new Date(endInput).toISOString()
    );
    setEditingId(null);
    setSavedNotice(`Updated schedule for ${jobId}. Student notified.`);
  };

  const inputCls =
    'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Technician Daily Work Schedule
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Plan realistic visit slots around student availability and your daily capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeTech.id}
            onChange={(e) => setSelectedTechId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-100"
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.specialty})
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-[#0c1322]">
            <span className="text-slate-500 dark:text-slate-400">Load: </span>
            <span className="font-mono font-semibold tabular-nums text-navy-900 dark:text-sky-400">
              {workload.active}/{activeTech.maxDailyJobs}
            </span>{' '}
            <span className="text-slate-600 dark:text-slate-300">({workload.label})</span>
          </div>
        </div>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scheduled Timeline */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Scheduled Visits ({scheduled.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Ordered by arrival time
            </span>
          </div>

          {scheduled.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No visits scheduled yet. Select an unscheduled job on the right to set a slot.
            </p>
          ) : (
            <div className="space-y-3">
              {scheduled.map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-navy-900 dark:text-sky-400">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>{formatDateTime(job.scheduledVisitStart)}</span>
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        Est. Done {formatDateTime(job.estimatedCompletionTime)}
                      </span>
                    </div>
                    <StatusReadout status={job.status} compact />
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {job.id} · {job.title}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {job.hostelName} {job.block} · Room {job.roomNumber} · Student slot:{' '}
                      {job.preferredAvailability}
                    </span>
                  </p>

                  {editingId === job.id ? (
                    <form
                      onSubmit={(e) => handleSaveSlot(e, job.id)}
                      className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-3"
                    >
                      <input
                        type="datetime-local"
                        required
                        value={startInput}
                        onChange={(e) => setStartInput(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="datetime-local"
                        required
                        value={endInput}
                        onChange={(e) => setEndInput(e.target.value)}
                        className={inputCls}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="submit"
                          className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(job)}
                        className="text-xs font-semibold text-navy-900 hover:underline dark:text-sky-400"
                      >
                        Reschedule Slot
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenJob(job.id)}
                        className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
                      >
                        Open Job Details
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unscheduled Queue */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Unscheduled Jobs ({unscheduled.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">Needs visit slot</span>
          </div>

          {unscheduled.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              All assigned jobs have visit windows scheduled.
            </p>
          ) : (
            <div className="space-y-3">
              {unscheduled.map((job) => (
                <div
                  key={job.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-navy-900 dark:text-sky-400">
                      {job.id}
                    </span>
                    <PriorityReadout priority={job.priority} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {job.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {job.hostelName} {job.block} · Room {job.roomNumber}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Student prefers: {job.preferredAvailability}</span>
                  </p>

                  {editingId === job.id ? (
                    <form
                      onSubmit={(e) => handleSaveSlot(e, job.id)}
                      className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800"
                    >
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="datetime-local"
                          required
                          value={startInput}
                          onChange={(e) => setStartInput(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="datetime-local"
                          required
                          value={endInput}
                          onChange={(e) => setEndInput(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-sky-500 dark:text-slate-950"
                        >
                          Confirm Visit Time
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(job)}
                        className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                      >
                        Schedule Visit
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenJob(job.id)}
                        className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
                      >
                        Open Job
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
