import {
  CounterStatus,
  CrowdLevel,
  MessHall,
  ReservationStatus,
} from '../types/hostelCare';

export function getOccupancyPercent(hall: MessHall): number {
  if (hall.capacity <= 0) return 0;
  return Math.min(100, Math.round((hall.currentOccupancy / hall.capacity) * 100));
}

export function getCrowdLevel(hall: MessHall): CrowdLevel {
  const pct = getOccupancyPercent(hall);
  if (pct >= 88) return 'Overcrowded';
  if (pct >= 70) return 'Busy';
  if (pct >= 45) return 'Moderate';
  return 'Low';
}

export function getHallAvgWaitMinutes(hall: MessHall): number {
  const openCounters = hall.counters.filter((c) => c.status !== 'Paused');
  if (openCounters.length === 0) return 22;
  const totalWait = openCounters.reduce((acc, c) => acc + c.avgWaitMinutes, 0);
  return Math.round(totalWait / openCounters.length);
}

export function getCrowdTextClass(level: CrowdLevel): string {
  switch (level) {
    case 'Low':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'Moderate':
      return 'text-sky-800 dark:text-sky-400';
    case 'Busy':
      return 'text-amber-700 dark:text-amber-400';
    case 'Overcrowded':
      return 'text-red-700 dark:text-red-400';
  }
}

export function getCrowdBarClass(level: CrowdLevel): string {
  switch (level) {
    case 'Low':
      return 'bg-emerald-600 dark:bg-emerald-400';
    case 'Moderate':
      return 'bg-sky-700 dark:bg-sky-400';
    case 'Busy':
      return 'bg-amber-600 dark:bg-amber-400';
    case 'Overcrowded':
      return 'bg-red-600 dark:bg-red-500';
  }
}

export function getCounterStatusTextClass(status: CounterStatus): string {
  switch (status) {
    case 'Open':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'Slowed':
      return 'text-amber-700 dark:text-amber-400';
    case 'Refilling':
      return 'text-sky-800 dark:text-sky-400';
    case 'Paused':
      return 'text-red-700 dark:text-red-400';
  }
}

export function getReservationStatusClass(status: ReservationStatus): string {
  switch (status) {
    case 'Booked':
      return 'text-sky-800 dark:text-sky-400';
    case 'Checked In':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'Completed':
      return 'text-slate-600 dark:text-slate-400';
    case 'Cancelled':
      return 'text-red-700 dark:text-red-400';
  }
}

export function getLeastCrowdedHall(halls: MessHall[]): MessHall | undefined {
  if (halls.length === 0) return undefined;
  return [...halls].sort((a, b) => getOccupancyPercent(a) - getOccupancyPercent(b))[0];
}
