# Product

## Register

product

## Users

Quality-control reviewers and the coaching lead at a remote coaching business (Halden Method). They sit down with a queue of recorded client calls and need to know, per call, whether the coach did the things that keep clients from churning: built real connection, set expectations, booked the next session, gave the client something concrete to own.

Their context is a long review session, not a glance. They are reading many calls in a row, comparing coaches, and occasionally defending a score back to the coach who received it. The primary task on any screen is: read a judgement, check the evidence behind it, decide whether to accept it.

## Product Purpose

Scores a call transcript against the client's own twelve-dimension rubric (one rubric for kick-off calls, another for coaching calls) and returns a report the coach can act on: the single highest-impact change, a brief, retention red flags, and every dimension with the transcript lines its score rests on.

Success is a reviewer trusting a score without re-reading the call, and being able to verify it in one click when they don't. The system exists to make QC survive scale, so the failure mode that matters most is a confident score with nothing real underneath it.

## Brand Personality

Precise, accountable, unhurried. The voice states what happened and what it rests on. It never hedges to sound safe and never asserts to sound authoritative.

The interface should read as an instrument: a reviewer should feel the numbers were measured, not estimated, and should always be one interaction away from the raw evidence. Confidence comes from showing the working, not from visual polish claiming authority.

## Anti-references

- **Dashboard-by-numbers.** Big hero metric, three supporting stat cards, gradient accent. This is a review tool, not a KPI wall.
- **AI-product cream.** Warm sand/paper/parchment near-white backgrounds with a single muted accent. Currently the saturated default; it also prints badly.
- **Eyebrow scaffolding.** Tiny uppercase tracked labels above every section (`THE ONE THING`, `THE BRIEF`, `RED FLAGS`). The previous build used these on every block, which flattens hierarchy instead of creating it.
- **Marketing-report styling.** Display serifs, wide airy measure, and pull-quote drama applied to what is an internal work surface.
- Anything that makes a score look more certain than its evidence supports.

## Design Principles

1. **The evidence is one click away, always.** Any cited line resolves to the real transcript turn in context. A claim the reviewer cannot check is a claim the interface should not make.
2. **Show the working.** Raw score, active maximum, normalisation, and every cap that fired stay visible. The reviewer can reconstruct the total by hand.
3. **Absence reads differently from failure.** A behaviour that never happened, a dimension that did not apply, and a dimension done badly are three different states and must never share a visual treatment.
4. **Density serves the queue.** Reviewers scan many calls. Rows over cards, tabular numerals, scannable score bars, no decoration between the reviewer and the number.
5. **Measured beats estimated.** Anything computed deterministically (talk share, totals, caps) is labelled as measured, so the reviewer knows which parts of the report a language model never touched.

## Accessibility & Inclusion

- WCAG 2.2 AA. Body text at or above 4.5:1, large text at or above 3:1. Muted gray on tinted near-white is the specific failure to avoid.
- Band and score status must never be carried by colour alone: always pair with the band name or a numeric value.
- Full keyboard operation for expanding dimensions and opening/closing the transcript panel. Visible focus rings, escape closes the panel, focus returns to the trigger.
- `prefers-reduced-motion` respected on every transition, including the transcript panel slide and the score reveal.
