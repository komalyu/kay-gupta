import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Box,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Image as ImageIcon,
  Loader2,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
  Users,
  Utensils,
} from 'lucide-react';
import { DEMO_IMAGES } from '../../data/seedData';
import { AiMessBriefingResult, requestAiMessBriefing } from '../../services/aiClient';
import { HostelCareState, UserRole } from '../../types/hostelCare';
import {
  getCrowdBarClass,
  getCrowdLevel,
  getCrowdTextClass,
  getHallAvgWaitMinutes,
  getLeastCrowdedHall,
  getOccupancyPercent,
} from '../../utils/messHelpers';
import { HostelCampus3D } from '../shared/HostelCampus3D';
import { useTheme } from '../shared/ThemeProvider';

interface LandingPageProps {
  state: HostelCareState;
  onGoToLogin: (prefillRole?: UserRole) => void;
  onOpenMvpFeedback: () => void;
}

interface CrowdStageDemo {
  id: string;
  step: string;
  title: string;
  statusLabel: string;
  ownerRole: UserRole;
  studentView: string;
  messStaffView: string;
  wardenView: string;
}

const CROWD_STAGES: CrowdStageDemo[] = [
  {
    id: 'telemetry',
    step: '01',
    title: 'Check Live Mess Occupancy',
    statusLabel: 'Live Seat & Wait Telemetry',
    ownerRole: 'student',
    studentView:
      'Compares North Hall (82% full · 11m wait), South Hall (47% · 4m wait), and Annex Express (27% · 2m wait) before leaving the hostel room.',
    messStaffView:
      'Turnstile counters track entries vs. exits per minute across each serving station.',
    wardenView:
      'Monitors campus-wide dining load across all three mess halls in one live command grid.',
  },
  {
    id: 'slot',
    step: '02',
    title: 'Reserve 20-Min Staggered Slot',
    statusLabel: 'Slot Booked',
    ownerRole: 'student',
    studentView:
      'Picks an open 20-minute arrival slot and dietary preference, receiving an instant Digital Meal Pass token (e.g. SH-1310-84A).',
    messStaffView:
      'Sees incoming reservation volume per 20-minute wave to stage pre-plated trays and chapati batches.',
    wardenView:
      'Tunes max slot capacity per window to flatten the 12:50–13:20 peak lunch spike.',
  },
  {
    id: 'checkin',
    step: '03',
    title: 'QR / Token Turnstile Check-In',
    statusLabel: 'Checked In',
    ownerRole: 'mess_staff',
    studentView:
      'Scans digital token at the dining turnstile for priority entry without standing in an unscheduled walk-in line.',
    messStaffView:
      'Verifies token at the gate scanner in one click, incrementing real-time hall occupancy automatically.',
    wardenView:
      'Tracks booked vs. walk-in arrival adherence across Breakfast, Lunch, Snacks, and Dinner.',
  },
  {
    id: 'counters',
    step: '04',
    title: 'Counter & Batch Pacing',
    statusLabel: 'Kitchen Synced',
    ownerRole: 'mess_staff',
    studentView:
      'Sees live wait minutes on each counter (Main Thali, Hot Chapati, Express Bowl) before picking a queue.',
    messStaffView:
      'Flags slowing counters, triggers 100% food batch replenishment, and shifts staff to bottleneck stations.',
    wardenView:
      'Spots recurring counter slowdowns and correlates batch refill delays with peak queue length.',
  },
  {
    id: 'redirect',
    step: '05',
    title: 'Peak Overflow Diversion',
    statusLabel: 'Overflow Redirected',
    ownerRole: 'warden',
    studentView:
      'Receives an immediate advisory banner redirecting incoming diners from busy North Hall to open South Hall or Annex Express.',
    messStaffView:
      'Activates overflow redirect in one click whenever a dining hall crosses 85% seat capacity.',
    wardenView:
      'Runs Gemini AI Crowd Advisor to rebalance flow across halls and adjust upcoming slot caps.',
  },
  {
    id: 'exit',
    step: '06',
    title: 'Skip Notices & Meal Exit Audit',
    statusLabel: 'Waste & Seat Freed',
    ownerRole: 'student',
    studentView:
      'Logs meal skips when eating off-campus and marks meal exit to free seating while rating crowd comfort (1–5).',
    messStaffView:
      'Adjusts live chapati and curry batch volumes downward using verified student skip counts.',
    wardenView:
      'Reviews crowd comfort scores, peak curves, and food waste reductions across the semester.',
  },
];

