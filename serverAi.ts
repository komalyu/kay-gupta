import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_IMAGES_DIR = path.resolve(__dirname, 'src', 'assets', 'images');

const MODEL_NAME = 'gemini-4-hydrogen';

const VALID_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Furniture',
  'Internet/Wi-Fi',
  'Cleaning',
  'Water Supply',
  'Washroom',
  'Other',
] as const;

const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export class AiServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AiServiceError(
      'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets.',
      503
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: unknown): AiServiceError {
  if (err instanceof AiServiceError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return new AiServiceError(
      'Gemini API access denied. Please verify your GEMINI_API_KEY in Settings > Secrets.',
      403
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return new AiServiceError(
      'Gemini API rate limit reached. Please wait a moment and try again.',
      429
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new AiServiceError(
      'Requested Gemini model is unavailable. Check server model configuration.',
      404
    );
  }
  return new AiServiceError(`AI request failed: ${raw}`, 500);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const mapped = mapGeminiError(err);
    if (retries > 0 && mapped.statusCode >= 500) {
      await new Promise((r) => setTimeout(r, 450));
      return withRetry(fn, retries - 1);
    }
    throw mapped;
  }
}

function resolveImageToPart(
  src?: string
): { inlineData: { mimeType: string; data: string } } | null {
  if (!src || typeof src !== 'string') return null;

  const dataUrlMatch = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      inlineData: {
        mimeType: dataUrlMatch[1],
        data: dataUrlMatch[2],
      },
    };
  }

  if (src.startsWith('/src/assets/images/')) {
    const safeName = path.basename(src);
    const fullPath = path.join(ASSETS_IMAGES_DIR, safeName);
    if (fullPath.startsWith(ASSETS_IMAGES_DIR) && fs.existsSync(fullPath)) {
      const ext = path.extname(safeName).toLowerCase();
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
      const data = fs.readFileSync(fullPath).toString('base64');
      return { inlineData: { mimeType, data } };
    }
  }

  return null;
}

function parseJsonSafe<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;
  try {
    return JSON.parse(rawText.trim()) as T;
  } catch {
    return fallback;
  }
}

export async function runAiFaultTriage(input: {
  description?: string;
  title?: string;
  photoDataUrl?: string;
}) {
  const description = (input.description ?? '').trim();
  const title = (input.title ?? '').trim();
  const imagePart = resolveImageToPart(input.photoDataUrl);

  if (!description && !title && !imagePart) {
    throw new AiServiceError(
      'Enter a complaint description or attach a fault photo before running AI diagnosis.',
      400
    );
  }

  const ai = getAiClient();
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (imagePart) {
    parts.push(imagePart);
  }
  parts.push({
    text: `Analyze this student hostel maintenance report.
Title: ${title || '(Not provided yet)'}
Description: ${description || '(Infer visible fault from the attached photograph)'}

Classify into one exact category from: ${VALID_CATEGORIES.join(', ')}.
Assign one priority from: ${VALID_PRIORITIES.join(', ')} (use Critical only for safety hazards like sparking wiring, flooding, or complete water loss; High for active leaks, broken locks, or urgent room usability faults).
Provide a concise suggestedTitle (5-8 words), an immediate practical safetyNotice for the student, 2-4 likelyPartsNeeded for the technician, and a brief 1-sentence reasoning.`,
  });

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        systemInstruction:
          'You are the HostelCare maintenance triage specialist. Be practical, accurate, and concise. Never invent room numbers or facts not in the input.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: { type: Type.STRING },
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            safetyNotice: { type: Type.STRING },
            likelyPartsNeeded: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            reasoning: { type: Type.STRING },
          },
          required: [
            'suggestedTitle',
            'category',
            'priority',
            'safetyNotice',
            'likelyPartsNeeded',
            'reasoning',
          ],
        },
      },
    })
  );

  const parsed = parseJsonSafe(response.text, {
    suggestedTitle: title || 'Hostel Maintenance Fault',
    category: 'Other',
    priority: 'Medium',
    safetyNotice: 'Keep the area clear until the assigned technician inspects the fault.',
    likelyPartsNeeded: ['Standard inspection toolkit'],
    reasoning: 'Classified from submitted complaint details.',
  });

  const normalizedCategory = VALID_CATEGORIES.includes(
    parsed.category as (typeof VALID_CATEGORIES)[number]
  )
    ? parsed.category
    : 'Other';
  const normalizedPriority = VALID_PRIORITIES.includes(
    parsed.priority as (typeof VALID_PRIORITIES)[number]
  )
    ? parsed.priority
    : 'Medium';

  return {
    suggestedTitle: parsed.suggestedTitle,
    category: normalizedCategory,
    priority: normalizedPriority,
    safetyNotice: parsed.safetyNotice,
    likelyPartsNeeded: Array.isArray(parsed.likelyPartsNeeded)
      ? parsed.likelyPartsNeeded.slice(0, 5)
      : [],
    reasoning: parsed.reasoning,
    analyzedPhoto: Boolean(imagePart),
  };
}

