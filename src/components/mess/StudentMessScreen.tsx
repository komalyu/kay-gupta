import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  QrCode,
  Star,
  Utensils,
  XCircle,
} from 'lucide-react';
import {
  DietaryPreference,
  MealType,
  MessManagementState,
  UserAccount,
} from '../../types/hostelCare';
import {
  getHallAvgWaitMinutes,
  getLeastCrowdedHall,
  getOccupancyPercent,
  getReservationStatusClass,
} from '../../utils/messHelpers';
import { MessOccupancyCard } from './MessOccupancyCard';

interface StudentMessScreenProps {
  currentUser: UserAccount;
  mess: MessManagementState;
  onBookSlot: (payload: {
    messHallId: string;
    slotId: string;
    dietaryPreference: DietaryPreference;
  }) => void;
  onCheckInPass: (reservationIdOrToken: string) => void;
  onCompletePass: (reservationId: string, rating?: number) => void;
  onCancelPass: (reservationId: string) => void;
  onRatePass: (reservationId: string, rating: number) => void;
  onDeclareSkip: (payload: {
    mealType: MealType;
    messHallId: string;
    reason: string;
  }) => void;
}

function TokenQrMatrix({ code }: { code: string }) {
  // Deterministic 7x7 matrix pattern derived from token string for clean visual pass scan
  const cells = useMemo(() => {
    const arr: boolean[] = [];
    let seed = 0;
    for (let i = 0; i < code.length; i++) {
      seed = (seed * 31 + code.charCodeAt(i)) % 9973;
    }
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isCorner =
          (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
        const bit = ((seed + r * 17 + c * 29) % 3) !== 0;
        arr.push(isCorner || bit);
      }
    }
    return arr;
  }, [code]);

  return (
    <svg
      viewBox="0 0 70 70"
      className="h-20 w-20 rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-700"
      aria-label={`QR pass matrix for ${code}`}
    >
      {cells.map((filled, idx) => {
        if (!filled) return null;
        const r = Math.floor(idx / 7);
        const c = idx % 7;
        return (
          <rect
            key={idx}
            x={c * 10 + 1}
            y={r * 10 + 1}
            width={8}
            height={8}
            rx={1.5}
            fill="#0f2942"
          />
        );
      })}
    </svg>
  );
}

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const DIETARY_OPTIONS: DietaryPreference[] = [
  'Regular',
  'High-Protein',
  'Jain / No-Onion',
  'Express Grab',
];

