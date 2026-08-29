# Loom script — QC Evaluator

Target: **5:30**. Webcam on throughout (required by the brief).

The brief says they are reading *"how you move when nobody answers."* So this is
not a feature tour. It is an argument, with the product as evidence.

---

## Before you hit record

**Tabs, in this order** (so you never wait on camera):

1. **Home** — https://qc-evaluator-gold.vercel.app

2. **The 105 proof** — Malik Osei, coaching, **100/100 but raw 105/105**
   https://qc-evaluator-gold.vercel.app/runs/011c01f1-f43d-478b-acef-c6025d0904ee

3. **The rich report** — Renata, kick-off, **72/100, 3 caps fired**
   https://qc-evaluator-gold.vercel.app/runs/00e1e719-b645-44fc-b12d-e1c64f60cdb4

4. **Coaches** — https://qc-evaluator-gold.vercel.app/coaches

5. Editor with `DECISIONS.md` open

6. Terminal, cwd = repo, ready to run the verbose test command

**Spare, if you want a longer cut later:** Hannah Vogel (coaching, 98/100, raw
78/80 — optional dimensions switched off) and Owen Brandt (kick-off, 98/100
ELITE) are both good extra proof points but cut from this timing to keep the
video tight. Their run URLs are in git history of this file if you want them
back.

**Terminal command to have typed but not run:**

```
npx vitest run --reporter=verbose
```

**Checks:** production is on Sonnet 5. Notifications off. Close mail/Slack.
Do the one live scoring run on `kickoff-02` (smallest, cheapest).

**Do not** score the same transcript twice on camera. See "Do not" below.

---

## COLD OPEN — 0:00 to 0:25

> "Hi, I'm Nilay — this is my submission for the AI developer exercise.
>
> I want to start with something specific rather than an introduction: your
> coaching rubric says twelve dimensions, one hundred points. I added up the
> twelve dimensions in your own table. It's a hundred and five — not my tool's
> output, your source document. And my tool doesn't silently paper over that.
> It normalises to a hundred and shows you both numbers, so the gap is visible
> instead of hidden.
>
> That's the whole exercise in one example. Everyone building this gets a
> working app. What I think you're actually asking is what happens when the
> brief and the reality disagree, and nobody's there to ask. So let me show you
> where else that happened, and what I did."

**Show:** webcam full screen. Say it straight to camera. No screen share yet.

*Why this works: the name and context land in the first breath. The hook now
resolves itself in the same breath too — "not my tool's output, your source
document" — so nobody watching wonders for five minutes whether your app is
broken. It proves you read the rubric closely AND that you fixed what you
found, both in twenty-five seconds.*

---

## ACT 1 — The thesis — 0:25 to 0:50

> "One line in your brief drove every decision here: *when a behaviour is not in
> the transcript, the dimension says so — it does not guess and it does not read
> the mood.* The easy version of this product is a model that confidently emits
> twelve numbers and looks identical on the surface. The difference is what
> happens when it's wrong. Let me show you."

**Show:** share screen, home page, for about 5 seconds — then straight into
scoring a call. Don't linger, don't read the rail aloud.

---

## ACT 2 — The product — 0:50 to 2:50

### 2a. Async run (0:50–1:20)

> "I'll score a kick-off call."

Click `kickoff-02` → **Score this call**.

> "Straight to its own URL — scoring runs on the server, not my browser."

**Close the tab. Reopen the URL from history.**

> "Closed the tab, came back — still running. Runs are a row in Postgres before
> any model call happens, so a dead worker gets caught by a heartbeat and the
> page tells you it died. Nothing here spins forever."

*Worth doing live. Closing the tab on camera beats describing it.*

### 2b. The report (1:20–1:55)

Switch to **Renata kick-off, 72/100**.

> "A finished report, ordered the way it's used. The single change worth making,
> first — Goal Alignment scored five of fifteen; at ten, the call scores
> seventy-seven. That's recomputed arithmetic through the same caps as the real
> total, never the model guessing a new number."

Scroll: brief → gauge → caps.

> "Three caps fired. This one's styled differently — the condition held, but the
> call already scored below that ceiling, so it cost nothing. A cap that fired
> and a cap that actually cost points are different facts."

### 2c. THE MOMENT — evidence (1:55–2:50)

Expand a dimension with citations.

> "Every score cites transcript lines. Watch."

**Click a cited line reference.** Panel slides in.

> "The real transcript, scrolled to that exact turn, with context either side.
> 'Grounded in evidence' isn't a claim in a README — you check it in one click.
> It also exports as a PDF for the coach, same data, same guarantee.
>
> And here's why that citation can't be faked."

