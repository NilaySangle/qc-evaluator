# Loom script — QC Evaluator

Target: **7 minutes**. Webcam on throughout (required by the brief).

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

4. **Optional dimensions off** — Hannah Vogel, coaching, **98/100, raw 78/80**
   https://qc-evaluator-gold.vercel.app/runs/687975a2-20ee-4dd2-a2d0-4f3db48ad2b2

5. **The good-call contrast** (optional) — Owen Brandt, kick-off, **98/100 ELITE**
   https://qc-evaluator-gold.vercel.app/runs/7e980384-c379-4abc-8f51-809a8a0edabf

6. **Coaches** — https://qc-evaluator-gold.vercel.app/coaches

7. Editor with `DECISIONS.md` open

8. Terminal, cwd = repo, ready to run the verbose test command

**Terminal command to have typed but not run:**

```
npx vitest run --reporter=verbose
```

**Checks:** production is on Sonnet 5. Notifications off. Close mail/Slack.
Do the one live scoring run on `kickoff-02` (smallest, cheapest).

**Do not** score the same transcript twice on camera. See "Honesty" below.

---

## COLD OPEN — 0:00 to 0:20

> "Your coaching rubric says twelve dimensions, one hundred points.
>
> I added the twelve dimensions up. It's a hundred and five.
>
> I want to start there, because that gap is the whole exercise. Everyone
> building this will get a working app. What I think you're actually asking is
> what happens when the brief and the reality disagree, and nobody's there to
> ask. So let me show you the three places that happened, and what I did."

**Show:** webcam full screen. Say it straight to camera. No screen share yet.

*Why this works: it opens with something they may not know about their own
document. It proves you read, not skimmed. Nobody else opens like this.*

---

## ACT 1 — The thesis — 0:20 to 1:00

> "One line in your brief drove every decision I made: *when a behaviour is not
> in the transcript, the dimension says so, it does not guess and it does not
> read the mood.*
>
> That's a hard requirement, because the easy version of this product is a
> language model that reads a call and confidently emits twelve numbers. It
> would look identical to mine on the surface. The difference is what happens
> when it's wrong.
>
> So I built it so the model does the reading, and code does everything the
> model shouldn't be trusted with. Let me show you."

**Show:** share screen, home page. Let the "What this does differently" rail sit
on screen while you talk. Don't read it aloud.

---

## ACT 2 — The product — 1:00 to 3:30

### 2a. Async run (1:00–1:40)

> "I'll score a kick-off call."

Click `kickoff-02` → **Score this call**.

> "Straight to its own URL. The scoring is on the server, not in my browser."

**Close the tab. Reopen the URL from history.**

> "I just closed the tab and came back. The run kept going. That was a stated
> requirement, and it's why runs are a row in Postgres before any model call
> happens. If the worker dies, a heartbeat catches it and the page tells you it
> died. Nothing here spins forever."

*This beat is worth doing live. Closing the tab on camera is more convincing than
describing it.*

### 2b. The report (1:40–2:20)

Switch to **Renata kick-off, 72/100**.

> "Here's a finished one. It's ordered the way a reviewer uses it, not the way
> it was computed.
>
> The single change worth making, first. And this bit matters — Goal Alignment
> scored five out of fifteen; at ten, the call scores seventy-seven. That
> projection is recomputed arithmetic, through the same caps as the real total.
> I never ask the model what the new score would be, because it would give me a
> plausible number that doesn't reconcile with the twelve numbers printed next
> to it."

Scroll: brief → gauge → caps.

> "Three caps fired here. And notice this one is styled differently: the
> condition holds, but the call had already scored below that ceiling, so it
> removed no points. A cap that fired and a cap that actually cost you are
> different facts, and flattening them would overstate the penalty."

### 2c. THE MOMENT — evidence (2:20–3:10)

Expand a dimension with citations.

> "Every score cites transcript lines. Watch this."

**Click a cited line reference.** Panel slides in.

> "That's the real transcript, scrolled to that exact turn, with the lines
> either side for context. So 'every score is grounded in evidence' isn't
> something you take on faith in a README. You check it in one click, which is
> the reviewer's actual job.
>
> And here's the part that makes it real rather than decorative."

### 2d. PDF (3:10–3:30)

Click **PDF**.

> "Server-rendered, not a browser print dialog, so every coach gets the same
> document. Evidence is expanded by default here, because paper has no
> disclosure triangle."

---

## ACT 3 — The proof — 3:30 to 5:00

### 3a. The guess-catcher (3:30–4:20)

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

### 3b. No arithmetic by the model (4:20–5:00)

