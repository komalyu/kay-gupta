import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  QrCode,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import {
  CounterStatus,
  MealType,
  MessManagementState,
  ReservationStatus,
} from '../../types/hostelCare';
import {
  getCounterStatusTextClass,
  getCrowdBarClass,
  getCrowdLevel,
  getCrowdTextClass,
  getHallAvgWaitMinutes,
  getOccupancyPercent,
  getReservationStatusClass,
} from '../../utils/messHelpers';

interface MessStaffScreenProps {
  staffName: string;
  mess: MessManagementState;
  onCheckInToken: (tokenOrId: string) => void;
  onCompletePass: (reservationId: string) => void;
  onAdjustOccupancy: (hallId: string, delta: number) => void;
  onUpdateCounter: (
    hallId: string,
    counterId: string,
    status: CounterStatus,
    replenishBatch?: boolean
  ) => void;
  onBroadcastRedirect: (fromHallId: string, toHallId?: string) => void;
  onChangeActiveMeal: (mealType: MealType) => void;
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const COUNTER_STATUSES: CounterStatus[] = ['Open', 'Slowed', 'Refilling', 'Paused'];

export function MessStaffScreen({
  mess,
  onCheckInToken,
  onCompletePass,
  onAdjustOccupancy,
  onUpdateCounter,
  onBroadcastRedirect,
  onChangeActiveMeal,
}: MessStaffScreenProps) {
  const [selectedHallId, setSelectedHallId] = useState<string>(
    mess.halls[0]?.id ?? 'mess-north'
  );
  const [tokenInput, setTokenInput] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | ReservationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedHall = mess.halls.find((h) => h.id === selectedHallId) ?? mess.halls[0];
  const pct = selectedHall ? getOccupancyPercent(selectedHall) : 0;
  const level = selectedHall ? getCrowdLevel(selectedHall) : 'Low';
  const avgWait = selectedHall ? getHallAvgWaitMinutes(selectedHall) : 0;

  const otherHalls = useMemo(
    () =>
      mess.halls
        .filter((h) => h.id !== selectedHall?.id)
        .sort((a, b) => getOccupancyPercent(a) - getOccupancyPercent(b)),
    [mess.halls, selectedHall]
  );

  const filteredReservations = useMemo(() => {
    return mess.reservations.filter((r) => {
      if (queueFilter !== 'all' && r.status !== queueFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.tokenCode.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q) ||
          r.messHallName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mess.reservations, queueFilter, searchQuery]);

  const handleTokenSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    onCheckInToken(tokenInput.trim());
    setTokenInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header + Active Meal Switcher */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Mess Gate Turnstile & Counter Control
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Scan student meal tokens, balance serving counter speeds, replenish food batches, and
            redirect peak overflow.
          </p>
        </div>

        <div className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-[#0c1322]">
          {MEAL_TYPES.map((meal) => (
            <button
              key={meal}
              type="button"
              onClick={() => onChangeActiveMeal(meal)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                mess.activeMeal === meal
                  ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {meal}
            </button>
          ))}
        </div>
      </div>

      {/* Hall Selector Strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {mess.halls.map((h) => {
          const hPct = getOccupancyPercent(h);
          const hLevel = getCrowdLevel(h);
          const isSelected = h.id === selectedHall?.id;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelectedHallId(h.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-navy-900 bg-white dark:border-sky-400 dark:bg-[#0e192d]'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#0c1322] dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {h.name}
                </span>
                <span className={`font-mono text-xs font-semibold tabular-nums ${getCrowdTextClass(hLevel)}`}>
                  {hPct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full ${getCrowdBarClass(hLevel)}`} style={{ width: `${hPct}%` }} />
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {h.currentOccupancy}/{h.capacity} inside · {hLevel}
              </p>
            </button>
          );
        })}
      </div>

      {/* Turnstile Occupancy Control + Gate Scanner */}
      {selectedHall && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {selectedHall.name} — Turnstile Headcount
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manual gate adjustment for walk-ins, exits, or sensor calibration.
                </p>
              </div>
              <span className={`text-xs font-semibold ${getCrowdTextClass(level)}`}>
                {level} · ~{avgWait} min wait
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <Users className="h-5 w-5 text-navy-900 dark:text-sky-400" />
                <span className="font-mono text-3xl font-bold tabular-nums text-navy-950 dark:text-white">
                  {selectedHall.currentOccupancy}
                </span>
                <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  / {selectedHall.capacity} seats ({pct}%)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[-10, -5, -1].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onAdjustOccupancy(selectedHall.id, d)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <MinusCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{d} Exit</span>
                  </button>
                ))}
                {[1, 5, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onAdjustOccupancy(selectedHall.id, d)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>+{d} In</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overflow Redirect Control */}
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Overflow Crowd Redirect
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notify incoming students to head to a quieter dining hall.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedHall.overflowRedirectTo ? (
                    <button
                      type="button"
                      onClick={() => onBroadcastRedirect(selectedHall.id, undefined)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                    >
                      Clear Active Redirect
                    </button>
                  ) : (
                    otherHalls.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => onBroadcastRedirect(selectedHall.id, target.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>
                          Redirect → {target.name.split(' ')[0]} ({getOccupancyPercent(target)}%)
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gate Token Scanner */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-6">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <QrCode className="h-4 w-4 text-navy-900 dark:text-sky-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Scan / Check-In Student Meal Token
                </h2>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Enter a reservation ID or token code (for example{' '}
                <span className="font-mono text-slate-700 dark:text-sky-300">SH-1310-84A</span> or{' '}
                <span className="font-mono text-slate-700 dark:text-sky-300">NH-1310-52F</span>) to
                admit the student and increment live dining occupancy.
              </p>

              <form onSubmit={handleTokenSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter token code (e.g. SH-1310-84A)..."
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verify & Admit</span>
                </button>
              </form>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                Active Skips Logged for {mess.activeMeal}:{' '}
                <strong className="font-mono text-slate-800 dark:text-white">
                  {mess.skipNotices.filter((n) => n.mealType === mess.activeMeal).length}
                </strong>
              </span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>
                Pending Check-Ins:{' '}
                <strong className="font-mono text-slate-800 dark:text-white">
                  {mess.reservations.filter((r) => r.status === 'Booked').length}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Serving Counter Queue & Batch Replenishment */}
      {selectedHall && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
          <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Serving Counter Pacing & Batch Levels · {selectedHall.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust counter operational status or trigger kitchen batch replenishment when levels
              drop below 50%.
            </p>
          </div>

          <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {selectedHall.counters.map((cnt) => (
              <div
                key={cnt.id}
                className="flex flex-col justify-between gap-3 py-3.5 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {cnt.name}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{cnt.stationType}</span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className={`font-semibold ${getCounterStatusTextClass(cnt.status)}`}>
                      {cnt.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                    <span>Queue: {cnt.queueLength} diners</span>
                    <span>Wait: ~{cnt.avgWaitMinutes} min</span>
                    <span>
                      Food Batch:{' '}
                      <strong
                        className={
                          cnt.batchLevelPct < 50
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {cnt.batchLevelPct}%
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                    {COUNTER_STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateCounter(selectedHall.id, cnt.id, st, false)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                          cnt.status === st
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateCounter(selectedHall.id, cnt.id, 'Open', true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Replenish 100%</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Reservation Queue */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Booked & Checked-In Meal Passes ({filteredReservations.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check in arriving students or mark diners as exited to keep occupancy live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or token..."
                className="rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
              {(['all', 'Booked', 'Checked In', 'Completed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setQueueFilter(tab)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    queueFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
          {filteredReservations.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No meal passes match this filter.
            </p>
          ) : (
            filteredReservations.map((res) => (
              <div
                key={res.id}
                className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                      {res.tokenCode}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {res.studentName}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {res.messHallName}
                    </span>
                  </div>
                  <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {res.mealType} {res.windowLabel} · {res.dietaryPreference}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-xs font-semibold ${getReservationStatusClass(res.status)}`}>
                    {res.status}
                  </span>
                  {res.status === 'Booked' && (
                    <button
                      type="button"
                      onClick={() => onCheckInToken(res.tokenCode)}
                      className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
                    >
                      Check In
                    </button>
                  )}
                  {res.status === 'Checked In' && (
                    <button
                      type="button"
                      onClick={() => onCompletePass(res.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                    >
                      Mark Exited
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
