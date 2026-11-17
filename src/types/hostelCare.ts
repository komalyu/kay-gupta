export type UserRole = 'student' | 'mess_staff' | 'technician' | 'warden';

export type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
export type CounterStatus = 'Open' | 'Slowed' | 'Refilling' | 'Paused';
export type CrowdLevel = 'Low' | 'Moderate' | 'Busy' | 'Overcrowded';
export type ReservationStatus = 'Booked' | 'Checked In' | 'Completed' | 'Cancelled';
export type DietaryPreference = 'Regular' | 'High-Protein' | 'Jain / No-Onion' | 'Express Grab';

export interface MessCounter {
  id: string;
  name: string;
  stationType: string;
  status: CounterStatus;
  queueLength: number;
  avgWaitMinutes: number;
  servingRatePerMin: number;
  batchLevelPct: number;
}

export interface MessHall {
  id: string;
  name: string;
  wing: string;
  capacity: number;
  currentOccupancy: number;
  activeMeal: MealType;
  entryRatePerMin: number;
  exitRatePerMin: number;
  overflowRedirectTo?: string;
  counters: MessCounter[];
}

export interface MealSlot {
  id: string;
  messHallId: string;
  mealType: MealType;
  windowLabel: string;
  maxCapacity: number;
  bookedCount: number;
  checkedInCount: number;
}

export interface MealReservation {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  messHallId: string;
  messHallName: string;
  slotId: string;
  mealType: MealType;
  windowLabel: string;
  tokenCode: string;
  dietaryPreference: DietaryPreference;
  status: ReservationStatus;
  createdAt: string;
  checkedInAt?: string;
  completedAt?: string;
  crowdRating?: number;
}

export interface MealSkipNotice {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  mealType: MealType;
  messHallId: string;
  reason: string;
  createdAt: string;
}

export interface CrowdAlertEvent {
  id: string;
  messHallId: string;
  messHallName: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

export interface MessForecastPoint {
  slotLabel: string;
  northOccupancyPct: number;
  southOccupancyPct: number;
  annexOccupancyPct: number;
  predictedWaitMin: number;
}

export interface MessManagementState {
  activeMeal: MealType;
  menuHighlights: Record<MealType, string[]>;
  halls: MessHall[];
  slots: MealSlot[];
  reservations: MealReservation[];
  skipNotices: MealSkipNotice[];
  crowdAlerts: CrowdAlertEvent[];
  forecastCurve: MessForecastPoint[];
  nextReservationSeq: number;
}

export type ComplaintCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Furniture'
  | 'Internet/Wi-Fi'
  | 'Cleaning'
  | 'Water Supply'
  | 'Washroom'
  | 'Other';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintStatus =
  | 'Submitted'
  | 'Assigned'
  | 'Accepted'
  | 'Scheduled'
  | 'On the Way'
  | 'Work in Progress'
  | 'Waiting for Materials'
  | 'Completed'
  | 'Closed'
  | 'Reopened'
  | 'Rejected';

export type TechnicianAvailability = 'Available' | 'On Field' | 'Off Shift';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  hostel?: string;
  block?: string;
  roomNumber?: string;
  phone?: string;
  technicianId?: string;
  messHallId?: string;
}

export interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  categories: ComplaintCategory[];
  availability: TechnicianAvailability;
  maxDailyJobs: number;
  rating: number;
  completedJobsTotal: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  previousStatus: ComplaintStatus | 'None';
  updatedStatus: ComplaintStatus;
  actorName: string;
  actorRole: UserRole | 'system';
  description: string;
}

export interface ComplaintMessage {
  id: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
}

export interface MaterialRequest {
  id: string;
  item: string;
  quantity: string;
  urgency: 'Standard' | 'Urgent';
  requestedBy: string;
  requestedAt: string;
  status: 'Requested' | 'Approved' | 'Delivered';
}

export interface StudentFeedback {
  rating: number;
  comment: string;
  submittedAt: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  hostelName: string;
  block: string;
  roomNumber: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  studentId: string;
  studentName: string;
  studentEmail: string;
  preferredAvailability: string;
  beforePhotos: string[];
  afterPhotos: string[];
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  scheduledVisitStart?: string;
  estimatedCompletionTime?: string;
  expectedResolutionAt: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  internalWorkNotes: string[];
  declineReason?: string;
  reopenCount: number;
  reopenReason?: string;
  escalationLevel: 0 | 1 | 2;
  escalationReason?: string;
  isOverdue: boolean;
  wardenVerified: boolean;
  materialRequests: MaterialRequest[];
  studentFeedback?: StudentFeedback;
  timeline: TimelineEvent[];
  messages: ComplaintMessage[];
  isDemoSample?: boolean;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole | 'all';
  recipientEmail?: string;
  complaintId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'success' | 'critical';
}

export interface MvpValidationEntry {
  id: string;
  evaluatorName: string;
  evaluatorRole: string;
  whatWasEasy: string;
  whatWasConfusing: string;
  statusTrustworthy: 'Yes' | 'Partially' | 'No';
  schedulingPractical: 'Yes' | 'Partially' | 'No';
  completionProofUseful: 'Yes' | 'Partially' | 'No';
  whatToImprove: string;
  submittedAt: string;
}

export interface GuidedDemoProgress {
  trackedComplaintId: string | null;
  step1Reported: boolean;
  step2Assigned: boolean;
  step3Accepted: boolean;
  step4Scheduled: boolean;
  step5StudentViewedSchedule: boolean;
  step6InProgress: boolean;
  step7AfterPhotoUploaded: boolean;
  step8Completed: boolean;
  step9StudentConfirmed: boolean;
  step10WardenVerifiedClosed: boolean;
}

export interface HostelCareState {
  users: UserAccount[];
  technicians: TechnicianProfile[];
  complaints: Complaint[];
  notifications: AppNotification[];
  mvpFeedback: MvpValidationEntry[];
  simulatedHoursOffset: number;
  guidedDemo: GuidedDemoProgress;
  nextComplaintSeq: number;
  mess: MessManagementState;
}
