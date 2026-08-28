# Decisions & open questions

The brief says: *"These are the decisions we are hiring for. Make them, then
defend them."* and *"In your video, tell us what you would have asked and what
you assumed instead."*

This file is that record. Every ambiguity I hit, the assumption I made, and the
question I would have put to the client if there had been anyone to ask. Where a
decision is enforced by code or a test, the file points to it.

---

## The rubric contradicts itself, and I did not paper over it

### 1. The coaching rubric's dimensions sum to 105, not the 100 it claims

The coaching document opens with *"Twelve dimensions, 100 points"* and *"Total is
100 points when D4 is active, 85 when D4 is off."* But the twelve dimension
maxima are 10+10+15+15+10+15+5+5+5+5+5+5 = **105**. The kick-off rubric sums to
exactly 100, so this is specific to the coaching document, not a house
convention.

**What I would have asked:** "Coaching sums to 105 — is a dimension mis-weighted,
or is 100 a normalised scale?"

**What I assumed:** 100 is the reporting scale. I score raw over the *sum of
active maxima* and normalise to 100. This is the generalisation of the rubric's
own D4 rule (*"the percentage is the raw score over 85. Report the result on the
100 scale"*) — I just apply it to whatever set of dimensions is active rather
than only to the D4-off case. I do **not** silently shave a dimension to force
105→100, because I cannot know which one the client would pick.

The report's audit trail states this openly on every coaching run, and the run
carries `raw / activeMax / normalised` so a reviewer can check the arithmetic by
hand. See `lib/rubric/coaching.ts` (`statedTotalNote`) and the test
*"normalises coaching's 105 raw points onto the 100 scale"* in
`tests/scoring.test.ts`.

### 2. The kick-off rubric announces band scoring, then contradicts it per dimension

The kick-off header says *"Band-based scoring… within a band, any integer
works."* But only **five** of its twelve dimensions actually print a
`| Band | Score |` table with ranges (D1, D3, D5, D10, D12). The other seven
print `| Score |` tables with single discrete values.

**What I assumed:** the per-dimension table is the more specific instruction and
wins over the blanket header — it is the one a human reviewer would actually
score against. So kick-off is a *hybrid*: five range dimensions, seven discrete.
Coaching, by contrast, is uniformly discrete (*"No interpolation"*). Each
dimension declares its own mode in data, and an illegal score (an 8 on a
discrete 10/7/3/0 dimension) is snapped to the nearest legal value with the
correction recorded, never hidden. See `ScoringMode` in `lib/rubric/types.ts`
and the *"illegal scores are snapped"* tests.

### 3. D2 diagnostics and D4 movement coaching don't always apply

Coaching D2 is *"only applicable at weeks 8, 16, 24"* and instructs *"score N/A,
redistribute weight to D3 and D4."* D4 is explicitly optional with a four-part
detection test.

**What I would have asked:** "When D2 is N/A, the rubric says redistribute weight
to D3 and D4 — by what formula?"

**What I assumed:** the redistribution formula is unspecified and inventing one
would smuggle an opinion into the score. So instead of redistributing, I
**re-base the denominator**: a disabled dimension leaves both the numerator and
the maximum, and the percentage is taken over what remains. This is exactly what
the rubric already prescribes for D4-off (out of 85), applied consistently. Both
optional dimensions are driven by an explicit yes/no signal from the first model
pass, not inferred from a low score. See the `applicability` handling in
`lib/scoring/total.ts` and the *"re-bases the denominator"* test.

---

## The trust decisions — where most builds of this will quietly fail

### 4. The model never does arithmetic

Caps, totals, bands, normalisation, and the projected "one thing" score are all
computed in plain TypeScript. The model returns a per-dimension judgement and a
set of yes/no cap verdicts; everything numeric is derived from those by pure
functions. A language model asked to total twelve dimensions and apply four caps
will produce a plausible number that does not reconcile with the parts printed
beside it. Ours always reconciles because it is the same arithmetic a reviewer
would do.

### 5. Talk-share caps are measured, not judged

Both rubrics cap the total on how much the coach speaks (">75%", ">70%"). A cap
that removes 20-25 points cannot rest on a model's guess at a percentage. It is
counted from the word totals of the parsed transcript. If the coach cannot be
identified, the cap is **skipped** rather than fired on an unresolved name — a
20-point penalty should never rest on a guess. See `coachTalkShare` and the
deterministic-cap tests.

### 6. "It does not guess" is enforced, not promised

The brief's hardest requirement — *"when a behaviour is not in the transcript,
the dimension says so. It does not guess and it does not read the mood"* — and
its warning that *"one transcript exists to catch a system that guesses"* are
answered by two mechanisms, neither of which is a second model call:

- **`behaviour_present` is separate from the score.** "Did badly" and "no
  evidence either way" stop being the same number. When a behaviour is absent
  the report says so plainly and does not imply it was observed.
- **Every citation is verified against the transcript.** A model inventing
  support for a score has to invent words, and invented words are not in the
  transcript — an instant string check. Fabricated quotes are dropped; a real
  quote attributed to the wrong line is *relocated* (a clerical slip, not
  invention) and flagged. A dimension whose every citation was fabricated is
  marked **unsupported** in the report rather than presented with false
  confidence.

This is deliberately not framed as "detect the trap transcript." I do not know
which of the four it is, and I do not need to: the defence is mechanical and
fires the same way on all four. `tests/hallucination.test.ts` feeds the verifier
the kind of fluent, on-theme, entirely-invented citation a guessing model
actually produces and proves it never reaches the report.

---

## Architecture decisions

### 7. 65k characters: split the rubric, not the transcript

The obvious reflex on a large transcript is to chunk it. I don't. 65k characters
is ~16k tokens and fits comfortably in context, and several dimensions are
defined over the *whole* call ("no connection to long-term vision **at any
point**", "no follow-up questions **anywhere**"). A model shown one slice would
report an absence it cannot actually see. So every scoring call receives the
complete numbered transcript, and I split the *twelve dimensions* across four
parallel calls instead. The repeated transcript is paid for once via prompt
caching, not by cutting the evidence.

### 8. Background jobs: `after()` + a heartbeat, not a queue

The run must *"survive the tab closing"* and *"a failed run says why."* The API
route creates the run row, returns immediately, and finishes scoring in Next's
`after()`. Progress and a heartbeat timestamp are written to the database, so the
run URL is the single source of truth for anyone who opens it — now or next week.
A run whose worker was killed is detected from a stale heartbeat and reported as
failed rather than spinning forever.

**What I would have asked:** "What's the expected call volume?" A durable queue
(QStash, Inngest) is the right answer at real volume and is the first thing I'd
add past this exercise. At four transcripts it would be a dependency, a webhook,
and a second home for secrets, bought for reliability a heartbeat already
provides. I chose the smaller machine and wrote down why.

### 9. Structured output: forced tool calls, re-validated with Zod

The model's output shape is enforced by the tool schema and then re-checked with
Zod on arrival. The model can be wrong about the call; it cannot be wrong about
the shape, and if it is, the run fails loudly instead of half-parsing. An
isolated malformed tool call is retried, because the other three concurrent
calls with identical instructions routinely succeed — a formatting hiccup, not a
scoring disagreement.

### 10. PDF: server-rendered, not a browser print dialog

`@react-pdf/renderer` on the server produces the same document every time, from
the same data the page renders. A browser print dialog would hand the coach
whatever their page happened to look like — margins, cut-off rows, missing
backgrounds. The PDF layout is not the web page shrunk: screen affordances are
gone and evidence is always expanded, because paper has no disclosure triangle.

### 11. Database: normalised tables, not one JSON blob

Dimensions and evidence are their own tables. A blob would be marginally faster
to read and considerably lazier. Rows mean the question this system exists to
answer *at scale* — which coach loses points where, across every call — is a
`GROUP BY`, not a schema rewrite. The `/coaches` view is the first proof of that
seam. Transcripts live in their own table so listing runs never drags megabytes
of call text along.

### 12. Security: service-role only, no browser-side database key

There is deliberately no `NEXT_PUBLIC_` Supabase key. Every read and write goes
through a server route, RLS is on with no permissive policy, and the anon key is
never wired up. A transcript is a recording of a real client conversation; it
should not be one guessed UUID away from being public.

---

## Known limitations (honest partial beats a missed deadline)

- **The reproducibility caveat.** Sonnet 5 no longer accepts a `temperature`
  parameter, so the *judgement* layer is not bit-reproducible. The
  *deterministic* layer (everything numeric) is, and `tests/scoring.test.ts`
  proves it. I'd close the remaining gap with a small self-consistency pass
  (score twice, flag dimensions that disagree) — not built, to respect scope.
- **No auth.** The app assumes a trusted internal operator. Fine for the stated
  surface; a real deployment needs login.
- **Deterministic caps only for talk share.** The other cap conditions genuinely
  require reading comprehension, so they are model-judged with evidence, and the
  arithmetic they trigger still happens in code.
