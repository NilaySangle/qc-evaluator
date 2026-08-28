import type { ParsedTranscript } from "../transcript";
import { parseLineLabel, lineLabel } from "../transcript";
import type { EvidenceItem } from "./schema";

/**
 * Citation verification.
 *
 * The brief asks for "evidence or nothing", and warns that one of the four
 * transcripts exists to catch a system that guesses. This is the answer to
 * both, and it is deliberately not a second model call.
 *
 * Every quote the model returns is checked against the line it claims to come
 * from. A model fabricating support for a score has to fabricate words, and
 * fabricated words are not in the transcript. That check is a string comparison:
 * instant, free, and provably right. A second model asked "is this quote real?"
 * would cost another round trip and still only offer an opinion.
 *
 * A quote that is real but attributed to the wrong line is treated separately
 * from one that does not exist at all. The first is a clerical slip and the
 * evidence survives with its true line; the second is invention and the
 * evidence is dropped.
 */

export type EvidenceStatus =
  /** Quote found on the cited line. */
  | "verified"
  /** Quote found in the transcript, but on a different line. Corrected. */
  | "relocated"
  /** Line label does not exist in this transcript. */
  | "bad_line"
  /** Quote appears nowhere in the transcript. */
  | "not_found";

export interface VerifiedEvidence {
  status: EvidenceStatus;
  /** Line the quote actually belongs to, once resolved. Null when unresolvable. */
  line: number | null;
  label: string;
  speaker: string | null;
  quote: string;
  /** The full text of the resolved line, for display context. */
  lineText: string | null;
  /** What the model originally claimed, when we had to correct it. */
  claimedLabel?: string;
}

/**
 * Normalise for comparison only.
 *
 * Transcripts carry curly quotes and en dashes; models routinely return the
 * straight-ASCII equivalents of the same words. Treating those as different
 * text would reject honest citations, so both sides are flattened before
 * comparison. The quote shown in the report is always the original.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‛ʼ]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\p{L}\p{N}\s'"$%.,!?-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Quotes shorter than this are too generic to verify meaningfully. */
const MIN_QUOTE_WORDS = 3;

export interface VerificationSummary {
  total: number;
  verified: number;
  relocated: number;
  dropped: number;
}

export function summarise(items: VerifiedEvidence[]): VerificationSummary {
  return {
    total: items.length,
    verified: items.filter((i) => i.status === "verified").length,
    relocated: items.filter((i) => i.status === "relocated").length,
    dropped: items.filter((i) => i.status === "bad_line" || i.status === "not_found").length,
  };
}

/**
 * Resolve one citation against the transcript.
 *
 * Order matters: check the claimed line first so an honest citation stays
 * attributed where the model put it, and only search the rest of the transcript
 * when that fails.
 */
export function verifyEvidenceItem(
  parsed: ParsedTranscript,
  item: EvidenceItem,
): VerifiedEvidence {
  const quote = (item.quote ?? "").trim();
  const claimed = parseLineLabel(item.line ?? "");
  const needle = normalise(quote);

  const base: VerifiedEvidence = {
    status: "not_found",
    line: null,
    label: item.line ?? "",
    speaker: null,
    quote,
    lineText: null,
  };

  if (!needle || needle.split(" ").length < MIN_QUOTE_WORDS) {
    return { ...base, status: "not_found" };
  }

  if (claimed !== null && claimed >= 1 && claimed <= parsed.lines.length) {
    const line = parsed.lines[claimed - 1];
    if (normalise(line.text).includes(needle)) {
      return {
        status: "verified",
        line: claimed,
        label: lineLabel(claimed),
        speaker: line.speaker,
        quote,
        lineText: line.text,
      };
    }
  }

  // Right words, wrong address — keep the evidence, fix the address.
  const found = parsed.lines.find((l) => normalise(l.text).includes(needle));
  if (found) {
    return {
      status: "relocated",
      line: found.n,
      label: lineLabel(found.n),
      speaker: found.speaker,
      quote,
      lineText: found.text,
      claimedLabel: item.line,
    };
  }

  if (claimed === null || claimed < 1 || claimed > parsed.lines.length) {
    return { ...base, status: "bad_line" };
  }
  return { ...base, status: "not_found" };
}

export function verifyEvidence(
  parsed: ParsedTranscript,
  items: EvidenceItem[] | undefined,
): VerifiedEvidence[] {
  if (!items?.length) return [];
  const out: VerifiedEvidence[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const v = verifyEvidenceItem(parsed, item);
    // Two citations of the same words on the same line add nothing.
    const key = `${v.line ?? "x"}|${normalise(v.quote)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Evidence good enough to show a coach. */
export function usableEvidence(items: VerifiedEvidence[]): VerifiedEvidence[] {
  return items.filter((i) => i.status === "verified" || i.status === "relocated");
}

export type IntegrityLevel = "ok" | "thin" | "unsupported";

export interface EvidenceIntegrity {
  level: IntegrityLevel;
  summary: VerificationSummary;
  message: string | null;
}

/**
 * How much weight this dimension's evidence can bear.
 *
 * A score with no surviving citations is not automatically wrong — but it is
 * unsupported, and the report says so rather than presenting it with the same
 * confidence as one backed by three verified quotes. That distinction is the
 * whole point of checking.
 *
 * `behaviourPresent: false` is exempt: there is nothing to quote when the
 * behaviour never happened, and demanding evidence of an absence would push the
 * model to invent some.
 */
export function assessIntegrity(
  items: VerifiedEvidence[],
  behaviourPresent: boolean,
): EvidenceIntegrity {
  const summary = summarise(items);
  const usable = summary.verified + summary.relocated;

  if (!behaviourPresent) {
    return {
      level: "ok",
      summary,
      message:
        summary.dropped > 0
          ? `${summary.dropped} citation${summary.dropped === 1 ? "" : "s"} could not be found in the transcript and were removed.`
          : null,
    };
  }

  if (usable === 0) {
    return {
      level: "unsupported",
      summary,
      message:
        summary.total === 0
          ? "The model returned no transcript citations for this score."
          : `None of the ${summary.total} citation${summary.total === 1 ? "" : "s"} offered could be found in the transcript. Treat this score as unsupported.`,
    };
  }

  if (summary.dropped > 0) {
    return {
      level: "thin",
      summary,
      message: `${summary.dropped} of ${summary.total} citations could not be found and were removed; ${usable} verified.`,
    };
  }

  return {
    level: "ok",
    summary,
    message:
      summary.relocated > 0
        ? `${summary.relocated} citation${summary.relocated === 1 ? " was" : "s were"} attributed to the wrong line and corrected.`
        : null,
  };
}