export async function runAiDispatchPlan(input: {
  complaint: {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    hostelName: string;
    block: string;
    roomNumber: string;
    preferredAvailability: string;
    beforePhotos?: string[];
  };
  technicians: Array<{
    id: string;
    name: string;
    specialty: string;
    categories: string[];
    availability: string;
    activeJobs: number;
    maxDailyJobs: number;
    rating: number;
  }>;
}) {
  if (!input.complaint || !Array.isArray(input.technicians)) {
    throw new AiServiceError('Complaint and technician roster are required.', 400);
  }

  const ai = getAiClient();
  const imagePart = resolveImageToPart(input.complaint.beforePhotos?.[0]);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (imagePart) parts.push(imagePart);

  parts.push({
    text: `Generate a practical dispatch and field repair brief for this hostel complaint:
Complaint: ${JSON.stringify({
      id: input.complaint.id,
      title: input.complaint.title,
      description: input.complaint.description,
      category: input.complaint.category,
      priority: input.complaint.priority,
      location: `${input.complaint.hostelName} ${input.complaint.block} Room ${input.complaint.roomNumber}`,
      preferredAvailability: input.complaint.preferredAvailability,
    })}

Available Technicians:
${JSON.stringify(input.technicians)}

Select the best technician ID from the roster considering trade specialty match, availability (avoid Off Shift), and activeJobs vs maxDailyJobs. Also provide estimatedDurationMinutes (number), 3-4 diagnosticSteps, 2-5 toolsAndSpares, assignmentRationale, and a polite 1-2 sentence draftStudentMessage confirming visit prep/access.`,
  });

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        systemInstruction:
          'You are the HostelCare maintenance dispatch coordinator. Respect realistic technician workloads and give actionable step-by-step trade guidance.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedTechnicianId: { type: Type.STRING },
            recommendedTechnicianName: { type: Type.STRING },
            assignmentRationale: { type: Type.STRING },
            estimatedDurationMinutes: { type: Type.INTEGER },
            diagnosticSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            toolsAndSpares: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            draftStudentMessage: { type: Type.STRING },
          },
          required: [
            'recommendedTechnicianId',
            'recommendedTechnicianName',
            'assignmentRationale',
            'estimatedDurationMinutes',
            'diagnosticSteps',
            'toolsAndSpares',
            'draftStudentMessage',
          ],
        },
      },
    })
  );

  const fallbackTech = input.technicians[0];
  const parsed = parseJsonSafe(response.text, {
    recommendedTechnicianId: fallbackTech?.id ?? '',
    recommendedTechnicianName: fallbackTech?.name ?? 'Technician',
    assignmentRationale: 'Matched by specialty and daily job capacity.',
    estimatedDurationMinutes: 45,
    diagnosticSteps: [
      'Inspect reported fault area and verify safety shutoff.',
      'Replace or tighten worn component.',
      'Test operation and capture completion photo.',
    ],
    toolsAndSpares: ['Standard diagnostic toolkit'],
    draftStudentMessage:
      'I have reviewed your complaint and will inspect the room within your preferred window.',
  });

  const matchedTech = input.technicians.find(
    (t) => t.id === parsed.recommendedTechnicianId
  );

  return {
    recommendedTechnicianId: matchedTech ? matchedTech.id : fallbackTech?.id ?? '',
    recommendedTechnicianName: matchedTech
      ? matchedTech.name
      : parsed.recommendedTechnicianName,
    assignmentRationale: parsed.assignmentRationale,
    estimatedDurationMinutes: Math.max(15, Math.min(240, Number(parsed.estimatedDurationMinutes) || 45)),
    diagnosticSteps: Array.isArray(parsed.diagnosticSteps)
      ? parsed.diagnosticSteps.slice(0, 5)
      : [],
    toolsAndSpares: Array.isArray(parsed.toolsAndSpares)
      ? parsed.toolsAndSpares.slice(0, 6)
      : [],
    draftStudentMessage: parsed.draftStudentMessage,
  };
}

