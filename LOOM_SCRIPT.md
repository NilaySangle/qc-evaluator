# Loom script — QC Evaluator

Target: **around 5 minutes**. Webcam on the whole time.

This version is written to be *said*, not read. Short sentences. Plain words.
If a line feels awkward in your mouth, change it — the meaning matters, not
the exact wording.

---

## Before you hit record

**Have these tabs open, in this order, so you never wait on camera:**

1. **Home** — https://qc-evaluator-gold.vercel.app

2. **The 105 proof** — a call that scored 100/100 but really added up to 105
   https://qc-evaluator-gold.vercel.app/runs/011c01f1-f43d-478b-acef-c6025d0904ee

3. **The main report you'll walk through** — Renata's call, 72/100
   https://qc-evaluator-gold.vercel.app/runs/00e1e719-b645-44fc-b12d-e1c64f60cdb4

4. **Coaches page** — https://qc-evaluator-gold.vercel.app/coaches

5. **DECISIONS.md** — open on GitHub or in your editor

6. **Terminal** — sitting in the project folder, ready to type the test command

**Terminal command to have typed but not run yet:**

```
npx vitest run --reporter=verbose
```

**Before you record:** make sure the site is set to the good AI model (Sonnet,
not the cheap one). Close Slack/Mail. Turn off notifications.

**Important thing to know:** if you score the exact same call twice, you can
get a different number both times. That's normal — explained in Part 5. For
now, just don't score the same call twice on camera and expect it to match.
Everything else in this script uses links to reports that are already saved,
so those numbers never change.

---

## COLD OPEN — 0:00 to 0:20

> "Hi, I'm Nilay — this is my submission for the AI developer role.
>
> Let me start with something specific instead of a normal intro. Your
> coaching rubric says it's scored out of 100 points. I added up all twelve
> categories myself. They actually add up to 105.
>
> That's not my app being wrong. That's a mistake sitting in your own
> document. How I handled that mistake is basically what this whole video is
> about. Let me show you."

**Show:** just your face. No screen yet.

---

## PART 1 — The one rule — 0:20 to 0:45

> "Here's the one rule I built everything around: if the AI can't find proof
> for something in the call, it has to say so. It doesn't guess, and it
> doesn't make things up.
>
> Most tools like this will just spit out twelve confident numbers and hope
> they're right. Mine is built to be honest instead. Let me show you how."

**Show:** screen share, home page, for a few seconds. Then move on.

---

## PART 2 — Walking through the app — 0:45 to 2:40

### 2a. Scoring a call live (0:45–1:15)

> "I'll score a real call, right now."

Click a sample transcript → **Score this call**.

> "See that? It gave me a link straight away. The scoring happens on the
> server in the background — not in my browser."

**Close the tab. Reopen the link from your history.**

> "Watch — I just closed the tab completely and came back. It's still
> working. Nothing got lost. And if something ever does break, it tells you
> why instead of just spinning forever."

### 2b. Reading a finished report (1:15–1:50)

Switch to **Renata's report, 72/100**.

> "Here's a finished one. Right at the top: the one thing to fix first. This
> coach scored 5 out of 15 on 'digging into the client's real goal.' Fix
> that one thing, and the score jumps from 72 to 77. That number isn't the
> AI guessing — it's actually recalculated with real math."

Scroll to the caps section.

> "Down here are automatic penalties — hard rules straight from your rubric,
> like 'if the coach talks more than 70% of the call, cap the score.' The app
> enforces these every single time, so it's consistent."

### 2c. The best part — proof, not promises (1:50–2:40)

Expand a dimension.

> "Every score comes with a receipt. Watch."

Click a line reference. The transcript panel opens.

> "I just clicked that little tag, and it jumped straight to the real
> moment in the call it's talking about. You never have to just trust the
> AI — you can check it yourself, in one click. It also exports as a clean
> PDF.
>
> And here's why that receipt can't be faked."