Back to the report. Scroll to the talk-share cap, then the audit box.

> "Second rule: the model never does maths. Totals, bands, caps, normalisation
> are all TypeScript.
>
> This cap fired because the coach spoke 73.4% of the words. That's counted from
> the transcript. If I'd asked a language model to estimate a percentage it
> would have given me a confident number with nothing underneath it, and that
> number silently removes twenty points.
>
> And this box shows the whole derivation — raw score, active maximum,
> normalised, every cap. A reviewer can redo the total by hand and check me."

---

## ACT 4 — Judgment — 5:00 to 6:15

### 4a. Back to the 105 (5:00–5:40)

Switch to **Malik Osei, 100/100**.

> "Back to where I started. Here's a coaching call that scored perfectly. Look
> at the raw number: a hundred and five out of a hundred and five, reported as a
> hundred out of a hundred.
>
> I didn't silently shave a dimension to force it to add up, because I can't
> know which one you'd pick. I normalise over the active dimensions and show you
> both numbers, so the discrepancy is visible instead of hidden."

Switch to **Hannah Vogel, 98/100 (raw 78/80)**.

> "Same machinery here. This call had no movement coaching and wasn't a
> diagnostics milestone, so two dimensions switched off rather than scoring
> zero. Out of eighty, not a hundred and five. A dimension that had no chance to
> happen is not a dimension the coach failed."

### 4b. The coaches view (5:40–6:15)

Switch to **/coaches**.

> "One report is QC on one call. Your actual problem is quality across coaches,
> at volume.
>
> So this aggregates every scored call: which coach, and which specific rubric
> dimension the whole team is leaking the most points on. Right now it's Goal
> Alignment on kick-off calls, minus eight on average across five calls.
>
> That's a database query over the same rows the report writes, which is why I
> stored dimensions as rows rather than a JSON blob. Nobody asked for this page.
> It came from thinking about what a coaching business needs rather than what
> the ticket said."

---

## ACT 5 — What I'd have asked, and what's missing — 6:15 to 7:00

> "You asked what I'd have asked if there were someone to ask. Three real ones.
>
> One: coaching sums to a hundred and five. Is a dimension mis-weighted, or is a
> hundred a normalised scale? I assumed normalised.
>
> Two: when a dimension is N/A, your rubric says redistribute the weight, but
> not how. Inventing a formula would smuggle my opinion into your score, so I
> re-based the denominator instead.
>
> Three: what's the real call volume? That decides whether background jobs need
> a durable queue. At four transcripts a heartbeat is enough. At a hundred a day
> I'd add QStash or Inngest, and that's the first thing I'd build next.
>
> All of it's written up in DECISIONS.md, with the assumption and the reasoning."

Show `DECISIONS.md` briefly.

> "Two honest limitations. This is a few hours of work, so the judgment layer is
> one model's reading of your rubric — it's grounded and it's cited, but it's not
> infallible, and I have no ground truth to validate it against because none was
> provided. What I can prove is the arithmetic, and that every quote is real.
>
> And second, I'd want a self-consistency pass before trusting this unsupervised:
> score twice, flag the dimensions that disagree. Not built, because scope."

---

## CLOSE — 7:00 to 7:20

> "So: it reads the call, it refuses to guess, it does the maths in code, and it
> shows you the line behind every number.
>
> Repo and live link are in the email. Thanks for a genuinely good exercise — the
> ambiguities in that rubric were the most interesting part.
>
> Happy to go deeper on any of it."

Webcam full screen for the last line.

---

## Delivery notes

- **Say it in your own words.** Read this twice, then talk. Reciting sounds
  wooden, and they're reading your judgment, not your diction.
- **The two beats that win it:** the cold open (0:00) and the verbose test run
  (3:30). If you're running long, cut Act 2d (PDF) and shorten 4b, never those.
- **Every claim, prove on screen in the same breath.** Don't say "it survives the
  tab closing" — close the tab.
- **Pace:** slow down on the cold open and on the three questions. Speed up
  through the product tour; they can see it.
- **If you fluff a line, keep going.** One retake of a 7-minute video is worse
  than one stumble.

## Do not

- Do not re-score the same transcript twice on camera. The judgment layer is
  probabilistic; two runs of the same call can land a few points apart, and
  that's a conversation for Act 5, not a live surprise.
- Do not claim the scoring is "accurate" or "correct." Claim it is **evidenced,
  deterministic in its arithmetic, and honest about absence**. That's defensible
  under questioning; "accurate" is not.
- Do not read the rail on the home page aloud. Let it sit on screen.
