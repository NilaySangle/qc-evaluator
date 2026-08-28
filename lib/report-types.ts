import type { CallType } from "./rubric";

/**
 * The report, as stored and as rendered.
 *
 * Kept free of any dependency on the Anthropic SDK or the scoring pipeline so
 * the page, the PDF renderer and the database layer can all import it without
 * dragging server-only code into the browser bundle.
 */

export interface ReportEvidence {
  label: string;
  line: number;
  speaker: string | null;
  quote: string;
  /** True when the model cited the wrong line and we corrected it. */
  corrected?: boolean;
  claimedLabel?: string;
}

export interface ReportDimension {
  id: string;
  n: number;
  name: string;
  pillar?: string;
  score: number;
  max: number;
  bucketLabel: string;
  rationale: string;
  quickFix: string;
  evidence: ReportEvidence[];
  /** False means the behaviour never appears in the transcript. */
  behaviourPresent: boolean;
  disabled: boolean;
  disabledReason?: string;
  /** Ceiling after caps, when lower than max. */
  ceiling: number;
  capNotes: string[];
  snapNote?: string;
  /** How much weight the evidence can bear. */
  integrity: "ok" | "thin" | "unsupported";
  integrityNote: string | null;
}

export interface ReportCap {
  id: string;
  condition: string;
  reason: string;
  measurement?: string;
  nonRecoverable: boolean;
  effect: string;
  /**
   * Did this cap actually change the score?
   *
   * A total cap whose ceiling sits above the score the call already earned
   * (talk share over 70% on a call that only reached 56/100) has its condition
   * met but removes no points. It is still worth showing — the coach did
   * over-talk — but the report must not claim a reduction that never happened.
   */
  binding: boolean;
}

export interface ReportRedFlag {
  title: string;
  detail: string;
  severity: "high" | "medium";
  evidence: ReportEvidence[];
}

export interface ReportOneThing {
  text: string;
  dimensionId: string;
  dimensionName: string;
  /** Score that dimension would have reached. */
  targetScore: number;
  currentScore: number;
  max: number;
  /** Recomputed total, not a model prediction. */
  projectedScore: number | null;
  projectedBand: string | null;
  delta: number | null;
}

export interface ReportTotals {
  score: number;
  band: string;
  bandDescription: string;
  raw: number;
  activeMax: number;
  normalised: number;
  cappedFrom: number | null;
  method: string;
}

export interface ReportMeta {
  model: string;
  rubricVersion: string;
  transcriptChars: number;
  transcriptTurns: number;
  transcriptWords: number;
  coachTalkShare: number | null;
  durationMs: number;
  costUsd: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  evidence: {
    total: number;
    verified: number;
    relocated: number;
    dropped: number;
  };
  /** Notes worth surfacing about how the total was derived. */
  notes: string[];
}

export interface Report {
  callType: CallType;
  rubricTitle: string;
  coach: string | null;
  client: string | null;
  callSummary: string;
  oneThing: ReportOneThing;
  brief: string;
  redFlags: ReportRedFlag[];
  totals: ReportTotals;
  capsFired: ReportCap[];
  dimensions: ReportDimension[];
  meta: ReportMeta;
}

export type RunStatus = "queued" | "running" | "complete" | "failed";

export interface RunProgress {
  /** Dimensions scored so far, for the live page. */
  scored: number;
  total: number;
  stage: "identify" | "scoring" | "verifying" | "narrating" | "done";
}

export const STAGE_LABEL: Record<RunProgress["stage"], string> = {
  identify: "Reading the transcript",
  scoring: "Scoring twelve dimensions",
  verifying: "Verifying every citation",
  narrating: "Writing the report",
  done: "Done",
};
