import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { Complaint, UserAccount } from '../../types/hostelCare';
import { formatDateTime } from '../../utils/complaintHelpers';

interface MessageThreadProps {
  complaint: Complaint;
  currentUser: UserAccount;
  onSendMessage: (content: string) => void;
}

export function MessageThread({
  complaint,
  currentUser,
  onSendMessage,
}: MessageThreadProps) {
  const [draft, setDraft] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSendMessage(draft);
    setDraft('');
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0c1322]">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          Complaint Communication Thread
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Shared updates visible to student, assigned technician, and hostel warden.
        </p>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        {complaint.messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No messages yet. Post a note below to coordinate access times or parts.
          </p>
        ) : (
          complaint.messages.map((m) => {
            const isSelf =
              m.senderRole === currentUser.role && m.senderName === currentUser.name;
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-1 rounded-lg border px-3.5 py-2.5 ${
                  isSelf
                    ? 'ml-6 border-sky-200 bg-sky-50/70 dark:border-sky-800/70 dark:bg-sky-950/40'
                    : 'mr-6 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {m.senderName}{' '}
                    <span className="font-normal capitalize text-slate-500 dark:text-slate-400">
                      · {m.senderRole}
                    </span>
                  </span>
                  <time className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {formatDateTime(m.timestamp)}
                  </time>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{m.content}</p>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message as ${currentUser.name}...`}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md bg-navy-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-sky-500 dark:text-slate-950 dark:font-semibold dark:hover:bg-sky-400"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
