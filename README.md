# QC Evaluator

Scores a coaching or kick-off call transcript against the rubric it was written
for, and returns the report a coach reads: the one change worth making, a brief,
red flags, and twelve dimensions each carrying the transcript lines its score
rests on.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the three values
npm run dev
```

`.env.local` needs:

- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — from the Supabase project
  settings. Apply `supabase/schema.sql` in the SQL editor once before first run.

Four sample transcripts are on the home page. Paste your own as one speaking
turn per line: `[Speaker Name]: what they said`.

```bash
npm test        # 34 tests, no API key needed — deterministic arithmetic +
                 # the citation verifier, proved against fabricated quotes
```

`DECISIONS.md` records every ambiguity in the client's rubric, the assumption
made, and the question that would have been asked if there were someone to
ask.

## How a score is produced

Four stages, in order:

1. **Identify** — one small model call names the participants and decides
   whether the optional dimensions apply. It also writes the transcript into the
   prompt cache the next four calls read.
2. **Score** — four calls in parallel, three dimensions each. Every call holds
   the *entire* numbered transcript, because several dimensions are defined over
   the whole call ("no vision connection anywhere"). Only the rubric is split.
3. **Verify** — no model. Every quote the model returned is checked against the
   line it cited; anything not found in the transcript is dropped. Caps are
   applied and the total is computed in plain TypeScript.
4. **Narrate** — one call, given the finished numbers. It describes them and
   cannot change them, so the brief can never contradict the score beside it.

The model never does arithmetic. Talk-share caps are counted from word totals;
the "one thing" names a dimension and target score, and the projected total is
recomputed through the same caps.

## The two rubrics

Transcribed by hand from the source markdown into reviewed TypeScript
(`lib/rubric/`), checked by a structural audit (`auditAllRubrics`). Three things
the code has to respect that the markdown cannot express:

- **Kick-off is hybrid.** Its header says band-based, but seven of twelve
  dimensions print single-value tables. Each dimension follows the table it was
  actually given; discrete dimensions reject interpolated scores.
- **Coaching forbids interpolation.** All twelve are discrete. A model score
  that is not a listed bucket value is snapped to the nearest legal one, and the
  correction is recorded on the run.
- **Coaching's maxima sum to 105, not the 100 it claims.** Scores are normalised
  over the sum of *active* dimension maxima and reported on the 100 scale — the
  generalisation of the rubric's own D4-disabled rule. See `statedTotalNote`.

Two coaching dimensions switch off rather than scoring zero when they had no
opportunity to occur (D4 with no live movement coaching, D2 on a non-milestone
call with no diagnostics). The rubric calls this "N/A — redistribute weight, do
not penalize the coach"; normalising over the remaining active dimensions *is*
that redistribution.

## Persistence and durability

A run is created in Supabase before scoring starts, work continues server-side
via `after()`, and progress is written to the database — so the operator can
close the tab and the run URL is durable and shareable. A worker killed by a
function timeout is detected from a stale heartbeat and reported as failed, so
no run spins forever.

Dimensions and evidence are normalised into their own tables rather than a JSON
blob, which leaves the door open for the coach-level aggregate ("which dimension
does the team lose most points on?") without a schema rewrite. Every table has
RLS on with no policy; all access is server-side through the service role key,
and no anon key is wired to the browser.

## Evidence, one click away

Every cited line in a report (`L045`) is a button. Clicking it opens the real
transcript in a side panel, scrolled and highlighted to that exact turn with
the lines either side of it for context. The claim "every score is grounded in
a real quote" is otherwise just a sentence; this is what makes it checkable in
one interaction instead of trusted on faith.

## Across every call: `/coaches`

One report is QC. Twelve dimensions summed across every scored call is the
business question — which coach is losing points, and on what. `/coaches` is a
`GROUP BY` over the same `run_dimensions` rows the report writes: per-coach
averages, band mix, and the dimensions the whole team leaks the most points on.
This is the reason dimensions and evidence are stored as rows rather than a
JSON blob on the run.

## Layout

```
lib/rubric/         the two rubrics as reviewed data, plus the structural audit
lib/transcript.ts   parsing, line addressing, talk-share (the model never sees a %)
lib/scoring/        client (prompt caching), prompts, schema, verify, total, pipeline
lib/pdf/            server-rendered coach-facing PDF
lib/aggregate.ts    the /coaches GROUP BY
lib/db.ts           Supabase persistence and report reassembly
app/                home (paste), /runs/[id] (live + report), /coaches, api routes
components/         report UI, transcript panel, dimension rows
tests/               hallucination, scoring-determinism, transcript-parsing (npm test)
supabase/schema.sql
```

## Deploying

1. Push to GitHub, import into Vercel.
2. Set the three env vars from `.env.example` in the Vercel project settings.
3. Apply `supabase/schema.sql` in the Supabase SQL editor once.
4. On Vercel's Hobby tier, serverless functions cap at 60s regardless of
   `maxDuration` in code. A run that exceeds it is caught by the heartbeat
   check and reported as failed rather than left spinning — see
   `HEARTBEAT_TIMEOUT_MS` in `lib/db.ts`. A durable queue (QStash, Inngest) is
   the fix at real volume; noted in `DECISIONS.md` as the first thing past this
   exercise's scope.
