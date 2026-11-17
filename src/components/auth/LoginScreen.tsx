import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  KeyRound,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  Utensils,
  Wrench,
} from 'lucide-react';
import { HOSTEL_BLOCKS, HOSTEL_NAMES } from '../../data/seedData';
import { UserAccount, UserRole } from '../../types/hostelCare';
import { useTheme } from '../shared/ThemeProvider';

interface LoginScreenProps {
  users: UserAccount[];
  initialRoleHint?: UserRole;
  onBackToLanding: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterStudent: (payload: {
    name: string;
    email: string;
    password: string;
    hostel: string;
    block: string;
    roomNumber: string;
  }) => { user: UserAccount; error?: string };
}

export function LoginScreen({
  users,
  initialRoleHint,
  onBackToLanding,
  onLoginSuccess,
  onRegisterStudent,
}: LoginScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const defaultEmail =
    initialRoleHint === 'mess_staff'
      ? 'mess@demo.com'
      : initialRoleHint === 'technician'
      ? 'technician@demo.com'
      : initialRoleHint === 'warden'
      ? 'warden@demo.com'
      : 'student@demo.com';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('demo123');
  const [regHostel, setRegHostel] = useState<string>(HOSTEL_NAMES[0]);
  const [regBlock, setRegBlock] = useState<string>(HOSTEL_BLOCKS[0]);
  const [regRoom, setRegRoom] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const matched = users.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password
    );
    if (!matched) {
      setError('Invalid email or password. Use demo123 with any listed demo account.');
      return;
    }
    onLoginSuccess(matched);
  };

  const handleQuickDemo = (demoEmail: string) => {
    setError(null);
    const matched = users.find((u) => u.email.toLowerCase() === demoEmail);
    if (matched) {
      onLoginSuccess(matched);
    }
  };

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regName.trim() || !regEmail.trim() || !regRoom.trim()) {
      setError('Please complete all required student profile fields.');
      return;
    }
    const result = onRegisterStudent({
      name: regName,
      email: regEmail,
      password: regPassword,
      hostel: regHostel,
      block: regBlock,
      roomNumber: regRoom,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onLoginSuccess(result.user);
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="futuristic-grid min-h-screen bg-[#f4f6f9] px-4 py-8 text-slate-900 transition-colors dark:bg-[#060b14] dark:text-slate-100 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-sky-400"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Overview</span>
          </button>

          <div className="flex items-center gap-3">
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
            <span className="font-display text-lg font-bold tracking-tight text-navy-900 dark:text-sky-400">
              HostelCare
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Auth Form */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] sm:p-8 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-bold text-navy-950 dark:text-white">
                  {mode === 'login' ? 'Sign In to HostelCare' : 'Register Student Account'}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'login'
                    ? 'Sign in with demo credentials or select a role card on the right.'
                    : 'Create a hosteller demo account persisted via Express & LocalStorage.'}
                </p>
              </div>
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-sky-500 dark:text-slate-950 dark:font-semibold'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Riya Verma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      University Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="riya@campus.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Hostel
                    </label>
                    <select
                      value={regHostel}
                      onChange={(e) => setRegHostel(e.target.value)}
                      className={inputCls}
                    >
                      {HOSTEL_NAMES.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Block
                    </label>
                    <select
                      value={regBlock}
                      onChange={(e) => setRegBlock(e.target.value)}
                      className={inputCls}
                    >
                      {HOSTEL_BLOCKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Room Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 214"
                      value={regRoom}
                      onChange={(e) => setRegRoom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create Student Account & Enter</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: 1-Click Demo Role Selection */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                One-Click Demo Role Access
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Password for all demo accounts is{' '}
                <span className="font-mono text-slate-700 dark:text-sky-300">demo123</span>.
                Shared data persists when switching roles.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickDemo('student@demo.com')}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:border-navy-900 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-400 dark:hover:bg-slate-900"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Student / Hosteller
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Aarav Sharma · North Hall Block A · Room 204
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-sky-400">
                    student@demo.com
                  </p>
                </div>
                <span className="rounded-md bg-navy-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold whitespace-nowrap">
                  Launch
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('mess@demo.com')}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:border-navy-900 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-400 dark:hover:bg-slate-900"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <Utensils className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
                    <span>Mess Supervisor</span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Kavita Rao · Gate Check-In & Counter Flow
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-sky-400">
                    mess@demo.com
                  </p>
                </div>
                <span className="rounded-md bg-navy-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold whitespace-nowrap">
                  Launch
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('technician@demo.com')}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:border-navy-900 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-400 dark:hover:bg-slate-900"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <Wrench className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
                    <span>Maintenance Technician</span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Rajesh Kumar · Plumbing & Water Supply
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-sky-400">
                    technician@demo.com
                  </p>
                </div>
                <span className="rounded-md bg-navy-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold whitespace-nowrap">
                  Launch
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('warden@demo.com')}
                className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:border-navy-900 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-400 dark:hover:bg-slate-900"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <ShieldCheck className="h-3.5 w-3.5 text-navy-900 dark:text-sky-400" />
                    <span>Warden / Admin</span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Dr. Meera Deshmukh · Chief Hostel Warden
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-sky-400">
                    warden@demo.com
                  </p>
                </div>
                <span className="rounded-md bg-navy-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-sky-500 dark:text-slate-950 dark:font-semibold whitespace-nowrap">
                  Launch
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
