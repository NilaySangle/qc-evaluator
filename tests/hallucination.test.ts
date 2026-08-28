import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseTranscript } from "../lib/transcript";
import { verifyEvidence, assessIntegrity, usableEvidence } from "../lib/scoring/verify";

/**
 * The guess-catcher, proved.
 *
 * The brief warns that "one of the four transcripts exists to catch a system
 * that guesses", and requires that "when a behaviour is not in the transcript,
 * the dimension says so. It does not guess and it does not read the mood of the
 * call."
 *
 * Our defence does not depend on identifying WHICH transcript is the trap,
 * because it does not try to detect deception at the level of judgement. It
 * checks a mechanical fact instead: a model that invents support for a score
 * has to invent words, and invented words are not in the transcript. That is a
 * string comparison — instant, free, and provably correct.
 *
 * These tests feed the verifier fabricated citations of the kind a guessing
 * model actually produces, and assert they never reach the report.
 */

const transcript = readFileSync(
  new URL("../fixtures/transcripts/kickoff-01.txt", import.meta.url),
  "utf8",
);
const parsed = parseTranscript(transcript);

describe("fabricated evidence is rejected", () => {
  it("drops a quote that appears nowhere in the transcript", () => {
    // Plausible-sounding coaching language that was never said. This is the
    // characteristic failure: fluent, on-theme, entirely invented.
    const verified = verifyEvidence(parsed, [
      {
        line: "L042",
        quote: "What I hear you saying is you want to be the active father you envision for decades to come",
      },
    ]);

    expect(verified).toHaveLength(1);
    expect(verified[0].status).toBe("not_found");
    expect(usableEvidence(verified)).toHaveLength(0);
  });

  it("drops a citation pointing past the end of the transcript", () => {
    const beyond = parsed.lines.length + 500;
    const verified = verifyEvidence(parsed, [
      { line: `L${beyond}`, quote: "Let us book the next call before we close this out" },
    ]);

    expect(verified[0].status).toBe("bad_line");
    expect(usableEvidence(verified)).toHaveLength(0);
  });

  it("marks a dimension unsupported when every citation is fabricated", () => {
    const verified = verifyEvidence(parsed, [
      { line: "L010", quote: "I have reviewed your intake notes in detail this morning" },
      { line: "L011", quote: "Your accountability task this week is the mobility video" },
    ]);

    // behaviourPresent: true — the model claimed the behaviour happened.
    const integrity = assessIntegrity(verified, true);

    expect(integrity.level).toBe("unsupported");
    expect(integrity.summary.dropped).toBe(2);
    expect(integrity.message).toMatch(/none of the 2 citations/i);
    expect(integrity.message).toMatch(/unsupported/i);
  });
});

describe("genuine evidence survives", () => {
  it("verifies a real quote against the line it came from", () => {
    // Taken directly from the fixture, so it must resolve.
    const real = parsed.lines[0];
    const words = real.text.split(/\s+/).slice(0, 6).join(" ");

    const verified = verifyEvidence(parsed, [{ line: `L001`, quote: words }]);

    expect(verified[0].status).toBe("verified");
    expect(verified[0].line).toBe(1);
    expect(verified[0].speaker).toBe(real.speaker);
    expect(usableEvidence(verified)).toHaveLength(1);
  });

  it("relocates a real quote that was attributed to the wrong line", () => {
    // A clerical slip, not invention: the words exist, the address is wrong.
    // The evidence survives, corrected, and is flagged as such.
    const target = parsed.lines[30];
    const words = target.text.split(/\s+/).slice(0, 8).join(" ");

    const verified = verifyEvidence(parsed, [{ line: "L002", quote: words }]);

    expect(verified[0].status).toBe("relocated");
    expect(verified[0].line).toBe(target.n);
    expect(verified[0].claimedLabel).toBe("L002");
    expect(usableEvidence(verified)).toHaveLength(1);
  });

  it("tolerates curly quotes and dashes that the model normalised to ASCII", () => {
    // Transcripts carry typographic punctuation; models return ASCII. Treating
    // those as different text would reject honest citations.
    const line = parsed.lines.find((l) => /[’“”—]/.test(l.text));
    if (!line) return; // fixture has none; nothing to assert

    const asciiQuote = line.text
      .replace(/[’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/—/g, "-")
      .split(/\s+/)
      .slice(0, 8)
      .join(" ");

    const verified = verifyEvidence(parsed, [{ line: `L${String(line.n).padStart(3, "0")}`, quote: asciiQuote }]);
    expect(["verified", "relocated"]).toContain(verified[0].status);
  });
});

describe("absence is reported, not punished", () => {
  it("does not demand evidence for a behaviour that never occurred", () => {
    // behaviourPresent: false — there is nothing to quote when the behaviour is
    // absent, and demanding a citation would push the model to invent one.
    const integrity = assessIntegrity([], false);

    expect(integrity.level).toBe("ok");
    expect(integrity.message).toBeNull();
  });

  it("still reports dropped citations on an absent behaviour", () => {
    const verified = verifyEvidence(parsed, [
      { line: "L005", quote: "a sentence that was never spoken on this call at all" },
    ]);
    const integrity = assessIntegrity(verified, false);

    expect(integrity.level).toBe("ok");
    expect(integrity.message).toMatch(/could not be found/i);
  });
});

describe("quotes too short to verify are not trusted", () => {
  it("rejects a two-word quote as unverifiable", () => {
    // "Yeah, okay" appears everywhere and proves nothing. Anything under the
    // minimum is treated as unverifiable rather than trivially matched.
    const verified = verifyEvidence(parsed, [{ line: "L003", quote: "yeah okay" }]);
    expect(usableEvidence(verified)).toHaveLength(0);
  });
});
