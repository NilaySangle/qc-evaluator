import { after, NextResponse } from "next/server";
import { isCallType } from "@/lib/rubric";
import { parseTranscript, validateTranscript } from "@/lib/transcript";
import { completeRun, createRun, failRun, markRunning, updateProgress } from "@/lib/db";
import { describeFailure, runEvaluation } from "@/lib/scoring/pipeline";

/**
 * Create a run and start scoring it.
 *
 * The requirement is that the operator can close the tab. So the response is
 * sent as soon as the run row exists, and the work continues in `after()`,
 * which keeps the serverless invocation alive past the response. Progress is
 * written to the database, not held in memory, so the run URL is the single
 * source of truth for anyone who opens it — the operator, a colleague they send
 * it to, or the same person next week.
 *
 * The alternative was a durable queue (QStash, Inngest). It is the right answer
 * at real volume and it is the first thing I would add. At this size it buys
 * reliability we can get from a heartbeat and costs a dependency, a webhook
 * endpoint and a second place for secrets to live.
 */

// The largest fixture is 65 kB and takes four parallel scoring calls. Vercel's
// Hobby tier caps this at 60s regardless; when that bites, the heartbeat in
// `runs` marks the run dead and the page says so rather than spinning.
export const maxDuration = 300;

const MAX_TRANSCRIPT_CHARS = 200_000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { callType, transcript } = (body ?? {}) as {
    callType?: unknown;
    transcript?: unknown;
  };

  if (!isCallType(callType)) {
    return NextResponse.json(
      { error: "callType must be \"kickoff\" or \"coaching\"." },
      { status: 400 },
    );
  }
  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return NextResponse.json({ error: "Paste a transcript to score." }, { status: 400 });
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      {
        error: `That transcript is ${transcript.length.toLocaleString()} characters. The limit is ${MAX_TRANSCRIPT_CHARS.toLocaleString()}.`,
      },
      { status: 413 },
    );
  }

  // Validate before creating a run. A transcript that cannot be scored should
  // produce an error in the paste box, not a failed run to go and look at.
  const parsed = parseTranscript(transcript);
  const problem = validateTranscript(parsed);
  if (problem) {
    return NextResponse.json({ error: problem.message, code: problem.code }, { status: 422 });
  }

  let runId: string;
  try {
    runId = await createRun(callType, transcript, {
      chars: parsed.totalChars,
      turns: parsed.lines.length,
      words: parsed.totalWords,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create the run." },
      { status: 500 },
    );
  }

  after(async () => {
    try {
      await markRunning(runId);
      const report = await runEvaluation({
        callType,
        transcript,
        onProgress: (p) => updateProgress(runId, p),
      });
      await completeRun(runId, report);
    } catch (err) {
      const { code, message } = describeFailure(err);
      try {
        await failRun(runId, code, message);
      } catch {
        // If we cannot even record the failure, the heartbeat going stale is
        // what the run page falls back on.
      }
    }
  });

  return NextResponse.json({ runId, url: `/runs/${runId}` }, { status: 202 });
}
