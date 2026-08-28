import { NextResponse } from "next/server";
import { getTranscript } from "@/lib/db";
import { parseTranscript } from "@/lib/transcript";

/**
 * The transcript behind a run, addressed the same way the model saw it.
 *
 * Fetched on demand rather than shipped with the report: the largest fixture is
 * 65 kB, and most reports are read without anyone opening the transcript. The
 * reviewer who does want to check a citation pays for it once, then the panel
 * holds it for the rest of the session.
 *
 * Line numbers here are produced by the same parser the pipeline used, so L047
 * in the report and L047 in this payload are guaranteed to be the same turn.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not a valid run id." }, { status: 400 });
  }

  let raw: string | null;
  try {
    raw = await getTranscript(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load the transcript." },
      { status: 500 },
    );
  }

  if (!raw) {
    return NextResponse.json({ error: "No transcript stored for that run." }, { status: 404 });
  }

  const parsed = parseTranscript(raw);

  return NextResponse.json(
    {
      lines: parsed.lines.map((l) => ({ n: l.n, speaker: l.speaker, text: l.text })),
      speakers: parsed.speakers.map((s) => ({
        speaker: s.speaker,
        turns: s.turns,
        words: s.words,
        share: s.share,
      })),
      totalWords: parsed.totalWords,
    },
    // The transcript of a finished run never changes.
    { headers: { "cache-control": "private, max-age=3600" } },
  );
}
