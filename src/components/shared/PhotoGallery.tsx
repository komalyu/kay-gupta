import { useState } from 'react';
import { Camera, ImageOff, Maximize2, MoveHorizontal, X } from 'lucide-react';

interface PhotoGalleryProps {
  beforePhotos: string[];
  afterPhotos: string[];
  title?: string;
}

function ResilientPhoto({
  src,
  alt,
  label,
  onExpand,
}: {
  src: string;
  alt: string;
  label: string;
  onExpand: (src: string, alt: string) => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-4 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <ImageOff className="mb-2 h-6 w-6 text-slate-400" />
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Preview unavailable</p>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />
      <button
        type="button"
        onClick={() => onExpand(src, alt)}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-medium text-white opacity-90 transition-opacity hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-white"
        aria-label={`Inspect ${alt}`}
      >
        <Maximize2 className="h-3.5 w-3.5" />
        <span>Inspect</span>
      </button>
      <div className="border-t border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-[#0c1322] dark:text-slate-200">
        {label}
      </div>
    </div>
  );
}

export function BeforeAfterComparisonSlider({
  beforeSrc,
  afterSrc,
}: {
  beforeSrc: string;
  afterSrc: string;
}) {
  const [splitPct, setSplitPct] = useState(50);

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
          <MoveHorizontal className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>Interactive Before / After Verification Slider</span>
        </span>
        <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
          {splitPct}% Before · {100 - splitPct}% After
        </span>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950 select-none dark:border-slate-700">
        <img
          src={afterSrc}
          alt="After repair completion verification"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${splitPct}%` }}
        >
          <img
            src={beforeSrc}
            alt="Before repair reported condition"
            referrerPolicy="no-referrer"
            className="h-full w-full max-w-none object-cover"
            style={{ width: `${(100 / Math.max(1, splitPct)) * 100}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]"
          style={{ left: `${splitPct}%` }}
        />
        <span className="pointer-events-none absolute left-3 top-3 rounded bg-slate-950/80 px-2 py-0.5 text-[11px] font-semibold text-white">
          Before
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded bg-emerald-900/85 px-2 py-0.5 text-[11px] font-semibold text-white">
          After Proof
        </span>
      </div>

      <input
        type="range"
        min={5}
        max={95}
        value={splitPct}
        onChange={(e) => setSplitPct(Number(e.target.value))}
        aria-label="Drag to compare before and after repair photographs"
        className="w-full accent-sky-500 cursor-ew-resize"
      />
    </div>
  );
}

export function PhotoGallery({ beforePhotos, afterPhotos }: PhotoGalleryProps) {
  const [expanded, setExpanded] = useState<{ src: string; alt: string } | null>(null);

  return (
    <div className="space-y-4">
      {beforePhotos.length > 0 && afterPhotos.length > 0 && (
        <BeforeAfterComparisonSlider
          beforeSrc={beforePhotos[0]}
          afterSrc={afterPhotos[0]}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
            <span>Before Repair (Student Report)</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {beforePhotos.length} photo{beforePhotos.length === 1 ? '' : 's'}
            </span>
          </div>
          {beforePhotos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {beforePhotos.map((src, idx) => (
                <ResilientPhoto
                  key={`${src.slice(0, 32)}-${idx}`}
                  src={src}
                  alt={`Before repair evidence ${idx + 1}`}
                  label={`Before #${idx + 1}`}
                  onExpand={(s, a) => setExpanded({ src: s, alt: a })}
                />
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <Camera className="mb-1.5 h-5 w-5 text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                No before photo attached
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Student submitted description without image attachment.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
            <span>After Repair (Technician Verification)</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {afterPhotos.length} photo{afterPhotos.length === 1 ? '' : 's'}
            </span>
          </div>
          {afterPhotos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {afterPhotos.map((src, idx) => (
                <ResilientPhoto
                  key={`${src.slice(0, 32)}-${idx}`}
                  src={src}
                  alt={`After repair completion proof ${idx + 1}`}
                  label={`Completion Proof #${idx + 1}`}
                  onExpand={(s, a) => setExpanded({ src: s, alt: a })}
                />
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <Camera className="mb-1.5 h-5 w-5 text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Awaiting completion proof
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Technician must upload an after-repair photo before closing the job.
              </p>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Inspection photo preview"
          onClick={() => setExpanded(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0c1322]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {expanded.alt}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close photo preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={expanded.src}
              alt={expanded.alt}
              referrerPolicy="no-referrer"
              className="max-h-[78vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