---

## ACT 3 — The proof — 2:50 to 4:10

### 3a. The guess-catcher (2:50–3:40)

Switch to terminal.

> "Your brief warned that one of the four transcripts exists to catch a system
> that guesses. My defence doesn't try to work out which one it is. It doesn't
> need to.
>
> After the model scores, plain code checks every quote against the real
> transcript. A model inventing support for a score has to invent words, and
> invented words aren't in the file. That's a string comparison: instant, free,
> and provably right. Fabricated quotes are deleted before you ever see them,
> and the dimension is marked unsupported rather than shown with false
> confidence."

**Run:** `npx vitest run --reporter=verbose`

Let it scroll. Then point at the names.

> "Thirty-four tests, no API key needed. And read the names, because they're the
> argument: *fabricated evidence is rejected. Genuine evidence survives. Absence
> is reported, not punished. Talk share is counted, not estimated. Role
> resolution refuses invented names.* And at the bottom: *produces
> byte-identical totals across repeated runs.*
>
> You can clone the repo and run that in ten seconds."

### 3b. No arithmetic by the model (3:40–4:10)

Back to the report. Scroll to the talk-share cap, then the audit box.

> "Second rule: the model never does maths — totals, bands, caps, normalisation
> are all TypeScript. This cap fired because the coach spoke 73.4% of the words,
> counted from the transcript, not estimated by a model. And this box shows the
> whole derivation, so a reviewer can redo the total by hand and check me."

---

## ACT 4 — Judgment — 4:10 to 4:55

### 4a. Proving the opening claim (4:10–4:35)

Switch to **Malik Osei, 100/100**.

> "Remember the opening — a hundred and five, not a hundred. Here's the receipt:
> this call scored perfectly, raw one hundred and five out of one hundred and
> five, reported as a hundred out of a hundred. I didn't pick a dimension to
> quietly shave — it normalises over the true maximum and shows both numbers,
> on every coaching report. Not a claim you take on faith."

### 4b. The coaches view (4:35–4:55)

Switch to **/coaches**.

> "One report is QC on one call. Your actual problem is quality across coaches,
> at volume — so this aggregates every scored call: which coach, which rubric
> dimension the team is leaking the most points on. It's a database query over
> the same rows the report writes. Nobody asked for this page — it came from
> thinking about what a coaching business needs, not what the ticket said."

---

## ACT 5 — What I'd have asked, and what's missing — 4:55 to 5:20

> "Two real questions I'd have asked, given someone to ask. Coaching sums to a
> hundred and five — is a dimension mis-weighted, or is a hundred a normalised
> scale? I assumed normalised. And when a dimension is N/A, the rubric says
> redistribute the weight but not how — inventing a formula would smuggle my
> opinion into your score, so I re-based the denominator instead. Both are
> written up in DECISIONS.md, with the reasoning.
>
> Two honest limits: the judgment layer is one model's reading — grounded and
> cited, but not infallible, and there's no ground truth to check it against.
> What I can prove is the arithmetic and that every quote is real. And I'd want
> a self-consistency pass, score twice and flag disagreement, before trusting
> this unsupervised. Not built, for scope."

Show `DECISIONS.md` for a second or two while you say this — don't stop to scroll.

---

## CLOSE — 5:20 to 5:35

> "It reads the call, refuses to guess, does the maths in code, and shows you
> the line behind every number. Repo and live link are in the email. Thanks for
> a genuinely good exercise — happy to go deeper on any of it."

Webcam full screen for the last line.

---

## Delivery notes

- **Say it in your own words.** Read this twice, then talk. Reciting sounds
  wooden, and they're reading your judgment, not your diction.
- **The two beats that win it:** the cold open (0:00) and the verbose test run
  (~2:50). Everything else can compress further if you're still running long —
  those two, don't touch.
- **Every claim, prove on screen in the same breath.** Don't say "it survives the
  tab closing" — close the tab.
- **Pace:** slow down on the cold open and on the two questions in Act 5. Speed
  up through the product tour; they can see it.
- **If you fluff a line, keep going.** One retake of a 5-minute video is worse
  than one stumble.

## Do not

- Do not re-score the same transcript twice on camera. The judgment layer is
  probabilistic; two runs of the same call can land a few points apart, and
  that's a conversation for Act 5, not a live surprise.
- Do not claim the scoring is "accurate" or "correct." Claim it is **evidenced,
  deterministic in its arithmetic, and honest about absence**. That's defensible
  under questioning; "accurate" is not.
- Do not read the rail on the home page aloud. Let it sit on screen.
