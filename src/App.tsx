import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Box,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserCircle2,
  Utensils,
  Wrench,
  X,
} from 'lucide-react';
import { LandingPage } from './components/auth/LandingPage';
import { LoginScreen } from './components/auth/LoginScreen';
import { MessStaffScreen } from './components/mess/MessStaffScreen';
import { StudentMessScreen } from './components/mess/StudentMessScreen';
import { WardenMessDashboard } from './components/mess/WardenMessDashboard';
import { CampusTwinScreen } from './components/shared/CampusTwinScreen';
import { CommandPalette } from './components/shared/CommandPalette';
import {
  GuidedDemoPanel,
  PrototypeModeTrigger,
} from './components/shared/GuidedDemoPanel';
import { MvpFeedbackScreen } from './components/shared/MvpFeedbackScreen';
import { useTheme } from './components/shared/ThemeProvider';
import { useToast } from './components/shared/ToastProvider';
import { StudentComplaintDetail } from './components/student/StudentComplaintDetail';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentTimelineScreen } from './components/student/StudentTimelineScreen';
import { SubmitComplaintScreen } from './components/student/SubmitComplaintScreen';
import { TechnicianDashboard } from './components/technician/TechnicianDashboard';
import { TechnicianJobDetail } from './components/technician/TechnicianJobDetail';
import { TechnicianScheduleScreen } from './components/technician/TechnicianScheduleScreen';
import { ComplaintManagementScreen } from './components/warden/ComplaintManagementScreen';
import { ReportsAnalyticsScreen } from './components/warden/ReportsAnalyticsScreen';
import { WardenDashboard } from './components/warden/WardenDashboard';
import {
  addAfterPhotosToComplaint,
  adjustHallOccupancy,
  advanceSimulatedTime,
  assignComplaintToTechnician,
  bookMealSlot,
  broadcastOverflowRedirect,
  cancelMealReservation,
  changeComplaintPriority,
  checkInMealReservation,
  completeMealReservation,
  declareMealSkip,
  hydrateStateFromServer,
  loadState,
  markAllNotificationsRead,
  markGuidedStep5Viewed,
  postComplaintMessage,
  rateMealCrowd,
  registerStudentAccount,
  requestMaterialForJob,
  resetDemoData,
  setActiveMealPeriod,
  studentConfirmOrReopen,
  submitComplaint,
  submitMvpFeedback,
  subscribeState,
  technicianAcceptOrDecline,
  technicianScheduleVisit,
  technicianUpdateStatus,
  updateCounterStatus,
  updateSlotCapacity,
  updateTechnicianAvailability,
  wardenVerifyOrReopen,
} from './store/hostelCareStore';
import { HostelCareState, UserAccount, UserRole } from './types/hostelCare';
import { formatRelativeHours } from './utils/complaintHelpers';

type ScreenId =
  | 'landing'
  | 'login'
  | 'public-mvp-feedback'
  | 'student-mess'
  | 'mess-staff'
  | 'warden-mess'
  | 'student-dashboard'
  | 'student-submit'
  | 'student-detail'
  | 'student-timeline'
  | 'tech-dashboard'
  | 'tech-detail'
  | 'tech-schedule'
  | 'admin-dashboard'
  | 'admin-complaints'
  | 'admin-reports'
  | 'campus-3d'
  | 'workspace-mvp-feedback';

function defaultScreenForRole(role: UserRole): ScreenId {
  if (role === 'student') return 'student-mess';
  if (role === 'mess_staff') return 'mess-staff';
  if (role === 'technician') return 'tech-dashboard';
  return 'warden-mess';
}

