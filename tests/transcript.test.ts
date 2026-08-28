import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseTranscript,
  guessRoles,
  coachTalkShare,
  resolveRoles,
  validateTranscript,
} from "../lib/transcript";

/**
 * The measurements a language model must never be asked to make.
 *
 * Talk share is the clearest case: both rubrics cap the total on it, and a cap
 * that silently removes 20-25 points cannot rest on a model's estimate of a
 * percentage. These tests pin the counting, the role resolution that decides
 * whose share is measured, and the input validation that refuses to spend a
 * model call on a transcript that cannot be scored.
 */

const load = (name: string) =>
  parseTranscript(readFileSync(new URL(`../fixtures/transcripts/${name}.txt`, import.meta.url), "utf8"));

describe("parsing", () => {
  it("addresses every speaking turn without dropping lines", () => {
    const p = load("kickoff-01");
    expect(p.lines.length).toBeGreaterThan(100);
    expect(p.unparsedCount).toBe(0);
    expect(p.lines[0].n).toBe(1);
    expect(p.speakers.length).toBe(2);
  });

  it("counts words excluding bracketed stage directions", () => {
    const p = parseTranscript("[A]: hello there [laughs] friend\n[B]: yes");
    // "hello there friend" = 3, "[laughs]" excluded; "yes" = 1
    expect(p.totalWords).toBe(4);
  });
});

describe("talk share is counted, not estimated", () => {
  it("measures the coach's share of spoken words", () => {
    const p = load("kickoff-02");
    const roles = guessRoles(p);
    const share = coachTalkShare(p, roles.coach);
    expect(share).not.toBeNull();
    // This is the planted over-talking call: the coach is above the 70% cap.
    expect(share!).toBeGreaterThan(0.7);
  });

  it("returns null when the coach cannot be identified", () => {
    const p = load("coaching-01");
    expect(coachTalkShare(p, null)).toBeNull();
  });
});

describe("role resolution refuses invented names", () => {
  it("accepts model names that match real speakers", () => {
    const p = load("kickoff-01");
    const real = p.speakers.map((s) => s.speaker);
    const roles = resolveRoles(p, { coach: real[0], client: real[1] });
    expect(roles.fromModel).toBe(true);
    expect(roles.coach).toBe(real[0]);
  });

  it("falls back to transcript order when the model names a ghost speaker", () => {
    const p = load("kickoff-01");
    const roles = resolveRoles(p, { coach: "Someone Who Never Spoke", client: "Nor This Person" });
    expect(roles.fromModel).toBe(false);
    expect(roles.coach).toBe(p.lines[0].speaker);
  });
});

describe("validation rejects the unscorable before a model call", () => {
  it("rejects an empty transcript", () => {
    const p = parseTranscript("");
    expect(validateTranscript(p)?.code).toBe("unparsable");
  });

  it("rejects a single-speaker transcript", () => {
    const p = parseTranscript(Array.from({ length: 40 }, () => "[A]: talking to myself here again").join("\n"));
    expect(validateTranscript(p)?.code).toBe("single_speaker");
  });

  it("rejects a transcript with too few words", () => {
    const p = parseTranscript("[A]: hi\n[B]: hello");
    expect(validateTranscript(p)?.code).toBe("too_short");
  });

  it("passes a real transcript", () => {
    expect(validateTranscript(load("coaching-02"))).toBeNull();
  });
});
