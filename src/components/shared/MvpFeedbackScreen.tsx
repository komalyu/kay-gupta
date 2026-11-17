import { FormEvent, useState } from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { MvpValidationEntry } from '../../types/hostelCare';
import { formatDateTime } from '../../utils/complaintHelpers';

interface MvpFeedbackScreenProps {
  entries: MvpValidationEntry[];
  onSubmitFeedback: (entry: Omit<MvpValidationEntry, 'id' | 'submittedAt'>) => void;
}

export function MvpFeedbackScreen({
  entries,
  onSubmitFeedback,
}: MvpFeedbackScreenProps) {
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluatorRole, setEvaluatorRole] = useState('Hostel Student');
  const [whatWasEasy, setWhatWasEasy] = useState('');
  const [whatWasConfusing, setWhatWasConfusing] = useState('');
  const [statusTrustworthy, setStatusTrustworthy] = useState<'Yes' | 'Partially' | 'No'>('Yes');
  const [schedulingPractical, setSchedulingPractical] = useState<'Yes' | 'Partially' | 'No'>('Yes');
  const [completionProofUseful, setCompletionProofUseful] = useState<'Yes' | 'Partially' | 'No'>('Yes');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!evaluatorName.trim() || !whatWasEasy.trim()) return;
    onSubmitFeedback({
      evaluatorName: evaluatorName.trim(),
      evaluatorRole,
      whatWasEasy: whatWasEasy.trim(),
      whatWasConfusing: whatWasConfusing.trim() || 'None reported',
      statusTrustworthy,
      schedulingPractical,
      completionProofUseful,
      whatToImprove: whatToImprove.trim() || 'No additional notes',
    });
    setEvaluatorName('');
    setWhatWasEasy('');
    setWhatWasConfusing('');
    setWhatToImprove('');
    setSubmittedNotice(true);
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="mt-0.5 h-6 w-6 shrink-0 text-navy-900 dark:text-sky-400" />
          <div>
            <h1 className="text-xl font-bold text-navy-950 dark:text-white">
              MVP Validation & Usability Feedback Capture
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Core assumption under test: "Can students trust and understand the progress of
              their maintenance complaints while technicians retain flexibility to schedule and
              complete their work?" Record real evaluator observations below.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-7"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Record Test Session Observation
          </h2>

          {submittedNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <span>Usability observation saved to database & LocalStorage.</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Tester / Evaluator Name
              </label>
              <input
                type="text"
                required
                value={evaluatorName}
                onChange={(e) => setEvaluatorName(e.target.value)}
                placeholder="e.g. Ananya (Hosteller)"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Tested Perspective
              </label>
              <select
                value={evaluatorRole}
                onChange={(e) => setEvaluatorRole(e.target.value)}
                className={inputCls}
              >
                <option value="Hostel Student">Hostel Student</option>
                <option value="Maintenance Technician">Maintenance Technician</option>
                <option value="Hostel Warden / Admin">Hostel Warden / Admin</option>
                <option value="Project Reviewer">Project Reviewer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              1. What was easy?
            </label>
            <textarea
              rows={2}
              required
              value={whatWasEasy}
              onChange={(e) => setWhatWasEasy(e.target.value)}
              placeholder="Which steps felt clear and intuitive?"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              2. What was confusing?
            </label>
            <textarea
              rows={2}
              value={whatWasConfusing}
              onChange={(e) => setWhatWasConfusing(e.target.value)}
              placeholder="Any unclear labels, workflows, or status names?"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                3. Did status feel trustworthy?
              </label>
              <select
                value={statusTrustworthy}
                onChange={(e) =>
                  setStatusTrustworthy(e.target.value as 'Yes' | 'Partially' | 'No')
                }
                className={`${inputCls} text-xs`}
              >
                <option value="Yes">Yes</option>
                <option value="Partially">Partially</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                4. Technician scheduling practical?
              </label>
              <select
                value={schedulingPractical}
                onChange={(e) =>
                  setSchedulingPractical(e.target.value as 'Yes' | 'Partially' | 'No')
                }
                className={`${inputCls} text-xs`}
              >
                <option value="Yes">Yes</option>
                <option value="Partially">Partially</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                5. Completion proof useful?
              </label>
              <select
                value={completionProofUseful}
                onChange={(e) =>
                  setCompletionProofUseful(e.target.value as 'Yes' | 'Partially' | 'No')
                }
                className={`${inputCls} text-xs`}
              >
                <option value="Yes">Yes</option>
                <option value="Partially">Partially</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              6. What should be improved?
            </label>
            <textarea
              rows={2}
              value={whatToImprove}
              onChange={(e) => setWhatToImprove(e.target.value)}
              placeholder="Suggested refinements before campus pilot..."
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            Save Usability Observation
          </button>
        </form>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] lg:col-span-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Captured Observations ({entries.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Only real session responses recorded through this form appear here.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                No usability observations recorded yet.
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Run the 10-step walkthrough with a student or technician tester and submit their
                feedback on the left.
              </p>
            </div>
          ) : (
            <div className="max-h-[540px] space-y-3 overflow-y-auto">
              {entries.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.evaluatorName} · {item.evaluatorRole}
                    </span>
                    <time className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.submittedAt)}
                    </time>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>Easy:</strong> {item.whatWasEasy}
                  </p>
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>Confusing:</strong> {item.whatWasConfusing}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Trustworthy: <strong>{item.statusTrustworthy}</strong> · Scheduling:{' '}
                    <strong>{item.schedulingPractical}</strong> · Proof:{' '}
                    <strong>{item.completionProofUseful}</strong>
                  </p>
                  <p className="text-slate-700 dark:text-slate-200">
                    <strong>Improve:</strong> {item.whatToImprove}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
