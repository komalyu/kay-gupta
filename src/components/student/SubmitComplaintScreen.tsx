import { ChangeEvent, FormEvent, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardPaste,
  Cpu,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import {
  COMPLAINT_CATEGORIES,
  DEMO_IMAGES,
  HOSTEL_BLOCKS,
  HOSTEL_NAMES,
} from '../../data/seedData';
import { AiTriageResult, requestAiFaultTriage } from '../../services/aiClient';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  UserAccount,
} from '../../types/hostelCare';
import { readFileAsDataUrl } from '../../utils/complaintHelpers';

interface SubmitComplaintScreenProps {
  currentUser: UserAccount;
  onCancel: () => void;
  onSubmit: (input: {
    title: string;
    description: string;
    category: ComplaintCategory;
    hostelName: string;
    block: string;
    roomNumber: string;
    priority: ComplaintPriority;
    preferredAvailability: string;
    beforePhotos: string[];
  }) => Complaint;
  onOpenComplaint: (complaintId: string) => void;
}

export function SubmitComplaintScreen({
  currentUser,
  onCancel,
  onSubmit,
  onOpenComplaint,
}: SubmitComplaintScreenProps) {
  const [category, setCategory] = useState<ComplaintCategory>('Plumbing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hostelName, setHostelName] = useState(currentUser.hostel ?? HOSTEL_NAMES[0]);
  const [block, setBlock] = useState(currentUser.block ?? HOSTEL_BLOCKS[0]);
  const [roomNumber, setRoomNumber] = useState(currentUser.roomNumber ?? '204');
  const [priority, setPriority] = useState<ComplaintPriority>('High');
  const [preferredAvailability, setPreferredAvailability] = useState(
    'Today, 2:00 PM – 5:00 PM'
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<AiTriageResult | null>(null);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const urls = await Promise.all(Array.from(files).map(readFileAsDataUrl));
      setPhotos((prev) => [...prev, ...urls].slice(0, 4));
    } catch {
      setError('Could not read selected image file.');
    }
  };

  const handlePrefillGuidedScenario = () => {
    setCategory('Plumbing');
    setTitle('Bathroom sink pipe water leakage');
    setDescription(
      'Water is dripping steadily from the under-sink PVC joint onto the washroom tiles. Needs washer replacement and sealing.'
    );
    setHostelName(currentUser.hostel ?? 'North Hall');
    setBlock(currentUser.block ?? 'Block A');
    setRoomNumber(currentUser.roomNumber ?? '204');
    setPriority('High');
    setPreferredAvailability('Today, 3:00 PM – 6:00 PM');
    setPhotos([DEMO_IMAGES.leakBefore]);
    setError(null);
    setAiError(null);
  };

  const handleRunAiDiagnosis = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const result = await requestAiFaultTriage({
        title,
        description,
        photoDataUrl: photos[0],
      });
      setAiDiagnosis(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to diagnose fault right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiDiagnosis = () => {
    if (!aiDiagnosis) return;
    setTitle(aiDiagnosis.suggestedTitle);
    setCategory(aiDiagnosis.category);
    setPriority(aiDiagnosis.priority);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim() || !roomNumber.trim()) {
      setError('Please enter a complaint title, detailed description, and room number.');
      return;
    }
    const created = onSubmit({
      title,
      description,
      category,
      hostelName,
      block,
      roomNumber,
      priority,
      preferredAvailability,
      beforePhotos: photos,
    });
    setSubmittedComplaint(created);
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-sky-400';

  if (submittedComplaint) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#0c1322]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-navy-950 dark:text-white">
              Complaint Registered Successfully
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your maintenance request has been logged and immediately routed to the Hostel
              Warden dashboard.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Unique Complaint ID
                </span>
                <span className="font-mono text-base font-bold text-navy-900 dark:text-sky-400">
                  {submittedComplaint.id}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {submittedComplaint.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {submittedComplaint.category} · {submittedComplaint.hostelName}{' '}
                {submittedComplaint.block} · Room {submittedComplaint.roomNumber} ·{' '}
                {submittedComplaint.priority} Priority
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => onOpenComplaint(submittedComplaint.id)}
                className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Track Complaint & Timeline
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-sky-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Student Dashboard</span>
        </button>

        <button
          type="button"
          onClick={handlePrefillGuidedScenario}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          <span>Fill Sample Water Leakage (Guided Demo)</span>
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0c1322] sm:p-8"
      >
        <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <h1 className="text-xl font-bold text-navy-950 dark:text-white">
            Submit Maintenance Complaint
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Provide clear room details and a photograph so the assigned technician brings the
            right tools on the first visit.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Complaint Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
              className={inputCls}
            >
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
              className={inputCls}
            >
              <option value="Low">Low (48h target)</option>
              <option value="Medium">Medium (24h target)</option>
              <option value="High">High (12h target)</option>
              <option value="Critical">Critical (Immediate / 6h target)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Complaint Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Water leakage under washroom sink"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Detailed Description
            </label>
            <button
              type="button"
              onClick={handleRunAiDiagnosis}
              disabled={aiLoading || (!description.trim() && !title.trim() && photos.length === 0)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-navy-900 transition-colors hover:border-sky-500 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:border-sky-400 dark:hover:bg-slate-800"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cpu className="h-3.5 w-3.5" />
              )}
              <span>{aiLoading ? 'Analyzing Fault...' : 'Auto-Diagnose Fault with AI'}</span>
            </button>
          </div>
          <textarea
            rows={4}
            required
            placeholder="Describe where the fault is located, how severe it is, and when it started..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            AI analyzes your description and first uploaded photo to suggest category, priority,
            safety steps, and spare parts.
          </p>
        </div>

        {aiError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
          >
            {aiError}
          </div>
        )}

        {aiDiagnosis && (
          <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-800/70 dark:bg-sky-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 pb-2.5 dark:border-sky-800/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-navy-950 dark:text-sky-300">
                <Cpu className="h-4 w-4 text-navy-900 dark:text-sky-400" />
                <span>
                  AI Fault Assessment {aiDiagnosis.analyzedPhoto ? '· Vision + Text' : '· Text'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyAiDiagnosis}
                className="rounded-md bg-navy-900 px-3 py-1 text-xs font-semibold text-white hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Apply Title, Category & Priority
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Suggested Title</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {aiDiagnosis.suggestedTitle}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Trade Category</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {aiDiagnosis.category}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Priority Level</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {aiDiagnosis.priority}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>
                <strong>Immediate Safety Step:</strong> {aiDiagnosis.safetyNotice}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <p>
                <strong>Likely Parts Needed:</strong> {aiDiagnosis.likelyPartsNeeded.join(', ')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {aiDiagnosis.reasoning}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Hostel Name
            </label>
            <select
              value={hostelName}
              onChange={(e) => setHostelName(e.target.value)}
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
              value={block}
              onChange={(e) => setBlock(e.target.value)}
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
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 204"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Preferred Availability Time Window
          </label>
          <input
            type="text"
            value={preferredAvailability}
            onChange={(e) => setPreferredAvailability(e.target.value)}
            placeholder="e.g. Today 2:00 PM – 5:00 PM"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Technicians use this window to propose a realistic visit schedule.
          </p>
        </div>

        {/* Photo Upload */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Upload Photographs (Optional, up to 4)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Pipe Leak', src: DEMO_IMAGES.leakBefore },
                { label: 'Damaged Socket', src: DEMO_IMAGES.socketBefore },
                { label: 'Broken Desk', src: DEMO_IMAGES.tableBroken },
                { label: 'Wi-Fi AP', src: DEMO_IMAGES.wifiCorridor },
                { label: 'Ceiling Fan', src: DEMO_IMAGES.fanBefore },
              ].map((sample) => {
                const alreadyAdded = photos.includes(sample.src);
                return (
                  <button
                    key={sample.label}
                    type="button"
                    disabled={alreadyAdded || photos.length >= 4}
                    onClick={() =>
                      setPhotos((prev) =>
                        prev.includes(sample.src) || prev.length >= 4
                          ? prev
                          : [...prev, sample.src]
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-navy-900 transition-colors hover:border-sky-500 hover:bg-sky-50 disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:border-sky-400 dark:hover:bg-slate-800"
                  >
                    <Camera className="h-3 w-3" />
                    <span>+ {sample.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition-colors hover:border-navy-900 hover:bg-slate-100/70 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-sky-400 dark:hover:bg-slate-900">
            <Upload className="mb-1.5 h-5 w-5 text-slate-500 dark:text-sky-400" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              Click to select image files from device
            </span>
            <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              PNG or JPG · Instant compressed preview stored locally
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((src, idx) => (
                <div
                  key={`${src.slice(0, 20)}-${idx}`}
                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                >
                  <img
                    src={src}
                    alt={`Uploaded fault preview ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/80 p-1 text-white hover:bg-slate-900"
                    aria-label="Remove uploaded photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            Submit Complaint
          </button>
        </div>
      </form>
    </div>
  );
}
