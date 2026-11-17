import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { COMPLAINT_CATEGORIES, HOSTEL_BLOCKS, HOSTEL_NAMES } from '../../data/seedData';
import { Complaint, TechnicianProfile } from '../../types/hostelCare';
import { computeAverageResolutionHours } from '../../utils/complaintHelpers';
import { ChartCanvas } from '../shared/ChartCanvas';
import { useTheme } from '../shared/ThemeProvider';

interface ReportsAnalyticsScreenProps {
  complaints: Complaint[];
  technicians: TechnicianProfile[];
}

export function ReportsAnalyticsScreen({
  complaints,
  technicians,
}: ReportsAnalyticsScreenProps) {
  const { theme } = useTheme();

  const summary = useMemo(() => {
    const total = complaints.length;
    const closedOrCompleted = complaints.filter(
      (c) => c.status === 'Closed' || c.status === 'Completed'
    ).length;
    const firstTimeFixCount = complaints.filter(
      (c) => (c.status === 'Closed' || c.status === 'Completed') && c.reopenCount === 0
    ).length;
    const firstTimeFixRate =
      closedOrCompleted > 0 ? Math.round((firstTimeFixCount / closedOrCompleted) * 100) : 100;
    const avgResolution = computeAverageResolutionHours(complaints);

    const rated = complaints.filter((c) => c.studentFeedback);
    const avgRating =
      rated.length > 0
        ? (
            rated.reduce((sum, c) => sum + (c.studentFeedback?.rating ?? 0), 0) / rated.length
          ).toFixed(1)
        : '—';

    return { total, closedOrCompleted, firstTimeFixRate, avgResolution, avgRating };
  }, [complaints]);

  const statusDoughnut = useMemo(() => {
    const pending = complaints.filter((c) => c.status === 'Submitted').length;
    const inProg = complaints.filter((c) =>
      [
        'Assigned',
        'Accepted',
        'Scheduled',
        'On the Way',
        'Work in Progress',
        'Waiting for Materials',
      ].includes(c.status)
    ).length;
    const reopenedOrRejected = complaints.filter(
      (c) => c.status === 'Reopened' || c.status === 'Rejected'
    ).length;
    const resolved = complaints.filter(
      (c) => c.status === 'Completed' || c.status === 'Closed'
    ).length;

    return {
      labels: ['Submitted', 'Active / Scheduled', 'Reopened / Rejected', 'Completed / Closed'],
      datasets: [
        {
          data: [pending, inProg, reopenedOrRejected, resolved],
          backgroundColor:
            theme === 'dark'
              ? ['#fbbf24', '#38bdf8', '#f87171', '#34d399']
              : ['#d97706', '#0f2942', '#dc2626', '#16a34a'],
          borderWidth: 0,
        },
      ],
    };
  }, [complaints, theme]);

  const categoryBar = useMemo(() => {
    return {
      labels: [...COMPLAINT_CATEGORIES],
      datasets: [
        {
          label: 'Total Reports',
          data: COMPLAINT_CATEGORIES.map(
            (cat) => complaints.filter((c) => c.category === cat).length
          ),
          backgroundColor: theme === 'dark' ? '#38bdf8' : '#1e4d7b',
          borderRadius: 4,
        },
      ],
    };
  }, [complaints, theme]);

  const hostelBlockMatrix = useMemo(() => {
    const rows: {
      hostel: string;
      block: string;
      total: number;
      open: number;
      overdue: number;
      closed: number;
    }[] = [];
    for (const h of HOSTEL_NAMES) {
      for (const b of HOSTEL_BLOCKS) {
        const subset = complaints.filter((c) => c.hostelName === h && c.block === b);
        rows.push({
          hostel: h,
          block: b,
          total: subset.length,
          open: subset.filter((c) => c.status !== 'Closed' && c.status !== 'Completed')
            .length,
          overdue: subset.filter((c) => c.isOverdue).length,
          closed: subset.filter(
            (c) => c.status === 'Closed' || c.status === 'Completed'
          ).length,
        });
      }
    }
    return rows;
  }, [complaints]);

  const handleDownloadCsv = () => {
    const headers = [
      'ID',
      'Title',
      'Category',
      'Hostel',
      'Block',
      'Room',
      'Priority',
      'Status',
      'Technician',
      'Overdue',
      'ReopenCount',
      'CreatedAt',
    ];
    const lines = complaints.map((c) =>
      [
        c.id,
        `"${c.title.replace(/"/g, '""')}"`,
        c.category,
        c.hostelName,
        c.block,
        c.roomNumber,
        c.priority,
        c.status,
        `"${c.assignedTechnicianName ?? 'Unassigned'}"`,
        c.isOverdue ? 'Yes' : 'No',
        c.reopenCount,
        c.createdAt,
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hostelcare-maintenance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Maintenance Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Performance metrics, category trends, and exportable records (includes sample
            demonstration data).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Key Performance Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Complaints
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {summary.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            First-Time Fix Rate
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {summary.firstTimeFixRate}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg Resolution Time
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-sky-400">
            {summary.avgResolution}h
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg Student Rating
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {summary.avgRating}/5
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            Complaints by Maintenance Category
          </h2>
          <ChartCanvas
            type="bar"
            data={categoryBar}
            height={260}
            ariaLabel="Complaints by category bar chart"
            options={{
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            }}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            Complaint Status Breakdown
          </h2>
          <ChartCanvas
            type="doughnut"
            data={statusDoughnut}
            height={260}
            ariaLabel="Complaint status distribution doughnut chart"
          />
        </div>
      </div>

      {/* Hostel/Block Breakdown & Technician Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0c1322]">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Hostel & Block Maintenance Matrix
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Hostel</th>
                  <th className="px-4 py-2.5 font-semibold">Block</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Open</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Overdue</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {hostelBlockMatrix.map((row) => (
                  <tr
                    key={`${row.hostel}-${row.block}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                      {row.hostel}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {row.block}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-200">
                      {row.total}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                      {row.open}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-red-700 dark:text-red-400">
                      {row.overdue}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {row.closed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0c1322]">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Technician Performance Summary
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Technician</th>
                  <th className="px-4 py-2.5 font-semibold">Specialty</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Assigned</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Completed</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {technicians.map((t) => {
                  const assigned = complaints.filter(
                    (c) => c.assignedTechnicianId === t.id
                  ).length;
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                        {t.name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {t.specialty}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-200">
                        {assigned}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {t.completedJobsTotal}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-sky-400">
                        {t.rating}/5
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