export default function App() {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [state, setState] = useState<HostelCareState>(() => loadState());
  const [screen, setScreen] = useState<ScreenId>('landing');
  const [loginRoleHint, setLoginRoleHint] = useState<UserRole | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | undefined>(
    undefined
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeState((next) => {
      setState(next);
    });
    hydrateStateFromServer().then((serverState) => {
      if (serverState) setState(serverState);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const roleNotifications = useMemo(() => {
    if (!currentUser) return [];
    return state.notifications.filter(
      (n) =>
        n.recipientRole === 'all' ||
        (n.recipientRole === currentUser.role &&
          (!n.recipientEmail ||
            n.recipientEmail.toLowerCase() === currentUser.email.toLowerCase()))
    );
  }, [state.notifications, currentUser]);

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const guidedCompletedCount = useMemo(() => {
    const g = state.guidedDemo;
    return [
      g.step1Reported,
      g.step2Assigned,
      g.step3Accepted,
      g.step4Scheduled,
      g.step5StudentViewedSchedule,
      g.step6InProgress,
      g.step7AfterPhotoUploaded,
      g.step8Completed,
      g.step9StudentConfirmed,
      g.step10WardenVerifiedClosed,
    ].filter(Boolean).length;
  }, [state.guidedDemo]);

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setScreen(defaultScreenForRole(user.role));
    setNotifOpen(false);
    setProfileOpen(false);
    showToast(`Signed in as ${user.name} (${user.role})`, 'info');
  };

  const handleSwitchRole = (
    role: UserRole,
    targetScreen?: string,
    complaintId?: string
  ) => {
    const targetEmail =
      role === 'student'
        ? 'student@demo.com'
        : role === 'mess_staff'
        ? 'mess@demo.com'
        : role === 'technician'
        ? 'technician@demo.com'
        : 'warden@demo.com';
    const user =
      state.users.find((u) => u.email.toLowerCase() === targetEmail) ??
      state.users.find((u) => u.role === role) ??
      state.users[0];

    setCurrentUser(user);
    if (complaintId) {
      setSelectedComplaintId(complaintId);
    }
    setScreen((targetScreen as ScreenId) || defaultScreenForRole(role));
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
    showToast(
      `Switched perspective to ${user.name} (${role === 'mess_staff' ? 'Mess Supervisor' : role})`,
      'info'
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen('landing');
    setDemoPanelOpen(false);
    setProfileOpen(false);
  };

  // --- Screen 1: Landing Page ---
  if (screen === 'landing') {
    return (
      <LandingPage
        state={state}
        onGoToLogin={(hint) => {
          setLoginRoleHint(hint);
          setScreen('login');
        }}
        onOpenMvpFeedback={() => setScreen('public-mvp-feedback')}
      />
    );
  }

  // --- Public MVP Validation Feedback View ---
  if (screen === 'public-mvp-feedback') {
    return (
      <div className="futuristic-grid min-h-screen bg-[#f4f6f9] px-4 py-8 text-slate-900 transition-colors dark:bg-[#060b14] dark:text-slate-100 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setScreen('landing')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-sky-400"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to HostelCare Overview</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-navy-900" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Sign In to Demo
              </button>
            </div>
          </div>
          <MvpFeedbackScreen
            entries={state.mvpFeedback}
            onSubmitFeedback={(entry) => {
              setState(submitMvpFeedback(state, entry));
              showToast('Usability observation recorded.', 'success');
            }}
          />
        </div>
      </div>
    );
  }

  // --- Screen 2: Login / Demo Role Selection ---
  if (screen === 'login' || !currentUser) {
    return (
      <LoginScreen
        users={state.users}
        initialRoleHint={loginRoleHint}
        onBackToLanding={() => setScreen('landing')}
        onLoginSuccess={handleLogin}
        onRegisterStudent={(payload) => {
          const res = registerStudentAccount(state, payload);
          setState(res.state);
          if (!res.error) {
            showToast(`Account created for ${res.user.name}.`, 'success');
          }
          return { user: res.user, error: res.error };
        }}
      />
    );
  }

  // --- Authenticated Workspace Navigation Items ---
  const navItems: { id: ScreenId; label: string; icon: typeof LayoutDashboard }[] =
    currentUser.role === 'student'
      ? [
          { id: 'student-mess', label: 'Mess Crowd & Slots', icon: Utensils },
          { id: 'campus-3d', label: '3D Campus & Mess', icon: Box },
          { id: 'student-dashboard', label: 'Hostel Maintenance', icon: LayoutDashboard },
          { id: 'student-submit', label: 'Report Fault', icon: PlusCircle },
          { id: 'student-timeline', label: 'Track Timeline', icon: Clock },
          {
            id: 'workspace-mvp-feedback',
            label: 'MVP Feedback',
            icon: ClipboardCheck,
          },
        ]
      : currentUser.role === 'mess_staff'
      ? [
          { id: 'mess-staff', label: 'Mess Gate & Counters', icon: Utensils },
          { id: 'campus-3d', label: '3D Campus & Mess', icon: Box },
          {
            id: 'workspace-mvp-feedback',
            label: 'MVP Feedback',
            icon: ClipboardCheck,
          },
        ]
      : currentUser.role === 'technician'
      ? [
          { id: 'tech-dashboard', label: 'Assigned Jobs', icon: Wrench },
          { id: 'tech-schedule', label: 'Daily Schedule', icon: CalendarClock },
          { id: 'campus-3d', label: '3D Campus Twin', icon: Box },
          {
            id: 'workspace-mvp-feedback',
            label: 'MVP Feedback',
            icon: ClipboardCheck,
          },
        ]
      : [
          { id: 'warden-mess', label: 'Mess Crowd Oversight', icon: Utensils },
          { id: 'campus-3d', label: '3D Campus & Mess', icon: Box },
          { id: 'admin-dashboard', label: 'Maintenance Overview', icon: ShieldCheck },
          {
            id: 'admin-complaints',
            label: 'Manage Complaints',
            icon: ClipboardList,
          },
          { id: 'admin-reports', label: 'Reports & Analytics', icon: FileBarChart },
          {
            id: 'workspace-mvp-feedback',
            label: 'MVP Feedback',
            icon: ClipboardCheck,
          },
        ];

  const screenBreadcrumbLabel: Record<ScreenId, string> = {
    landing: 'Landing',
    login: 'Login',
    'public-mvp-feedback': 'MVP Feedback',
    'student-mess': 'Live Mess Crowd & Slot Pass',
    'mess-staff': 'Mess Turnstile & Counter Operations',
    'warden-mess': 'Campus Mess Crowd & Capacity Control',
    'student-dashboard': 'Hostel Maintenance Dashboard',
    'student-submit': 'Submit New Complaint',
    'student-detail': `Complaint ${selectedComplaintId ?? ''}`,
    'student-timeline': 'Complaint Tracking Timeline',
    'tech-dashboard': 'Technician Jobs',
    'tech-detail': `Job ${selectedComplaintId ?? ''}`,
    'tech-schedule': 'Daily Schedule',
    'admin-dashboard': 'Maintenance Overview',
    'admin-complaints': 'Complaint Management',
    'admin-reports': 'Reports & Analytics',
    'campus-3d': '3D Campus & Mess Twin',
    'workspace-mvp-feedback': 'MVP Usability Feedback',
  };

  const activeComplaint =
    state.complaints.find((c) => c.id === selectedComplaintId) ?? state.complaints[0];

  const roleSwitchChoices: { id: UserRole; label: string }[] = [
    { id: 'student', label: 'Student' },
    { id: 'mess_staff', label: 'Mess' },
    { id: 'warden', label: 'Warden' },
    { id: 'technician', label: 'Tech' },
  ];

  return (
    <div className="futuristic-grid flex min-h-screen bg-[#f4f6f9] text-slate-900 transition-colors dark:bg-[#060b14] dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white dark:border-slate-800/90 dark:bg-[#0a101d] lg:flex">
        <div>
          <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800/90">
            <button
              type="button"
              onClick={() => setScreen(defaultScreenForRole(currentUser.role))}
              className="font-display text-lg font-bold tracking-tight text-navy-900 dark:text-sky-400"
            >
              HostelCare
            </button>
          </div>

          <div className="p-4">
            <p className="mb-2 px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {currentUser.role === 'student'
                ? 'Student Dining & Hostel'
                : currentUser.role === 'mess_staff'
                ? 'Mess Supervisor Console'
                : currentUser.role === 'technician'
                ? 'Technician Portal'
                : 'Warden Command Portal'}
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  screen === item.id ||
                  (item.id === 'student-dashboard' && screen === 'student-detail') ||
                  (item.id === 'tech-dashboard' && screen === 'tech-detail');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScreen(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Prototype Role Quick-Switcher in Sidebar Footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800/90">
          <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Role Switcher
          </p>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            {roleSwitchChoices.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSwitchRole(r.id)}
                className={`rounded-md py-1 text-[11px] font-medium transition-colors ${
                  currentUser.role === r.id
                    ? 'bg-white text-navy-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-64 flex-col justify-between bg-white p-4 shadow-xl dark:border-r dark:border-slate-800 dark:bg-[#0a101d]">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <span className="font-display text-lg font-bold text-navy-900 dark:text-sky-400">
                  HostelCare
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setScreen(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        screen === item.id
                          ? 'bg-navy-900 text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Switch Role
              </p>
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                {roleSwitchChoices.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSwitchRole(r.id)}
                    className={`rounded-md py-1 text-[11px] font-medium ${
                      currentUser.role === r.id
                        ? 'bg-white text-navy-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Workspace Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs dark:border-slate-800/90 dark:bg-[#060b14]/90 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden capitalize text-slate-400 dark:text-slate-500 sm:inline">
                {currentUser.role === 'mess_staff' ? 'Mess Supervisor' : currentUser.role}
              </span>
              <span
                className="hidden text-slate-300 dark:text-slate-700 sm:inline"
                aria-hidden="true"
              >
                /
              </span>
              <span className="truncate font-semibold text-slate-900 dark:text-white">
                {screenBreadcrumbLabel[screen]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-500 hover:text-slate-900 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-300 dark:hover:border-sky-400 dark:hover:text-white whitespace-nowrap"
              title="Open Quick Search (Ctrl/Cmd + K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-400 dark:text-sky-400" />
              <span className="hidden md:inline">Quick Jump</span>
              <span className="hidden rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:inline">
                ⌘K
              </span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Futuristic Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-navy-900" />
              )}
            </button>

            <PrototypeModeTrigger
              onClick={() => setDemoPanelOpen((v) => !v)}
              completedSteps={guidedCompletedCount}
            />

            {/* Notifications Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Toggle notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#0c1322]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Notifications ({unreadCount} unread)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setState(markAllNotificationsRead(state, currentUser.role))
                      }
                      className="text-[11px] font-medium text-navy-900 hover:underline dark:text-sky-400"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
                    {roleNotifications.length === 0 ? (
                      <p className="p-5 text-center text-xs text-slate-500 dark:text-slate-400">
                        No notifications for this role yet.
                      </p>
                    ) : (
                      roleNotifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            if (n.complaintId === 'MESS') {
                              if (currentUser.role === 'student') setScreen('student-mess');
                              else if (currentUser.role === 'mess_staff') setScreen('mess-staff');
                              else setScreen('warden-mess');
                              return;
                            }
                            setSelectedComplaintId(n.complaintId);
                            if (currentUser.role === 'student') setScreen('student-detail');
                            else if (currentUser.role === 'technician') setScreen('tech-detail');
                            else setScreen('admin-complaints');
                          }}
                          className={`block w-full px-4 py-3 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/70 ${
                            n.read
                              ? 'bg-white dark:bg-[#0c1322]'
                              : 'bg-sky-50/50 dark:bg-sky-950/35'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                              {formatRelativeHours(n.timestamp, state.simulatedHoursOffset)}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600 dark:text-slate-300">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0c1322] dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <UserCircle2 className="h-4 w-4 text-navy-900 dark:text-sky-400" />
                <span className="hidden sm:inline">{currentUser.name}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-[#0c1322]">
                  <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {currentUser.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDemoPanelOpen(true);
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Open Demo Walkthrough</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out to Landing</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Active Screen Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {screen === 'student-mess' && (
            <StudentMessScreen
              currentUser={currentUser}
              mess={state.mess}
              onBookSlot={(payload) => {
                const res = bookMealSlot(state, currentUser, payload);
                if (res.error) {
                  showToast(res.error, 'error');
                  return;
                }
                setState(res.state);
                showToast(
                  `Meal pass ${res.reservation?.tokenCode} booked for ${res.reservation?.windowLabel}.`,
                  'success'
                );
              }}
              onCheckInPass={(idOrToken) => {
                const res = checkInMealReservation(state, currentUser.name, idOrToken);
                if (res.error) {
                  showToast(res.error, 'error');
                  return;
                }
                setState(res.state);
                showToast(`Checked in pass ${res.reservation?.tokenCode}.`, 'success');
              }}
              onCompletePass={(reservationId, rating) => {
                setState(completeMealReservation(state, reservationId, rating));
                showToast('Hall exit logged. Occupancy updated.', 'info');
              }}
              onCancelPass={(reservationId) => {
                setState(cancelMealReservation(state, reservationId));
                showToast('Meal slot pass cancelled and released.', 'info');
              }}
              onRatePass={(reservationId, rating) => {
                setState(rateMealCrowd(state, reservationId, rating));
                showToast(`Crowd comfort rated ${rating}/5.`, 'success');
              }}
              onDeclareSkip={(payload) => {
                setState(declareMealSkip(state, currentUser, payload));
                showToast(`Skip notice logged for ${payload.mealType}.`, 'success');
              }}
            />
          )}

          {screen === 'mess-staff' && (
            <MessStaffScreen
              staffName={currentUser.name}
              mess={state.mess}
              onCheckInToken={(tokenOrId) => {
                const res = checkInMealReservation(state, currentUser.name, tokenOrId);
                if (res.error) {
                  showToast(res.error, 'error');
                  return;
                }
                setState(res.state);
                showToast(
                  `Checked in ${res.reservation?.studentName} (${res.reservation?.tokenCode}).`,
                  'success'
                );
              }}
              onCompletePass={(reservationId) => {
                setState(completeMealReservation(state, reservationId));
                showToast('Student exit recorded. Counter capacity freed.', 'info');
              }}
              onAdjustOccupancy={(hallId, delta) => {
                setState(adjustHallOccupancy(state, currentUser.name, hallId, delta));
                showToast(
                  `Turnstile count adjusted (${delta > 0 ? `+${delta}` : delta}).`,
                  'info'
                );
              }}
              onUpdateCounter={(hallId, counterId, status, replenishBatch) => {
                setState(
                  updateCounterStatus(
                    state,
                    currentUser.name,
                    hallId,
                    counterId,
                    status,
                    replenishBatch
                  )
                );
                showToast(
                  replenishBatch
                    ? 'Counter batch replenished to 100%.'
                    : `Counter status updated to ${status}.`,
                  'success'
                );
              }}
              onBroadcastRedirect={(fromHallId, toHallId) => {
                setState(
                  broadcastOverflowRedirect(state, currentUser.name, fromHallId, toHallId)
                );
                showToast(
                  toHallId
                    ? 'Overflow redirect broadcast sent to student feeds.'
                    : 'Overflow redirect advisory cleared.',
                  toHallId ? 'success' : 'info'
                );
              }}
              onChangeActiveMeal={(mealType) => {
                setState(setActiveMealPeriod(state, currentUser.name, mealType));
                showToast(`Active campus meal service switched to ${mealType}.`, 'info');
              }}
            />
          )}

          {screen === 'warden-mess' && (
            <WardenMessDashboard
              mess={state.mess}
              onUpdateSlotCap={(slotId, maxCapacity) => {
                setState(updateSlotCapacity(state, currentUser.name, slotId, maxCapacity));
                showToast(`Slot cap updated to ${maxCapacity} diners.`, 'info');
              }}
              onBroadcastRedirect={(fromHallId, toHallId) => {
                setState(
                  broadcastOverflowRedirect(state, currentUser.name, fromHallId, toHallId)
                );
                showToast(
                  toHallId
                    ? 'Warden overflow redirect pushed to dining halls.'
                    : 'Overflow redirect cleared.',
                  toHallId ? 'success' : 'info'
                );
              }}
              onChangeActiveMeal={(mealType) => {
                setState(setActiveMealPeriod(state, currentUser.name, mealType));
                showToast(`Active campus meal service switched to ${mealType}.`, 'info');
              }}
              onOpenCampus3D={() => setScreen('campus-3d')}
              onOpenMaintenance={() => setScreen('admin-dashboard')}
            />
          )}

          {screen === 'campus-3d' && (
            <CampusTwinScreen
              complaints={state.complaints}
              messHalls={state.mess.halls}
              currentRole={currentUser.role}
              onOpenComplaint={(id) => {
                setSelectedComplaintId(id);
                if (currentUser.role === 'student') setScreen('student-detail');
                else if (currentUser.role === 'technician') setScreen('tech-detail');
                else setScreen('admin-complaints');
              }}
              onOpenMessScreen={() => {
                if (currentUser.role === 'student') setScreen('student-mess');
                else if (currentUser.role === 'mess_staff') setScreen('mess-staff');
                else setScreen('warden-mess');
              }}
            />
          )}

          {screen === 'student-dashboard' && (
            <StudentDashboard
              currentUser={currentUser}
              complaints={state.complaints}
              simulatedOffsetHours={state.simulatedHoursOffset}
              onNewComplaint={() => setScreen('student-submit')}
              onOpenComplaint={(id) => {
                setSelectedComplaintId(id);
                setScreen('student-detail');
              }}
              onOpenTimelines={(id) => {
                if (id) setSelectedComplaintId(id);
                setScreen('student-timeline');
              }}
            />
          )}

          {screen === 'student-submit' && (
            <SubmitComplaintScreen
              currentUser={currentUser}
              onCancel={() => setScreen('student-dashboard')}
              onSubmit={(input) => {
                const res = submitComplaint(state, currentUser, input);
                setState(res.state);
                showToast(`Complaint ${res.complaint.id} submitted to Warden.`, 'success');
                return res.complaint;
              }}
              onOpenComplaint={(id) => {
                setSelectedComplaintId(id);
                setScreen('student-detail');
              }}
            />
          )}

          {screen === 'student-detail' && activeComplaint && (
            <StudentComplaintDetail
              complaint={activeComplaint}
              technician={state.technicians.find(
                (t) => t.id === activeComplaint.assignedTechnicianId
              )}
              currentUser={currentUser}
              onBack={() => setScreen('student-dashboard')}
              onConfirmResolution={(id, resolved, options) => {
                setState(
                  studentConfirmOrReopen(
                    state,
                    currentUser.name,
                    id,
                    resolved,
                    options
                  )
                );
                showToast(
                  resolved
                    ? `${id} confirmed resolved and closed.`
                    : `${id} reopened and escalated to Warden.`,
                  resolved ? 'success' : 'info'
                );
              }}
              onSendMessage={(id, content) => {
                setState(
                  postComplaintMessage(
                    state,
                    id,
                    currentUser.name,
                    currentUser.role,
                    content
                  )
                );
                showToast('Message posted to complaint thread.', 'info');
              }}
              onViewedScheduled={(id) => {
                const next = markGuidedStep5Viewed(state, id);
                if (next !== state) setState(next);
              }}
            />
          )}

          {screen === 'student-timeline' && (
            <StudentTimelineScreen
              currentUser={currentUser}
              complaints={state.complaints}
              initialComplaintId={selectedComplaintId}
              onOpenComplaintDetail={(id) => {
                setSelectedComplaintId(id);
                setScreen('student-detail');
              }}
              onViewedScheduled={(id) => {
                const next = markGuidedStep5Viewed(state, id);
                if (next !== state) setState(next);
              }}
            />
          )}

          {screen === 'tech-dashboard' && (
            <TechnicianDashboard
              currentUser={currentUser}
              technicians={state.technicians}
              complaints={state.complaints}
              onOpenJob={(id) => {
                setSelectedComplaintId(id);
                setScreen('tech-detail');
              }}
              onOpenSchedule={() => setScreen('tech-schedule')}
              onUpdateAvailability={(techId, avail) => {
                setState(updateTechnicianAvailability(state, techId, avail));
                showToast(`Availability set to ${avail}.`, 'info');
              }}
              onAcceptJob={(id) => {
                setState(
                  technicianAcceptOrDecline(state, currentUser.name, id, 'accept')
                );
                showToast(`Accepted job ${id}.`, 'success');
              }}
            />
          )}

          {screen === 'tech-detail' && activeComplaint && (
            <TechnicianJobDetail
              job={activeComplaint}
              currentUser={currentUser}
              technicians={state.technicians}
              allComplaints={state.complaints}
              onBack={() => setScreen('tech-dashboard')}
              onAcceptOrDecline={(id, decision, reason) => {
                setState(
                  technicianAcceptOrDecline(
                    state,
                    currentUser.name,
                    id,
                    decision,
                    reason
                  )
                );
                showToast(
                  decision === 'accept'
                    ? `Accepted ${id}. Set a realistic visit schedule.`
                    : `Declined ${id}. Returned to Warden.`,
                  decision === 'accept' ? 'success' : 'info'
                );
              }}
              onScheduleVisit={(id, startIso, endIso, note) => {
                setState(
                  technicianScheduleVisit(
                    state,
                    currentUser.name,
                    id,
                    startIso,
                    endIso,
                    note
                  )
                );
                showToast(`Visit scheduled for ${id}. Student notified.`, 'success');
              }}
              onUpdateStatus={(id, status, note, photos) => {
                const res = technicianUpdateStatus(
                  state,
                  currentUser.name,
                  id,
                  status,
                  note,
                  photos
                );
                if (res.error) {
                  showToast(res.error, 'error');
                  return res.error;
                }
                setState(res.state);
                showToast(`${id} updated to ${status}.`, 'success');
                return undefined;
              }}
              onUploadAfterPhotos={(id, photos) => {
                setState(
                  addAfterPhotosToComplaint(state, currentUser.name, id, photos)
                );
                showToast('After-repair completion photo uploaded.', 'success');
              }}
              onRequestMaterial={(id, item, qty, urgency) => {
                setState(
                  requestMaterialForJob(
                    state,
                    currentUser.name,
                    id,
                    item,
                    qty,
                    urgency
                  )
                );
                showToast(`Material request submitted for ${id}.`, 'info');
              }}
              onSendMessage={(id, content) => {
                setState(
                  postComplaintMessage(
                    state,
                    id,
                    currentUser.name,
                    currentUser.role,
                    content
                  )
                );
                showToast('Message posted to complaint thread.', 'info');
              }}
            />
          )}

          {screen === 'tech-schedule' && (
            <TechnicianScheduleScreen
              currentUser={currentUser}
              technicians={state.technicians}
              complaints={state.complaints}
              onScheduleVisit={(id, startIso, endIso, note) => {
                setState(
                  technicianScheduleVisit(
                    state,
                    currentUser.name,
                    id,
                    startIso,
                    endIso,
                    note
                  )
                );
                showToast(`Updated visit schedule for ${id}.`, 'success');
              }}
              onOpenJob={(id) => {
                setSelectedComplaintId(id);
                setScreen('tech-detail');
              }}
            />
          )}

          {screen === 'admin-dashboard' && (
            <WardenDashboard
              complaints={state.complaints}
              technicians={state.technicians}
              simulatedOffsetHours={state.simulatedHoursOffset}
              onOpenComplaintManagement={(id) => {
                if (id) setSelectedComplaintId(id);
                setScreen('admin-complaints');
              }}
              onOpenReports={() => setScreen('admin-reports')}
              onAdvanceTime={(h) => {
                setState(advanceSimulatedTime(state, h));
                showToast(`Simulated clock advanced +${h}h; escalations evaluated.`, 'info');
              }}
            />
          )}

          {screen === 'admin-complaints' && (
            <ComplaintManagementScreen
              currentUser={currentUser}
              complaints={state.complaints}
              technicians={state.technicians}
              initialSelectedId={selectedComplaintId}
              onAssignTechnician={(id, techId, prio) => {
                setState(
                  assignComplaintToTechnician(
                    state,
                    currentUser.name,
                    id,
                    techId,
                    prio
                  )
                );
                showToast(`Technician assigned to ${id}.`, 'success');
              }}
              onChangePriority={(id, prio) => {
                setState(
                  changeComplaintPriority(state, currentUser.name, id, prio)
                );
                showToast(`Priority for ${id} set to ${prio}.`, 'info');
              }}
              onVerifyOrReopen={(id, action, note) => {
                setState(
                  wardenVerifyOrReopen(state, currentUser.name, id, action, note)
                );
                showToast(
                  action === 'verify'
                    ? `${id} verified and closed.`
                    : action === 'escalate'
                    ? `${id} escalated to Critical.`
                    : `${id} reopened for follow-up.`,
                  action === 'verify' ? 'success' : 'info'
                );
              }}
              onSendMessage={(id, content) => {
                setState(
                  postComplaintMessage(
                    state,
                    id,
                    currentUser.name,
                    currentUser.role,
                    content
                  )
                );
                showToast('Message posted to complaint thread.', 'info');
              }}
            />
          )}

          {screen === 'admin-reports' && (
            <ReportsAnalyticsScreen
              complaints={state.complaints}
              technicians={state.technicians}
            />
          )}

          {screen === 'workspace-mvp-feedback' && (
            <MvpFeedbackScreen
              entries={state.mvpFeedback}
              onSubmitFeedback={(entry) => {
                setState(submitMvpFeedback(state, entry));
                showToast('Usability observation saved.', 'success');
              }}
            />
          )}
        </main>
      </div>

      {/* Quick Command Search Palette (Cmd/Ctrl + K) */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        complaints={state.complaints}
        currentRole={currentUser.role}
        onOpenComplaint={(id) => {
          setSelectedComplaintId(id);
          if (currentUser.role === 'student') setScreen('student-detail');
          else if (currentUser.role === 'technician') setScreen('tech-detail');
          else setScreen('admin-complaints');
        }}
        onSwitchRole={(role) => handleSwitchRole(role)}
        onOpen3DCampus={() => setScreen('campus-3d')}
        onOpenMessCrowd={() => {
          if (currentUser.role === 'student') setScreen('student-mess');
          else if (currentUser.role === 'mess_staff') setScreen('mess-staff');
          else setScreen('warden-mess');
        }}
      />

      {/* Floating Guided Demo & Prototype Testing Mode Panel */}
      <GuidedDemoPanel
        isOpen={demoPanelOpen}
        onClose={() => setDemoPanelOpen(false)}
        state={state}
        currentRole={currentUser.role}
        onSwitchRole={handleSwitchRole}
        onAdvanceTime={(h) => {
          setState(advanceSimulatedTime(state, h));
          showToast(`Simulated clock advanced +${h}h.`, 'info');
        }}
        onResetDemo={() => {
          setState(resetDemoData());
          showToast('Demonstration dataset reset to initial seed state.', 'info');
        }}
      />
    </div>
  );
}