export async function runAiVerifyRepair(input: {
  complaintTitle: string;
  category: string;
  beforePhoto?: string;
  afterPhoto?: string;
}) {
  const beforePart = resolveImageToPart(input.beforePhoto);
  const afterPart = resolveImageToPart(input.afterPhoto);

  if (!afterPart) {
    throw new AiServiceError(
      'An after-repair photograph is required before AI repair verification can run.',
      400
    );
  }

  const ai = getAiClient();
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (beforePart) {
    parts.push({ text: 'BEFORE REPAIR PHOTOGRAPH (reported fault):' });
    parts.push(beforePart);
  }
  parts.push({ text: 'AFTER REPAIR PHOTOGRAPH (technician completion proof):' });
  parts.push(afterPart);
  parts.push({
    text: `Inspect these photographs for hostel maintenance complaint "${input.complaintTitle}" (Category: ${input.category}).
Evaluate whether the after-repair photo demonstrates a clean, safe, physically completed repair matching the fault context.
Return verificationStatus strictly as one of: "Verified", "Needs Closer Inspection", or "Insufficient Proof".
Include a 1-2 sentence visual summary, 2-4 specific checksPassed observed in the photo(s), and a concise recommendation for the Warden/Technician.`,
  });

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        systemInstruction:
          'You are a strict hostel facilities quality auditor. Base every observation strictly on what is visible in the provided photograph(s).',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verificationStatus: { type: Type.STRING },
            summary: { type: Type.STRING },
            checksPassed: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendation: { type: Type.STRING },
          },
          required: ['verificationStatus', 'summary', 'checksPassed', 'recommendation'],
        },
      },
    })
  );

  const parsed = parseJsonSafe(response.text, {
    verificationStatus: 'Needs Closer Inspection',
    summary: 'Completion photograph uploaded; manual visual review recommended.',
    checksPassed: ['Completion photograph present'],
    recommendation: 'Confirm directly with student before final administrative closure.',
  });

  const allowedStatuses = ['Verified', 'Needs Closer Inspection', 'Insufficient Proof'];
  const verificationStatus = allowedStatuses.includes(parsed.verificationStatus)
    ? parsed.verificationStatus
    : 'Needs Closer Inspection';

  return {
    verificationStatus,
    summary: parsed.summary,
    checksPassed: Array.isArray(parsed.checksPassed)
      ? parsed.checksPassed.slice(0, 5)
      : [],
    recommendation: parsed.recommendation,
    comparedBeforeAfter: Boolean(beforePart && afterPart),
  };
}

export async function runAiWardenBriefing(input: {
  complaints: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    hostelName: string;
    block: string;
    roomNumber: string;
    assignedTechnicianName?: string;
    isOverdue: boolean;
    reopenCount: number;
    escalationLevel: number;
  }>;
  technicians: Array<{
    name: string;
    specialty: string;
    availability: string;
    activeJobs: number;
    maxDailyJobs: number;
  }>;
  simulatedOffsetHours: number;
  question?: string;
}) {
  if (!Array.isArray(input.complaints)) {
    throw new AiServiceError('Complaint dataset is required for warden briefing.', 400);
  }

  const ai = getAiClient();
  const question = (input.question ?? '').trim();

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze live HostelCare maintenance operations (simulated clock offset: +${input.simulatedOffsetHours}h):
Complaints: ${JSON.stringify(input.complaints)}
Technicians: ${JSON.stringify(input.technicians)}
${question ? `Warden Question: "${question}"` : 'Provide a shift operational briefing.'}

Produce:
- headline: crisp 1-sentence status overview
- urgentActions: array of up to 3 objects { complaintId, action } referencing real complaint IDs from the input
- bottlenecks: 1-3 specific wing/trade/staffing observations
- answer: direct concise response to the warden's question (or summary of immediate next steps if no question was asked).`,
      config: {
        systemInstruction:
          'You are an analytical Hostel Facilities Operations Advisor. Reference only real complaint IDs, blocks, and technician names from the provided JSON.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            urgentActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  complaintId: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ['complaintId', 'action'],
              },
            },
            bottlenecks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            answer: { type: Type.STRING },
          },
          required: ['headline', 'urgentActions', 'bottlenecks', 'answer'],
        },
      },
    })
  );

  const parsed = parseJsonSafe<{
    headline: string;
    urgentActions: Array<{ complaintId: string; action: string }>;
    bottlenecks: string[];
    answer: string;
  }>(response.text, {
    headline: 'Operations briefing generated from active hostel tickets.',
    urgentActions: [],
    bottlenecks: [],
    answer: 'Review overdue and unassigned complaints in the escalation queue.',
  });

  const validIds = new Set(input.complaints.map((c) => c.id));
  const urgentActions = Array.isArray(parsed.urgentActions)
    ? parsed.urgentActions
        .filter((a) => validIds.has(a.complaintId))
        .slice(0, 4)
    : [];

  return {
    headline: parsed.headline,
    urgentActions,
    bottlenecks: Array.isArray(parsed.bottlenecks)
      ? parsed.bottlenecks.slice(0, 4)
      : [],
    answer: parsed.answer,
  };
}