export function StudentMessScreen({
  currentUser,
  mess,
  onBookSlot,
  onCheckInPass,
  onCompletePass,
  onCancelPass,
  onRatePass,
  onDeclareSkip,
}: StudentMessScreenProps) {
  const [selectedHallId, setSelectedHallId] = useState<string>(
    mess.halls[1]?.id ?? mess.halls[0]?.id ?? 'mess-north'
  );
  const [selectedMeal, setSelectedMeal] = useState<MealType>(mess.activeMeal);
  const [dietary, setDietary] = useState<DietaryPreference>('Regular');
  const [skipReason, setSkipReason] = useState('Off-campus class / workshop');
  const [skipSubmitted, setSkipSubmitted] = useState(false);

  const leastCrowded = useMemo(() => getLeastCrowdedHall(mess.halls), [mess.halls]);

  const myReservations = useMemo(
    () =>
      mess.reservations.filter(
        (r) =>
          r.studentEmail.toLowerCase() === currentUser.email.toLowerCase() ||
          r.studentId === currentUser.id
      ),
    [mess.reservations, currentUser]
  );

  const activePass = useMemo(
    () =>
      myReservations.find(
        (r) => r.status === 'Booked' || r.status === 'Checked In'
      ),
    [myReservations]
  );

  const availableSlots = useMemo(
    () =>
      mess.slots.filter(
        (s) => s.messHallId === selectedHallId && s.mealType === selectedMeal
      ),
    [mess.slots, selectedHallId, selectedMeal]
  );

  const selectedHall = mess.halls.find((h) => h.id === selectedHallId) ?? mess.halls[0];

  const mySkipsForActiveMeal = useMemo(
    () =>
      mess.skipNotices.filter(
        (n) =>
          n.studentEmail.toLowerCase() === currentUser.email.toLowerCase() &&
          n.mealType === selectedMeal
      ),
    [mess.skipNotices, currentUser, selectedMeal]
  );

  const handleSkipSubmit = (e: FormEvent) => {
    e.preventDefault();
    onDeclareSkip({
      mealType: selectedMeal,
      messHallId: selectedHallId,
      reason: skipReason,
    });
    setSkipSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Header + Smart Recommendation */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">
            Mess Crowd & Meal Slot Booking
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Check real-time dining hall occupancy, reserve a 20-minute slot, and avoid peak queue
            waits.
          </p>
        </div>

        {leastCrowded && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <div>
              <p className="font-semibold">
                Fastest Option Right Now: {leastCrowded.name}
              </p>
              <p className="font-mono tabular-nums text-emerald-800 dark:text-emerald-300">
                {getOccupancyPercent(leastCrowded)}% full · ~{getHallAvgWaitMinutes(leastCrowded)}{' '}
                min wait
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedHallId(leastCrowded.id)}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 whitespace-nowrap"
            >
              Select Hall
            </button>
          </div>
        )}
      </div>

      {/* Live Mess Hall Occupancy Comparison Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {mess.halls.map((hall) => (
          <MessOccupancyCard
            key={hall.id}
            hall={hall}
            allHalls={mess.halls}
            selected={hall.id === selectedHallId}
            onSelect={(id) => setSelectedHallId(id)}
          />
        ))}
      </div>

      {/* Main Split: Digital Meal Pass + Slot Reservation Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Active Digital Meal Pass & Skip Meal */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-navy-900 dark:text-sky-400" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Active Digital Meal Pass
                </h2>
              </div>
              {activePass && (
                <span
                  className={`text-xs font-semibold ${getReservationStatusClass(
                    activePass.status
                  )}`}
                >
                  {activePass.status}
                </span>
              )}
            </div>

            {activePass ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <TokenQrMatrix code={activePass.tokenCode} />
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-base font-bold tracking-tight text-navy-950 dark:text-sky-400">
                      {activePass.tokenCode}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {activePass.messHallName}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      {activePass.mealType} · {activePass.windowLabel}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preference: {activePass.dietaryPreference}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  {activePass.status === 'Booked' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onCheckInPass(activePass.tokenCode)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Check In at Turnstile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelPass(activePass.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        <span>Release Slot</span>
                      </button>
                    </>
                  )}
                  {activePass.status === 'Checked In' && (
                    <button
                      type="button"
                      onClick={() => onCompletePass(activePass.id, 5)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Exit Dining Hall & Free Seat</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No active meal pass reserved right now.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select a 20-minute window on the right to reserve your fast-track entry token.
                </p>
              </div>
            )}
          </div>

          {/* Skip Meal / Reduce Food Waste & Crowd */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Opt Out / Skip {selectedMeal}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Let kitchen staff know if you are eating off-campus so portions and slot capacity are
              adjusted accurately.
            </p>

            {mySkipsForActiveMeal.length > 0 || skipSubmitted ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                Skip notice logged for {selectedMeal}. Thank you for reducing mess waste and queue
                load.
              </div>
            ) : (
              <form onSubmit={handleSkipSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Optional reason (e.g. off-campus lab)..."
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Log Skip
                </button>
              </form>
            )}
          </div>

          {/* Today's Menu Snapshot */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-navy-900 dark:text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedMeal} Menu Highlights
              </h3>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {mess.menuHighlights[selectedMeal].map((item) => (
                <li key={item} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0 dark:border-slate-800/70">
                  <span>{item}</span>
                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    Serving
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Staggered 20-Minute Slot Selector + Recent Passes */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Book Staggered 20-Minute Slot · {selectedHall?.name}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Choose a meal service and dining preference, then reserve an open arrival slot.
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                {MEAL_TYPES.map((meal) => (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => {
                      setSelectedMeal(meal);
                      setSkipSubmitted(false);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedMeal === meal
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {meal}
                  </button>
                ))}
              </div>
            </div>

            {/* Hall & Dietary Controls */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Dining Hall
                </label>
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                >
                  {mess.halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({getOccupancyPercent(h)}% full)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Meal Counter Preference
                </label>
                <select
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value as DietaryPreference)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400"
                >
                  {DIETARY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Staggered Slot Cards */}
            {availableSlots.length === 0 ? (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  No staggered slots configured for {selectedMeal} in {selectedHall?.name}.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Switch to North Hall Central Mess or South Hall Dining Commons to reserve a slot.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableSlots.map((slot) => {
                  const pct = Math.round((slot.bookedCount / slot.maxCapacity) * 100);
                  const remaining = Math.max(0, slot.maxCapacity - slot.bookedCount);
                  const isFull = remaining === 0;
                  const isBookedByMe = activePass?.slotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                        isBookedByMe
                          ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-500/70 dark:bg-emerald-950/30'
                          : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                            <CalendarClock className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
                            <span>{slot.windowLabel}</span>
                          </span>
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              pct >= 90
                                ? 'text-red-700 dark:text-red-400'
                                : pct >= 70
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {remaining} left
                          </span>
                        </div>

                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full ${
                              pct >= 90
                                ? 'bg-red-600'
                                : pct >= 70
                                ? 'bg-amber-600'
                                : 'bg-emerald-600 dark:bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                          <span>
                            {slot.bookedCount}/{slot.maxCapacity} booked
                          </span>
                          <span>{slot.checkedInCount} checked in</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isFull || isBookedByMe}
                        onClick={() =>
                          onBookSlot({
                            messHallId: selectedHallId,
                            slotId: slot.id,
                            dietaryPreference: dietary,
                          })
                        }
                        className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                          isBookedByMe
                            ? 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-slate-950'
                            : isFull
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                            : 'bg-navy-900 text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400'
                        }`}
                      >
                        <span>
                          {isBookedByMe
                            ? 'Your Active Slot'
                            : isFull
                            ? 'Slot Full'
                            : 'Reserve Slot'}
                        </span>
                        {!isBookedByMe && !isFull && <ArrowRight className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student Pass History & Crowd Comfort Rating */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1322]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Your Recent Meal Passes
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Rate dining crowd comfort on completed passes to guide slot capacity adjustments.
            </p>

            <div className="mt-3 divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {myReservations.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No meal passes recorded yet.
                </p>
              ) : (
                myReservations.slice(0, 5).map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                          {res.tokenCode}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {res.messHallName}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {res.mealType} {res.windowLabel}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {res.status === 'Completed' && (
                        <div className="flex items-center gap-0.5" aria-label="Rate crowd comfort">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => onRatePass(res.id, star)}
                              className="p-0.5 text-amber-500 hover:scale-110 transition-transform"
                              title={`Rate ${star}/5 crowd comfort`}
                            >
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  (res.crowdRating ?? 0) >= star
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <span
                        className={`text-xs font-semibold ${getReservationStatusClass(
                          res.status
                        )}`}
                      >
                        {res.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
