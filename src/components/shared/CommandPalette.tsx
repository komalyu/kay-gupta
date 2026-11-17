import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Box,
  Search,
  ShieldCheck,
  UserCheck,
  Utensils,
  X,
} from 'lucide-react';
import { Complaint, UserRole } from '../../types/hostelCare';
import { StatusReadout } from './StatusReadout';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  complaints: Complaint[];
  currentRole: UserRole;
  onOpenComplaint: (complaintId: string) => void;
  onSwitchRole: (role: UserRole) => void;
  onOpen3DCampus: () => void;
  onOpenMessCrowd: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  complaints,
  currentRole,
  onOpenComplaint,
  onSwitchRole,
  onOpen3DCampus,
  onOpenMessCrowd,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const matchingComplaints = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? complaints.filter(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.roomNumber.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.hostelName.toLowerCase().includes(q)
        )
      : complaints;
    return list.slice(0, 6);
  }, [complaints, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 px-4 pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Command Search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-[#0c1322]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-sky-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to complaint ID, room, category, or role..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close command search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">
          {/* Quick Actions */}
          <div>
            <p className="mb-2 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Quick Workspace Actions
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => {
                  onOpenMessCrowd();
                  onClose();
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:border-sky-500 hover:bg-sky-50/50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-sky-500/60 dark:hover:bg-slate-800"
              >
                <Utensils className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>Mess Crowd</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpen3DCampus();
                  onClose();
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:border-sky-500 hover:bg-sky-50/50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-sky-500/60 dark:hover:bg-slate-800"
              >
                <Box className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>3D Twin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchRole('student');
                  onClose();
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                  currentRole === 'student'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500/60 dark:bg-sky-950/60 dark:text-sky-200'
                    : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchRole('mess_staff');
                  onClose();
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                  currentRole === 'mess_staff'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500/60 dark:bg-sky-950/60 dark:text-sky-200'
                    : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'
                }`}
              >
                <Utensils className="h-3.5 w-3.5" />
                <span>Mess Staff</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchRole('warden');
                  onClose();
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                  currentRole === 'warden'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500/60 dark:bg-sky-950/60 dark:text-sky-200'
                    : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Warden</span>
              </button>
            </div>
          </div>

          {/* Matching Complaints */}
          <div>
            <p className="mb-2 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Complaints ({matchingComplaints.length})
            </p>
            {matchingComplaints.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No complaints match "{query}".
              </p>
            ) : (
              <div className="space-y-1.5">
                {matchingComplaints.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onOpenComplaint(c.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-sky-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-sky-500/60 dark:hover:bg-slate-800/80"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-navy-900 dark:text-sky-400">
                          {c.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {c.hostelName} {c.block} Rm {c.roomNumber}
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {c.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusReadout status={c.status} compact />
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
