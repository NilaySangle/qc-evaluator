/**
 * Transcript parsing, line addressing, and the measurements that must never be
 * asked of a language model.
 *
 * Two jobs here:
 *
 * 1. Give every speaking turn a stable address (L001, L002, …). The model is
 *    required to cite these, and lib/scoring/verify.ts checks each citation
 *    against the real line. Evidence that cannot be resolved is evidence that
 *    was invented, and it gets dropped rather than shown to a coach.
 *
 * 2. Compute talk share. Both rubrics cap the total on it ("coach speaks >75%
 *    of the call", ">70% of the time"). A percentage is arithmetic, so it is
 *    counted here from word totals. Asking a model to estimate one produces a
 *    plausible number with nothing underneath it.
 */

export interface TranscriptLine {
  /** 1-based line number, matching the L### label the model is given. */
  n: number;
  speaker: string;
  text: string;
}

export interface SpeakerStats {
  speaker: string;
  turns: number;
  words: number;
  share: number;
}

export interface ParsedTranscript {
  lines: TranscriptLine[];
  speakers: SpeakerStats[];
  totalWords: number;
  totalChars: number;
  /** Lines that did not match the `[Speaker]: text` shape, for diagnostics. */
  unparsedCount: number;
}

const TURN = /^\s*\[([^\]]+)\]\s*:\s*([\s\S]*)$/;

/** Label for line `n`, zero-padded so the labels sort and scan cleanly. */
export function lineLabel(n: number): string {
  return `L${String(n).padStart(3, "0")}`;
}

export function parseLineLabel(label: string): number | null {
  const m = /^L(\d+)$/i.exec(label.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function countWords(s: string): number {
  // Drop bracketed stage directions ("[laughs]") so they don't inflate a
  // speaker's share.
  const cleaned = s.replace(/\[[^\]]*\]/g, " ");
  const m = cleaned.match(/[\p{L}\p{N}'’-]+/gu);
  return m ? m.length : 0;
}

export function parseTranscript(raw: string): ParsedTranscript {
  const lines: TranscriptLine[] = [];
  let unparsedCount = 0;

  for (const rawLine of raw.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const m = TURN.exec(rawLine);
    if (!m) {
      // A wrapped or malformed line belongs to the turn above it rather than
      // becoming a phantom turn with no speaker.
      if (lines.length > 0) {
        lines[lines.length - 1].text += " " + rawLine.trim();
      }
      unparsedCount++;
      continue;
    }
    lines.push({ n: lines.length + 1, speaker: m[1].trim(), text: m[2].trim() });
  }

  const bySpeaker = new Map<string, { turns: number; words: number }>();
  let totalWords = 0;
  for (const l of lines) {
    const w = countWords(l.text);
    totalWords += w;
    const cur = bySpeaker.get(l.speaker) ?? { turns: 0, words: 0 };
    cur.turns += 1;
    cur.words += w;
    bySpeaker.set(l.speaker, cur);
  }

  const speakers: SpeakerStats[] = [...bySpeaker.entries()]
    .map(([speaker, s]) => ({
      speaker,
      turns: s.turns,
      words: s.words,
      share: totalWords > 0 ? s.words / totalWords : 0,
    }))
    .sort((a, b) => b.words - a.words);

  return { lines, speakers, totalWords, totalChars: raw.length, unparsedCount };
}

/**
 * The transcript as the model sees it: every turn addressed.
 *
 * Sent in full on every scoring call. Chunking would be the obvious move on a
 * 65k-character transcript, but 65k characters is roughly 16k tokens and fits
 * comfortably — and a dimension like "no connection to long-term vision at any
 * point in the call" cannot be judged from a slice. The cost of sending it
 * repeatedly is handled with prompt caching, not by cutting the evidence.
 */
export function renderForModel(parsed: ParsedTranscript): string {
  return parsed.lines.map((l) => `${lineLabel(l.n)} [${l.speaker}]: ${l.text}`).join("\n");
}

/**
 * Best-guess role assignment before the model has spoken.
 *
 * In every fixture the coach opens the call, but that is a convention and not a
 * guarantee, so this is only a fallback: the identify pass names both parties
 * and `resolveRoles` prefers its answer whenever it matches a real speaker.
 */
export function guessRoles(parsed: ParsedTranscript): { coach: string | null; client: string | null } {
  if (parsed.lines.length === 0) return { coach: null, client: null };
  const coach = parsed.lines[0].speaker;
  const client =
    parsed.speakers.map((s) => s.speaker).find((s) => s !== coach) ?? null;
  return { coach, client };
}

export interface Roles {
  coach: string | null;
  client: string | null;
  /** True when the model's names were used; false when we fell back. */
  fromModel: boolean;
}

/**
 * Reconcile the identify pass against the speakers that actually exist.
 *
 * A model naming a speaker who never spoke is a hallucination we can catch for
 * free, so we do, and fall back rather than putting an invented name at the top
 * of a report a coach will read.
 */
export function resolveRoles(
  parsed: ParsedTranscript,
  proposed: { coach?: string | null; client?: string | null },
): Roles {
  const known = new Map(parsed.speakers.map((s) => [s.speaker.toLowerCase(), s.speaker]));
  const match = (name?: string | null) => (name ? known.get(name.trim().toLowerCase()) ?? null : null);

  const coach = match(proposed.coach);
  const client = match(proposed.client);

  if (coach && client && coach !== client) return { coach, client, fromModel: true };

  const guessed = guessRoles(parsed);
  return { coach: coach ?? guessed.coach, client: client ?? guessed.client, fromModel: false };
}

/**
 * Share of spoken words belonging to the coach.
 *
 * Returns null when the coach cannot be identified, and the caller then skips
 * the talk-ratio cap rather than firing it on a guess — a cap that silently
 * removes 25 points should never rest on an unresolved name.
 */
export function coachTalkShare(parsed: ParsedTranscript, coach: string | null): number | null {
  if (!coach || parsed.totalWords === 0) return null;
  const s = parsed.speakers.find((x) => x.speaker === coach);
  return s ? s.share : null;
}

export interface TranscriptProblem {
  code: "empty" | "too_short" | "single_speaker" | "unparsable";
  message: string;
}

/**
 * Reject input that cannot be scored, before spending a model call on it.
 *
 * "A failed run says why" starts here: most of the ways this pipeline can fail
 * are visible in the paste box.
 */
export function validateTranscript(parsed: ParsedTranscript): TranscriptProblem | null {
  if (parsed.lines.length === 0) {
    return {
      code: "unparsable",
      message:
        "No speaking turns found. Every line needs to look like \"[Speaker Name]: what they said\".",
    };
  }
  if (parsed.totalWords < 100) {
    return {
      code: "too_short",
      message: `Only ${parsed.totalWords} words across ${parsed.lines.length} turns — too short to score a call against twelve dimensions.`,
    };
  }
  if (parsed.speakers.length < 2) {
    return {
      code: "single_speaker",
      message: `Only one speaker (${parsed.speakers[0].speaker}) appears. A call needs a coach and a client.`,
    };
  }
  return null;
}