export async function runAiMessBriefing(input: {
  activeMeal: string;
  halls: Array<{
    id: string;
    name: string;
    capacity: number;
    currentOccupancy: number;
    entryRatePerMin: number;
    exitRatePerMin: number;
    overflowRedirectTo?: string;
    counters: Array<{
      name: string;
      status: string;
      queueLength: number;
      avgWaitMinutes: number;
      batchLevelPct: number;
    }>;
  }>;
  slots: Array<{
    messHallId: string;
    mealType: string;
    windowLabel: string;
    maxCapacity: number;
    bookedCount: number;
    checkedInCount: number;
  }>;
  skipCount: number;
  question?: string;
}) {
  if (!Array.isArray(input.halls) || input.halls.length === 0) {
    throw new AiServiceError('Mess hall occupancy dataset is required.', 400);
  }

  const ai = getAiClient();
  const question = (input.question ?? '').trim();

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze live campus mess crowd telemetry for active meal "${input.activeMeal}":
Mess Halls & Counters: ${JSON.stringify(input.halls)}
Meal Slots: ${JSON.stringify(input.slots.slice(0, 14))}
Confirmed Student Skip Notices: ${input.skipCount}
${question ? `Question: "${question}"` : 'Provide an actionable crowd balancing & kitchen prep brief.'}

Return JSON with:
- headline: 1-sentence live crowd summary referencing real mess hall names and occupancy percentages
- crowdRiskLevel: strictly one of "Nominal", "Elevated", or "Surge Alert"
- recommendedActions: array of 2-3 objects { hallName, action } with concrete counter/redirect/slot steps
- kitchenPrepGuidance: concise 1-2 sentence batch/portion advice accounting for occupancy and skip notices
- answer: direct 2-sentence answer to the question (or immediate flow recommendation if no question provided).`,
      config: {
        systemInstruction:
          'You are the HostelCare Mess Crowd Operations Advisor. Reference only real hall names, counter names, and occupancy numbers from the input JSON.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            crowdRiskLevel: { type: Type.STRING },
            recommendedActions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hallName: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ['hallName', 'action'],
              },
            },
            kitchenPrepGuidance: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          required: [
            'headline',
            'crowdRiskLevel',
            'recommendedActions',
            'kitchenPrepGuidance',
            'answer',
          ],
        },
      },
    })
  );

  const parsed = parseJsonSafe<{
    headline: string;
    crowdRiskLevel: string;
    recommendedActions: Array<{ hallName: string; action: string }>;
    kitchenPrepGuidance: string;
    answer: string;
  }>(response.text, {
    headline: 'Live crowd analysis generated across campus dining halls.',
    crowdRiskLevel: 'Elevated',
    recommendedActions: [],
    kitchenPrepGuidance: 'Stagger chapati batch refills and account for logged skip notices.',
    answer: 'Shift incoming diners toward lower-occupancy dining halls and open express pre-plated trays.',
  });

  const allowedRisk = ['Nominal', 'Elevated', 'Surge Alert'];
  const crowdRiskLevel = allowedRisk.includes(parsed.crowdRiskLevel)
    ? parsed.crowdRiskLevel
    : 'Elevated';

  return {
    headline: parsed.headline,
    crowdRiskLevel,
    recommendedActions: Array.isArray(parsed.recommendedActions)
      ? parsed.recommendedActions.slice(0, 4)
      : [],
    kitchenPrepGuidance: parsed.kitchenPrepGuidance,
    answer: parsed.answer,
  };
}

