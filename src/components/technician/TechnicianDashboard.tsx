import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Wrench,
} from 'lucide-react';
import {
  Complaint,
  TechnicianAvailability,
  TechnicianProfile,
  UserAccount,
} from '../../types/hostelCare';
import {
  formatDateTime,
  getTechnicianWorkloadLabel,
} from '../../utils/complaintHelpers';
import { PriorityReadout, StatusReadout } from '../shared/StatusReadout';

interface TechnicianDashboardProps {
  currentUser: UserAccount;
  technicians: TechnicianProfile[];
  complaints: Complaint[];
  onOpenJob: (complaintId: string) => void;
  onOpenSchedule: () => void;
  onUpdateAvailability: (techId: string, availability: TechnicianAvailability) => void;
  onAcceptJob: (complaintId: string) => void;
}

export function TechnicianDashboard({
  currentUser,
  technicians,
  complaints,
  onOpenJob,
  onOpenSchedule,
  onUpdateAvailability,
  onAcceptJob,
}: TechnicianDashboardProps) {
  const myTech =
    technicians.find(
      (t) =>
        t.id === currentUser.technicianId ||
        t.email.toLowerCase() === currentUser.email.toLowerCase()
    ) ?? technicians[0];

  const [selectedTechId, setSelectedTechId] = useState<string>(myTech.id);
  const [tab, setTab] = useState<'new' | 'active' | 'history'>('new');

  const activeTech = technicians.find((t) => t.id === selectedTechId) ?? myTech;
  const workload = getTechnicianWorkloadLabel(activeTech, complaints);

  const techJobs = useMemo(
    () => complaints.filter((c) => c.assignedTechnicianId === activeTech.id),
    [complaints, activeTech.id]
  );

  const newJobs = techJobs.filter(
    (c) => c.status === 'Assigned' || c.status === 'Reopened'
  );
  const activeJobs = techJobs.filter((c) =>
    [
      'Accepted',
      'Scheduled',
      'On the Way',
      'Work in Progress',
      'Waiting for Materials',
    ].includes(c.status)
  );
  const completedHistory = techJobs.filter(
    (c) => c.status === 'Completed' || c.status === 'Closed'
  );

  const visibleList =
    tab === 'new' ? newJobs : tab === 'active' ? activeJobs : completedHistory;

  const selectCls =
    'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="space-y-6">
      {/* Header + Availability & Technician Switcher */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Technician Workbench</span>
            <span aria-hidden="true">·</span>
            <span>{activeTech.specialty}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums dark:text-sky-400">
              Rating {activeTech.rating}/5
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            {activeTech.name}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Workload:{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-sky-400">
              {workload.active}/{activeTech.maxDailyJobs}
            </span>{' '}
            active jobs ({workload.label})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              View Queue For
            </label>
            <select
              value={activeTech.id}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className={selectCls}
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Availability Status
            </label>
            <select
              value={activeTech.availability}
              onChange={(e) =>
                onUpdateAvailability(
                  activeTech.id,
                  e.target.value as TechnicianAvailability
                )
              }
              className={selectCls}
            >
              <option value="Available">Available</option>
              <option value="On Field">On Field</option>
              <option value="Off Shift">Off Shift</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenSchedule}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap sm:mt-4"
          >
            <CalendarClock className="h-4 w-4" />
            <span>Daily Schedule</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            New / Pending Acceptance
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {newJobs.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active & Scheduled
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-sky-900 dark:text-sky-400">
            {activeJobs.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Completed (Queue)
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {completedHistory.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Historical Completed
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {activeTech.completedJobsTotal}
          </p>
        </div>
      </div>

      {/* Job Queue Tabs & List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setTab('new')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                tab === 'new'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              New Assigned ({newJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                tab === 'active'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Active & Scheduled ({activeJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                tab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Completion History ({completedHistory.length})
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accept jobs and set realistic visit windows aligned with your daily load.
          </p>
        </div>

        {visibleList.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardList className="mx-auto mb-2 h-6 w-6 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No jobs in this queue right now.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Switch tabs above or wait for the Warden to assign new complaints.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleList.map((job) => (
              <div
                key={job.id}
                className="flex flex-col justify-between gap-4 py-4 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 space-y-1.5">
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
                    {job.isOverdue && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Overdue</span>
                        </span>
                      </>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {job.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Student Availability: {job.preferredAvailability}</span>
                    {job.scheduledVisitStart && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-sky-900 dark:text-sky-300">
                          Scheduled: {formatDateTime(job.scheduledVisitStart)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <PriorityReadout priority={job.priority} />
                  <StatusReadout status={job.status} />

                  {(job.status === 'Assigned' || job.status === 'Reopened') && (
                    <button
                      type="button"
                      onClick={() => onAcceptJob(job.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Accept</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenJob(job.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Wrench className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
                    <span>Manage Job</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