---

## PART 3 — Proving it doesn't lie — 2:40 to 3:50

### 3a. The test that proves it (2:40–3:20)

Switch to the terminal.

> "You said one of the four sample calls is designed to trick a lazy AI into
> making stuff up. Here's how I made sure mine never does.
>
> After the AI scores a call, my code checks every quote it used against the
> real transcript, word for word. If a quote isn't actually there, it gets
> deleted automatically before you ever see it. Let me prove that."

**Run:** `npx vitest run --reporter=verbose`

Let it run. Point at a few lines as they scroll.

> "These are automated checks — 34 of them, running for free, in under a
> second. Look what they say: fake evidence gets rejected. Real evidence
> survives. The AI doesn't get punished for something that genuinely never
> happened in the call. I'm not just telling you it works — I built a test
> that proves it, every time, and anyone can run it themselves."

### 3b. The AI never does math (3:20–3:50)

Back to the report. Scroll to the talk-time cap, then the box at the bottom.

> "One more rule: the AI never does the math. Every score, every percentage,
> every total is calculated by regular code, not the model.
>
> This number — 73.4% — is how much the coach talked, counted directly from
> the transcript. Not estimated, counted. And this box at the bottom shows
> exactly how the final score was built, so anyone can check it by hand."

---

## PART 4 — Judging fairly, and thinking bigger — 3:50 to 4:35

### 4a. Proof of the opening claim (3:50–4:10)

Switch to the **105-proof report**.

> "Remember how I opened — 105, not 100? Here's the receipt. This call
> scored perfectly, and it actually says 105 out of 105 right there, then
> shows it as 100 out of 100. I didn't quietly drop a category to make the
> math work. I just show both numbers, honestly, every single time."

### 4b. Thinking about the whole team (4:10–4:35)

Switch to **/coaches**.

> "One report tells you about one call. But you're running a whole team. So
> I built this page too. It looks across every coach and every call, and
> shows you which specific skill your team is weakest at, overall. Nobody
> asked me to build this — I built it because it's the real problem behind
> the exercise."

---

## PART 5 — Being honest about the rest — 4:35 to 5:00

Switch to **DECISIONS.md**. Leave it still on screen — don't scroll.

> "Two quick things I want to be upfront about.
>
> First — your rubric has a few unclear spots, like that 105-points thing.
> I didn't just guess and move on. I wrote down every assumption I made and
> why, so you can push back on any of it.
>
> Second, and this matters — I tested this by scoring the exact same call
> five separate times. The math parts, like that 73% number, came back
> identical every time. But the AI's actual judgment moved around — same
> call, but sometimes it scored 72, sometimes 56. That's a real limit of
> using AI to judge things, and I'd rather tell you myself than have you
> find it later."

---

## CLOSE — 5:00 to 5:15

Cut back to your face.

> "So — it reads the call, it doesn't make things up, the math is always
> right, and you can check every score yourself. The code and the live link
> are both in the email. Thanks for a genuinely fun problem to work on."

---

## Delivery notes

- **Say it in your own words.** Read this twice, then just talk — don't
  recite it. They're listening to how you think, not how well you memorized
  a script.
- **The two moments that matter most:** the opening (105 vs 100) and running
  the tests live. If you're short on time, everything else can shrink —
  those two, keep full length.
- **Whatever you claim, show it on screen in the same breath.** Don't say
  "it survives closing the tab" — actually close the tab.
- **If you mess up a line, keep talking.** Re-recording a 5-minute video
  because of one stumble is worse than just continuing.

## Do not say

- Don't call the scoring "accurate" or "100% correct." Say it's **honest,
  checkable, and the math is always right** — that's true and it holds up if
  someone pushes back on it.
- Don't score the same transcript twice on camera and expect the same
  number — see Part 5 for why.
- Don't read every word on the home page out loud. Let it sit there while
  you talk about something else.