export function LandingPage({
  state,
  onGoToLogin,
  onOpenMvpFeedback,
}: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [heroVisualMode, setHeroVisualMode] = useState<'live' | '3d' | 'photo'>('live');
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const [aiQuestion, setAiQuestion] = useState(
    'How should we relieve North Hall Central Mess during the 12:50–13:20 peak wave?'
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiMessBriefingResult | null>(null);

  const mess = state.mess;
  const totalCapacity = useMemo(
    () => mess.halls.reduce((acc, h) => acc + h.capacity, 0),
    [mess.halls]
  );
  const totalDiners = useMemo(
    () => mess.halls.reduce((acc, h) => acc + h.currentOccupancy, 0),
    [mess.halls]
  );
  const avgWait = useMemo(
    () =>
      Math.round(
        mess.halls.reduce((acc, h) => acc + getHallAvgWaitMinutes(h), 0) /
          Math.max(1, mess.halls.length)
      ),
    [mess.halls]
  );
  const leastCrowded = useMemo(() => getLeastCrowdedHall(mess.halls), [mess.halls]);

  const handleRunLandingAi = async (presetQ?: string) => {
    const q = presetQ ?? aiQuestion;
    if (presetQ) setAiQuestion(presetQ);
    setAiError(null);
    setAiLoading(true);
    try {
      const result = await requestAiMessBriefing({
        mess,
        question: q,
      });
      setAiResult(result);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to generate AI crowd analysis.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const activeStage = CROWD_STAGES[activeStageIdx];

  return (
    <div className="futuristic-grid min-h-screen bg-[#f4f6f9] text-slate-900 transition-colors dark:bg-[#060b14] dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800/90 dark:bg-[#060b14]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-navy-900 dark:text-sky-400 whitespace-nowrap shrink-0"
          >
            HostelCare
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#overview"
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Live Crowd
            </a>
            <a
              href="#roles"
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Role Portals
            </a>
            <a
              href="#flow"
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Slot Flow
            </a>
            <a
              href="#dining-ops"
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Dining Ops
            </a>
            <a
              href="#ai-advisor"
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              AI Advisor
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGoToLogin('student')}
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:font-semibold dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
            >
              Open Portal
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split: Mess Crowd Management Primary Focus */}
        <section id="overview" className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
              <div className="space-y-5">
                <p className="text-xs font-medium text-slate-500 dark:text-sky-400">
                  Smart Hostel Mess Crowd Management · Live Occupancy & Slot Control
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-navy-950 dark:text-white sm:text-4xl lg:text-[2.55rem] lg:leading-[1.12] [text-wrap:balance]">
                  Skip the Mess Queue. Balance Dining Crowds in Real Time.
                </h1>
                <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                  HostelCare gives students live dining hall seat availability and 20-minute
                  staggered meal passes, while equipping mess staff and wardens with counter queue
                  pacing, turnstile check-in, and AI crowd balancing.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onGoToLogin('student')}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap shrink-0"
                  >
                    <span>Book Meal Slot</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onGoToLogin('mess_staff')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <span>Mess Staff Console</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <p>
                    Demo accounts:{' '}
                    <span className="font-mono text-slate-700 dark:text-sky-300">
                      student@demo.com
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono text-slate-700 dark:text-sky-300">
                      mess@demo.com
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono text-slate-700 dark:text-sky-300">
                      warden@demo.com
                    </span>
                  </p>
                  <p className="mt-0.5">
                    Password:{' '}
                    <span className="font-mono text-slate-700 dark:text-slate-200">demo123</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {heroVisualMode === 'live'
                    ? `Active Service: ${mess.activeMeal} · ${
                        leastCrowded
                          ? `Fastest hall: ${leastCrowded.name} (${getHallAvgWaitMinutes(
                              leastCrowded
                            )}m wait)`
                          : 'Live hall telemetry'
                      }`
                    : heroVisualMode === '3d'
                    ? 'Interactive 3D Campus & Mess Pavilion Twin'
                    : 'Central Hostel Dining Hall & Serving Counters'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-400" />
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-3.5 w-3.5 text-navy-900" />
                        <span>Dark</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-[#0c1322]">
                    <button
                      type="button"
                      onClick={() => setHeroVisualMode('live')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        heroVisualMode === 'live'
                          ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Live Crowd</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroVisualMode('photo')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        heroVisualMode === 'photo'
                          ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Dining Hall</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroVisualMode('3d')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        heroVisualMode === '3d'
                          ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      <Box className="h-3.5 w-3.5" />
                      <span>3D Campus</span>
                    </button>
                  </div>
                </div>
              </div>

              {heroVisualMode === 'live' ? (
                <div className="flex h-[440px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div>
                      <p className="font-mono text-xs font-semibold text-navy-900 dark:text-sky-400">
                        LIVE DINING TELEMETRY · {mess.activeMeal.toUpperCase()} SERVICE
                      </p>
                      <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                        Campus Dining Hall Crowd Board
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => onGoToLogin('student')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-navy-900 hover:underline dark:text-sky-400"
                    >
                      <span>Reserve Seat</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {mess.halls.map((hall) => {
                      const pct = getOccupancyPercent(hall);
                      const level = getCrowdLevel(hall);
                      const wait = getHallAvgWaitMinutes(hall);
                      return (
                        <div key={hall.id} className="py-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {hall.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {hall.wing} · {hall.counters.length} counters active
                              </p>
                            </div>
                            <div className="text-right font-mono tabular-nums">
                              <p className={`text-xs font-semibold ${getCrowdTextClass(level)}`}>
                                {level} · {pct}%
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                {hall.currentOccupancy}/{hall.capacity} seats · ~{wait}m wait
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full transition-all ${getCrowdBarClass(level)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    <span>
                      Today&apos;s {mess.activeMeal} Menu:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {mess.menuHighlights[mess.activeMeal].slice(0, 2).join(', ')}
                      </strong>
                    </span>
                    <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                      {mess.skipNotices.length} skip notices logged
                    </span>
                  </div>
                </div>
              ) : heroVisualMode === '3d' ? (
                <HostelCampus3D
                  complaints={state.complaints}
                  messHalls={mess.halls}
                  height={440}
                  compactMode
                  onOpenComplaintDetail={() => onGoToLogin('warden')}
                />
              ) : (
                <div className="h-[440px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#0c1322]">
                  {heroImgFailed ? (
                    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center dark:from-slate-900 dark:to-slate-950">
                      <Utensils className="mb-3 h-10 w-10 text-navy-900 dark:text-sky-400" />
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        North Hall & South Hall Dining Commons
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Staggered meal slots & live counter telemetry
                      </p>
                    </div>
                  ) : (
                    <img
                      src={DEMO_IMAGES.messHero}
                      alt="Modern university hostel dining hall interior with communal tables and serving counters"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4-column summary strip immediately below hero */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Live Diners Across Campus
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
                {totalDiners}/{totalCapacity}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {Math.round((totalDiners / Math.max(1, totalCapacity)) * 100)}% total seating in use
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Avg Counter Wait
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-white">
                {avgWait} min
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Across {mess.halls.length} active dining halls
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Staggered Meal Slots
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-navy-950 dark:text-sky-400">
                {mess.slots.length}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                20-minute arrival waves prevent surge queues
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Meal Skips Logged
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {mess.skipNotices.length}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Direct kitchen waste & queue reduction
              </p>
            </div>
          </div>
        </section>

        {/* Three Role Portals */}
        <section
          id="roles"
          className="border-t border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-[#090f1c]"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white [text-wrap:balance]">
                Three Coordinated Portals for Zero-Bottleneck Dining
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Every slot reservation, turnstile check-in, counter slowdown, or meal skip updates
                occupancy and recommendations across all roles immediately.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6 transition-colors hover:border-sky-500/60 dark:border-slate-800 dark:bg-[#0c1322]">
                <div className="space-y-3">
                  <QrCode className="h-6 w-6 text-navy-900 dark:text-sky-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    01. Student / Diner Portal
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Compare live dining hall seat loads, book a 20-minute slot for a digital QR
                    meal pass, log meal skips to cut food waste, and rate crowd comfort.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToLogin('student')}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline dark:text-sky-400"
                >
                  <span>Enter as Student</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6 transition-colors hover:border-sky-500/60 dark:border-slate-800 dark:bg-[#0c1322]">
                <div className="space-y-3">
                  <Utensils className="h-6 w-6 text-navy-900 dark:text-sky-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    02. Mess Supervisor Console
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Scan meal passes at the turnstile, adjust live walk-in/exit counts, trigger
                    food batch refills on chapati/thali counters, and divert peak overflow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToLogin('mess_staff')}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline dark:text-sky-400"
                >
                  <span>Enter as Mess Staff</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-6 transition-colors hover:border-sky-500/60 dark:border-slate-800 dark:bg-[#0c1322]">
                <div className="space-y-3">
                  <ShieldCheck className="h-6 w-6 text-navy-900 dark:text-sky-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    03. Warden Crowd & Ops Oversight
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Track campus-wide peak curves, tune 20-minute slot caps, run Gemini AI crowd
                    balancing briefings, and oversee secondary hostel facility maintenance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToLogin('warden')}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:underline dark:text-sky-400"
                >
                  <span>Enter as Warden</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Mess Slot & Crowd Balancing Explorer */}
        <section
          id="flow"
          className="border-t border-slate-200 bg-[#f4f6f9] py-14 dark:border-slate-800 dark:bg-[#060b14]"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white [text-wrap:balance]">
                  How Staggered Mess Crowd Balancing Works
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Step through each operational stage to see how students, mess supervisors, and
                  wardens stay synchronized during peak breakfast, lunch, and dinner waves.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveStageIdx((prev) => (prev + 1) % CROWD_STAGES.length)}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-sky-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-sky-400 dark:hover:bg-slate-800"
              >
                <span>Advance Stage</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {CROWD_STAGES.map((stage, idx) => {
                const isSelected = idx === activeStageIdx;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStageIdx(idx)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-white shadow-sm dark:border-sky-400 dark:bg-[#0e192d]'
                        : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-[#0c1322]/80 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-bold ${
                        isSelected
                          ? 'text-navy-900 dark:text-sky-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      STEP {stage.step}
                    </span>
                    <span className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {stage.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <p className="font-mono text-xs font-semibold text-navy-900 dark:text-sky-400">
                    STAGE {activeStage.step} · {activeStage.statusLabel.toUpperCase()}
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                    {activeStage.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToLogin(activeStage.ownerRole)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <span>
                    Try as{' '}
                    {activeStage.ownerRole === 'mess_staff' ? 'Mess Staff' : activeStage.ownerRole}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-sky-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Student Sees</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {activeStage.studentView}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-sky-300">
                    <CalendarClock className="h-4 w-4 text-navy-900 dark:text-sky-400" />
                    <span>Mess Staff Controls</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {activeStage.messStaffView}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-sky-300">
                    <Clock className="h-4 w-4 text-navy-900 dark:text-amber-400" />
                    <span>Warden Oversight</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {activeStage.wardenView}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dining Operations Visual Showcase */}
        <section
          id="dining-ops"
          className="border-t border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-[#090f1c]"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white [text-wrap:balance]">
                From Entry Turnstile to Serving Counter
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Real-time visibility across dining entrances, serving counters, and seating zones
                keeps wait times predictable and kitchen replenishment proactive.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  src: DEMO_IMAGES.messKiosk,
                  alt: 'Student scanning digital meal pass QR token at hostel dining hall turnstile',
                  kicker: '01. Fast-Track Gate Scan',
                  title: 'Digital Meal Pass Turnstiles',
                  caption: 'Scheduled pass holders verify entry in seconds while updating live seat counts.',
                },
                {
                  src: DEMO_IMAGES.messCounter,
                  alt: 'Clean hostel cafeteria serving counter line with warm chafing dishes',
                  kicker: '02. Counter Queue Telemetry',
                  title: 'Station-Level Wait & Batch Tracking',
                  caption: 'Monitor thali, chapati, and express bowl lines independently to clear bottlenecks.',
                },
                {
                  src: DEMO_IMAGES.messHero,
                  alt: 'Spacious modern university hostel dining hall interior',
                  kicker: '03. Cross-Hall Balancing',
                  title: 'North, South & Annex Load Sharing',
                  caption: 'Redirect overflow diners to quieter halls before queues spill into corridors.',
                },
              ].map((card) => (
                <figure
                  key={card.title}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0c1322]"
                >
                  <img
                    src={card.src}
                    alt={card.alt}
                    referrerPolicy="no-referrer"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <figcaption className="space-y-1 border-t border-slate-200 p-4 dark:border-slate-800">
                    <p className="font-mono text-[11px] font-medium text-navy-900 dark:text-sky-400">
                      {card.kicker}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {card.title}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {card.caption}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Live AI Mess Crowd Advisor Sandbox */}
        <section
          id="ai-advisor"
          className="border-t border-slate-200 bg-[#f4f6f9] py-14 dark:border-slate-800 dark:bg-[#060b14]"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white [text-wrap:balance]">
                  AI Mess Crowd Balancing & Prep Advisor
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Run Gemini across live North Hall, South Hall, and Annex Express occupancy to
                  generate instant overflow diversion steps and kitchen batch guidance.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 self-start dark:border-slate-700 dark:bg-[#0c1322]">
                {[
                  {
                    label: 'Relieve North Hall',
                    q: 'How should we relieve North Hall Central Mess during the 12:50–13:20 peak wave?',
                  },
                  {
                    label: 'Batch & Waste Prep',
                    q: 'Adjust kitchen batch prep factoring in current skip notices and counter levels.',
                  },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleRunLandingAi(p.q)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Crowd & Kitchen Operations Question
                  </label>
                  <textarea
                    rows={4}
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Reads live hall, counter & skip data
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRunLandingAi()}
                    disabled={aiLoading || !aiQuestion.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Cpu className="h-3.5 w-3.5" />
                    )}
                    <span>{aiLoading ? 'Analyzing Crowds...' : 'Run AI Crowd Advisor'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7">
                {aiError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
                  >
                    {aiError}
                  </div>
                ) : aiResult ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                      <div>
                        <p className="font-mono text-[11px] font-semibold text-navy-900 dark:text-sky-400">
                          CROWD STATUS: {aiResult.crowdRiskLevel.toUpperCase()}
                        </p>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {aiResult.headline}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onGoToLogin('warden')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-navy-900 hover:underline dark:text-sky-400"
                      >
                        <span>Open Warden Console</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      {aiResult.answer}
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          Recommended Hall Actions
                        </p>
                        <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          {aiResult.recommendedActions.map((act, idx) => (
                            <li key={idx}>
                              <strong>{act.hallName}:</strong> {act.action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          Kitchen Batch Guidance
                        </p>
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {aiResult.kitchenPrepGuidance}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-center space-y-2 py-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Ready to analyze live mess occupancy and counter queues
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      Click &ldquo;Run AI Crowd Advisor&rdquo; to inspect how Gemini recommends
                      redirecting North Hall overflow, pacing chapati batches, and sizing dinner
                      prep around student skip notices.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-[#090f1c]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-sm font-bold text-navy-900 dark:text-sky-400">
              HostelCare
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Smart Hostel Mess Crowd Management & Campus Facilities Platform
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => onGoToLogin('student')}
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline"
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => onGoToLogin('mess_staff')}
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline"
            >
              Mess Staff
            </button>
            <button
              type="button"
              onClick={() => onGoToLogin('warden')}
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline"
            >
              Warden Oversight
            </button>
            <button
              type="button"
              onClick={onOpenMvpFeedback}
              className="hover:text-navy-900 dark:hover:text-sky-400 hover:underline"
            >
              MVP Usability Feedback
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
