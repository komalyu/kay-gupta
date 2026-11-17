import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Cpu,
  Loader2,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  AiMessBriefingResult,
  requestAiMessBriefing,
} from '../../services/aiClient';
import { MealType, MessManagementState } from '../../types/hostelCare';
import {
  getHallAvgWaitMinutes,
  getOccupancyPercent,
} from '../../utils/messHelpers';
import { ChartCanvas } from '../shared/ChartCanvas';
import { useTheme } from '../shared/ThemeProvider';
import { MessOccupancyCard } from './MessOccupancyCard';

interface WardenMessDashboardProps {
  mess: MessManagementState;
  onUpdateSlotCap: (slotId: string, maxCapacity: number) => void;
  onBroadcastRedirect: (fromHallId: string, toHallId?: string) => void;
  onChangeActiveMeal: (mealType: MealType) => void;
  onOpenCampus3D: () => void;
  onOpenMaintenance: () => void;
}

export function WardenMessDashboard({
  mess,
  onUpdateSlotCap,
  onBroadcastRedirect,
  onChangeActiveMeal,
  onOpenCampus3D,
  onOpenMaintenance,
}: WardenMessDashboardProps) {
  const { theme } = useTheme();
  const [question, setQuestion] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBriefing, setAiBriefing] = useState<AiMessBriefingResult | null>(null);

  const metrics = useMemo(() => {
    const totalCapacity = mess.halls.reduce((acc, h) => acc + h.capacity, 0);
    const totalInside = mess.halls.reduce((acc, h) => acc + h.currentOccupancy, 0);
    const overallPct = totalCapacity > 0 ? Math.round((totalInside / totalCapacity) * 100) : 0;
    const avgWait = Math.round(
      mess.halls.reduce((acc, h) => acc + getHallAvgWaitMinutes(h), 0) /
        Math.max(1, mess.halls.length)
    );
    const activePasses = mess.reservations.filter(
      (r) => r.status === 'Booked' || r.status === 'Checked In'
    ).length;
    const activeSkips = mess.skipNotices.filter(
      (n) => n.mealType === mess.activeMeal
    ).length;
    const ratedPasses = mess.reservations.filter((r) => typeof r.crowdRating === 'number');
    const avgComfort =
      ratedPasses.length > 0
        ? (
            ratedPasses.reduce((acc, r) => acc + (r.crowdRating ?? 0), 0) /
            ratedPasses.length
          ).toFixed(1)
        : '4.5';

    return {
      totalCapacity,
      totalInside,
      overallPct,
      avgWait,
      activePasses,
      activeSkips,
      avgComfort,
    };
  }, [mess]);

  const peakCurveData = useMemo(() => {
    return {
      labels: mess.forecastCurve.map((p) => p.slotLabel),
      datasets: [
        {
          label: 'North Hall (%)',
          data: mess.forecastCurve.map((p) => p.northOccupancyPct),
          borderColor: theme === 'dark' ? '#f59e0b' : '#d97706',
          backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(217, 119, 6, 0.14)',
          tension: 0.35,
          fill: false,
        },
        {
          label: 'South Hall (%)',
          data: mess.forecastCurve.map((p) => p.southOccupancyPct),
          borderColor: theme === 'dark' ? '#38bdf8' : '#0f2942',
          backgroundColor: theme === 'dark' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(15, 41, 66, 0.1)',
          tension: 0.35,
          fill: false,
        },
        {
          label: 'Annex Express (%)',
          data: mess.forecastCurve.map((p) => p.annexOccupancyPct),
          borderColor: theme === 'dark' ? '#34d399' : '#16a34a',
          backgroundColor: theme === 'dark' ? 'rgba(52, 211, 153, 0.14)' : 'rgba(22, 163, 74, 0.1)',
          tension: 0.35,
          fill: false,
        },
      ],
    };
  }, [mess.forecastCurve, theme]);

  const waitBarData = useMemo(() => {
    return {
      labels: mess.halls.map((h) => h.name.replace(' Central Mess', '').replace(' Dining Commons', '')),
      datasets: [
        {
          label: 'Current Occupancy (%)',
          data: mess.halls.map((h) => getOccupancyPercent(h)),
          backgroundColor: theme === 'dark' ? '#38bdf8' : '#0f2942',
          borderRadius: 4,
        },
        {
          label: 'Avg Wait (min)',
          data: mess.halls.map((h) => getHallAvgWaitMinutes(h)),
          backgroundColor: theme === 'dark' ? '#fbbf24' : '#d97706',
          borderRadius: 4,
        },
      ],
    };
  }, [mess.halls, theme]);

  const activeSlots = useMemo(
    () => mess.slots.filter((s) => s.mealType === mess.activeMeal),
    [mess.slots, mess.activeMeal]
  );

  const handleRunAi = async (preset?: string) => {
    const q = preset ?? question;
    if (preset) setQuestion(preset);
    setAiError(null);
    setLoadingAi(true);
    try {
      const res = await requestAiMessBriefing({ mess, question: q });
      setAiBriefing(res);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to generate AI mess crowd briefing.'
      );
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Mess Crowd Oversight & Demand Forecasting
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Balance dining hall load across North, South, and Annex messes, tune 20-minute slot
            caps, and forecast portion demand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-[#0c1322]">
            {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as MealType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangeActiveMeal(m)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  mess.activeMeal === m
                    ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenCampus3D}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            3D Campus & Mess Twin
          </button>

          <button
            type="button"
            onClick={onOpenMaintenance}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
          >
            <span>Facility Maintenance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 6-Metric Mess Crowd KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Diners Inside Now
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {metrics.totalInside}
          </p>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            of {metrics.totalCapacity} seats
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Campus Load
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-sky-800 dark:text-sky-400">
            {metrics.overallPct}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg Queue Wait
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {metrics.avgWait}m
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active Meal Passes
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {metrics.activePasses}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Skip Notices ({mess.activeMeal})
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {metrics.activeSkips}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1322]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Crowd Comfort
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
            {metrics.avgComfort}/5
          </p>
        </div>
      </div>

      {/* Live Hall Comparison */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {mess.halls.map((h) => {
          const bestAlt = mess.halls
            .filter((o) => o.id !== h.id)
            .sort((a, b) => getOccupancyPercent(a) - getOccupancyPercent(b))[0];
          return (
            <MessOccupancyCard
              key={h.id}
              hall={h}
              allHalls={mess.halls}
              actionLabel={
                h.overflowRedirectTo
                  ? 'Clear Overflow Redirect'
                  : `Redirect Overflow → ${bestAlt?.name.split(' ')[0] ?? 'South'}`
              }
              onSelect={() =>
                onBroadcastRedirect(
                  h.id,
                  h.overflowRedirectTo ? undefined : bestAlt?.id
                )
              }
            />
          );
        })}
      </div>

      {/* AI Mess Crowd & Kitchen Demand Advisor */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Cpu className="h-4 w-4 text-navy-900 dark:text-sky-400" />
              <span>AI Mess Crowd Balancing & Prep Advisor</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analyze live hall congestion, counter bottlenecks, and meal skip counts via Gemini.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              'Relieve North Hall lunch surge',
              'Optimize kitchen batch prep for skips',
              'Which 20-min slot needs cap boost?',
            ].map((p) => (
              <button
                key={p}
                type="button"
                disabled={loadingAi}
                onClick={() => handleRunAi(p)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-sky-500 hover:text-navy-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-400 dark:hover:text-sky-300"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAi();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about crowd relief, counter bottlenecks, or kitchen portion estimates..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
          />
          <button
            type="submit"
            disabled={loadingAi}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
          >
            {loadingAi ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cpu className="h-3.5 w-3.5" />
            )}
            <span>{loadingAi ? 'Analyzing Crowd...' : 'Run Crowd Analysis'}</span>
          </button>
        </form>

        {aiError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {aiError}
          </div>
        )}

        {aiBriefing && (
          <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-navy-950 dark:text-white">
                {aiBriefing.headline}
              </p>
              <span
                className={`text-xs font-semibold ${
                  aiBriefing.crowdRiskLevel === 'Surge Alert'
                    ? 'text-red-700 dark:text-red-400'
                    : aiBriefing.crowdRiskLevel === 'Elevated'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {aiBriefing.crowdRiskLevel}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {aiBriefing.answer}
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Recommended Flow Actions
                </p>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {aiBriefing.recommendedActions.map((act, idx) => (
                    <li key={idx}>
                      <strong>{act.hallName}:</strong> {act.action}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  Kitchen Prep & Batch Guidance
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {aiBriefing.kitchenPrepGuidance}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts: Peak Crowd Curve + Hall Occupancy Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            Peak Crowd Curve Across 20-Minute Windows
          </h2>
          <ChartCanvas
            type="line"
            data={peakCurveData}
            height={240}
            ariaLabel="Line chart comparing mess occupancy across staggered 20-minute windows"
            options={{
              scales: {
                y: { beginAtZero: true, max: 100 },
              },
            }}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
            Live Hall Utilization vs. Queue Wait
          </h2>
          <ChartCanvas
            type="bar"
            data={waitBarData}
            height={240}
            ariaLabel="Bar chart comparing dining hall occupancy percentage and average wait minutes"
            options={{
              scales: {
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      </div>

      {/* Bottom Split: Slot Capacity Tuner + Crowd Alerts Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <SlidersHorizontal className="h-4 w-4 text-navy-900 dark:text-sky-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {mess.activeMeal} Staggered Slot Capacity Controls
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Throttle or expand slot caps to flatten dining hall arrival spikes.
              </p>
            </div>
          </div>

          <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
            {activeSlots.map((slot) => {
              const hallName =
                mess.halls.find((h) => h.id === slot.messHallId)?.name ?? slot.messHallId;
              return (
                <div
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {hallName} ·{' '}
                      <span className="font-mono text-navy-900 dark:text-sky-400">
                        {slot.windowLabel}
                      </span>
                    </p>
                    <p className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {slot.bookedCount} booked · {slot.checkedInCount} checked in · Cap{' '}
                      {slot.maxCapacity}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateSlotCap(slot.id, slot.maxCapacity - 10)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSlotCap(slot.id, slot.maxCapacity + 10)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      +10
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <Users className="h-4 w-4 text-navy-900 dark:text-sky-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Live Crowd & Batch Alerts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time dining hall surges, batch refills, and student skip notices.
              </p>
            </div>
          </div>

          <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
            {mess.crowdAlerts.slice(0, 6).map((ev) => (
              <div key={ev.id} className="py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      ev.severity === 'critical'
                        ? 'text-red-700 dark:text-red-400'
                        : ev.severity === 'warning'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {ev.severity !== 'info' && <AlertTriangle className="h-3.5 w-3.5" />}
                    <span>{ev.title}</span>
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{ev.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
