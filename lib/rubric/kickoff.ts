import type { Rubric } from "./types";

/**
 * Kick-off call rubric — transcribed from fixtures/rubrics/kickoff-call-rubric.md.
 *
 * The header announces band-based scoring for the whole document, but the
 * dimension tables disagree with it. Five dimensions print
 * `| Band | Score | Criteria |` with ranges (D1, D3, D5, D10, D12); the other
 * seven print `| Score | Criteria |` with single values. We follow the table
 * that was written for each dimension, because that is the more specific
 * statement and it is the one a human reviewer would actually score against.
 *
 * Unlike coaching, the twelve maxima here sum to exactly 100.
 */
export const kickoffRubric: Rubric = {
  callType: "kickoff",
  title: "Kick-off call",
  version: "kickoff-2026-08-27",
  statedTotal: 100,
  scoringNote:
    "Band-based scoring. Each dimension's score must fall inside one of the bands listed in its table. Within a band, any integer works (or a half step where the dimension's max is 5 or less) depending on how close the call sits to the next band up. A call that clearly exceeds the Mid criteria but does not fully meet Elite belongs in the Strong band. Rounding down to Mid needs a stated reason. Where a dimension's table lists single values rather than bands, those values are the only legal scores.",
  intro:
    "Every score is grounded in direct transcript evidence: specific moments, quotes, or observable behaviours. Never score from assumptions or general impressions. If a behaviour is not verifiable in the transcript, score conservatively. Scope is transcript only, all twelve dimensions active. D7 and D12 are scored on what is communicated during the call, not on whether the follow-up actually landed afterwards.",

  caps: [
    {
      id: "no_followup_questions",
      condition: "No follow-up questions anywhere in the call",
      effect: { kind: "total_max", value: 70 },
      detection: "model",
      owner: "D8",
      question:
        "Did the coach ask NO follow-up questions anywhere in the call? A follow-up question digs into an answer the client just gave. true = none anywhere (cap fires).",
    },
    {
      id: "coach_talk_over_70",
      condition: "Coach speaks >70% of the time without client engagement",
      effect: { kind: "total_max", value: 80 },
      detection: "deterministic",
      threshold: { metric: "coach_talk_share", gt: 0.7 },
    },
    {
      id: "client_unresolved_confusion",
      condition: "Client shows unresolved confusion at any point",
      effect: { kind: "total_max", value: 75 },
      detection: "model",
      owner: "D9",
      question:
        "Did the client show confusion at any point that was left UNRESOLVED by the end of the call? true = unresolved confusion (cap fires). Confusion that the coach then cleared up does not fire it.",
    },
    {
      id: "no_north_star",
      condition: "No North Star statement constructed",
      effect: { kind: "dimension_max", target: "D4", value: 10 },
      detection: "model",
      owner: "D4",
      question:
        "Was NO North Star statement constructed? A North Star reflects the client's deeper identity-level goal back to them (\"What I hear you saying is you want to be...\"). true = none constructed (cap fires).",
    },
    {
      id: "no_structured_recap",
      condition: "No structured recap at the close (D11 dimension-level cap)",
      effect: { kind: "dimension_max", target: "D11", value: 3 },
      detection: "model",
      owner: "D11",
      question:
        "Did the close lack a STRUCTURED recap (an explicit summary of what the call covered)? true = no structured recap (cap fires).",
    },
  ],

  bands: [
    {
      name: "ELITE",
      min: 90,
      max: 100,
      description: "Deep + clear + client confirms. Coach builds real human relationship, not just process.",
    },
    {
      name: "STRONG",
      min: 80,
      max: 89,
      description: "Clear and useful but lacks emotional depth or consistent reinforcement.",
    },
    {
      name: "INCONSISTENT",
      min: 70,
      max: 79,
      description: "Technically correct but generic or surface-level in key areas.",
    },
    {
      name: "AT RISK",
      min: 60,
      max: 69,
      description: "Weak client experience. Client may be doubting the program.",
    },
    { name: "FAIL", min: 0, max: 59, description: "Missed core elements, major retention risk." },
  ],

  principles: [
    "Every score is based on 3 things: depth (how far the coach goes), clarity (how well it lands), and client response (did it actually land).",
    "If it doesn't land it cannot score elite. A perfect explanation that the client didn't confirm is not elite.",
    "Quote-first rationale. Every rationale must begin with a direct or paraphrased reference to something that happened in the transcript. Never score from impressions.",
    "Conservative on missing evidence — within the band. If a behavior cannot be verified, score in the lower tier of the band the call belongs to. This is NOT a license to drop into a lower band entirely.",
    "The four-sentiment test: would the client leave feeling 'this coach gets me' / 'I know exactly what to do next' / 'I trust this process' / 'I'm excited to start'? Not merely 'that was informative'.",
    "The most common failure mode is collapsing borderline cases into the Mid bucket. The Strong band exists precisely for them.",
  ],

  dimensions: [
    {
      id: "D1",
      n: 1,
      name: "Pre-Call Preparation",
      max: 10,
      scoring: "range",
      whatToLookFor:
        "Does the coach demonstrate they reviewed the sales notes BEFORE the call? Do they reference the client's name, goals, injuries, and context without asking?",
      buckets: [
        {
          label: "Elite",
          min: 9,
          max: 10,
          criteria:
            "Fully reviewed intake, references goals naturally, no repetition. References specific goals + name + injuries within the first 2 minutes. Uses at least 2 specific details from notes naturally and in passing. Score 10 when delivery is seamless and at least one verbal acknowledgement is present; 9 when otherwise elite without the verbal acknowledgement.",
        },
        {
          label: "Strong",
          min: 6,
          max: 8,
          criteria:
            "Clear evidence of preparation in the content, but with a small gap: a single factual misstep, slightly delayed reference, or one redundant question. Allowing the client to voluntarily share context for relational warmth is NOT a deduction. Score 8 when the gap is minor and clearly outweighed by solid prep; 6 when prep is real but uneven.",
        },
        {
          label: "Mid",
          min: 4,
          max: 5,
          criteria:
            "Partial preparation. Some notes used, but several redundant questions or a generic, low-personalization intro. Reserve for cases where prep is visibly thin, not for cases where prep is solid but the coach didn't verbally announce it.",
        },
        {
          label: "Weak",
          min: 1,
          max: 3,
          criteria:
            "Minimal preparation visible. One or two surface references at most; client does most of the context-setting.",
        },
        {
          label: "Fail",
          min: 0,
          max: 0,
          criteria: "Clearly unprepared. Asks client their name or what brought them here. Completely resets the sale.",
        },
      ],
      positiveSignals: [
        "Specific goals/pain/history surfaced in the opening",
        "\"I saw from your notes that…\"",
        "\"You don't need to repeat what you told the team…\"",
      ],
      negativeSignals: [
        "\"Can you tell me about yourself?\"",
        "\"What brought you here?\"",
        "Multiple redundant logistics questions already covered in sales notes",
      ],
      notes: [
        "Score on conduct, not on disclosure. Credit preparation when the coach demonstrably uses information that could only have come from the sales notes, even if they never say \"I read your notes\".",
        "Calibration: do NOT default to Mid simply because the coach did not say \"I read your notes\". Do NOT drop a strong call to Mid for a single misstep (e.g. wrong city) — score 6–8 instead.",
      ],
    },

    {
      id: "D2",
      n: 2,
      name: "Rapport & Tone",
      max: 10,
      scoring: "discrete",
      whatToLookFor:
        "Does a genuine human connection form? Does the coach adapt their energy to the client? Does the client open up?",
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Warm, calm, personalized, matches client energy. Conversation is natural and non-scripted. Uses client's name organically. Shares something personal and relevant. Client opens up spontaneously with personal stories.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Friendly but surface-level. Warm and conversational but not deeply personal. Good connection but little emotional mirroring or depth.",
        },
        {
          label: "Mid",
          value: 3,
          criteria: "Mechanical / scripted feel. Friendly but transactional. Light conversation without real connection.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "Cold, rushed, transactional. Skips rapport entirely. No attempt at personal connection. Client gives monosyllabic answers.",
        },
      ],
      positiveSignals: ["Client shares personal stories unprompted", "Natural laughter", "Client says \"I like that you…\""],
      negativeSignals: ["Awkward silences", "Monosyllabic client responses", "Coach talks about themselves excessively"],
    },

    {
      id: "D3",
      n: 3,
      name: "Agenda Framing",
      max: 5,
      scoring: "range",
      whatToLookFor:
        "Does the coach take control of the call structure upfront and communicate what will happen?",
      buckets: [
        {
          label: "Elite",
          min: 4.5,
          max: 5,
          criteria:
            "Clear agenda with explicit time framing AND ≥3 sequenced phases (numbered or natural-language) AND client verbal consent (\"sounds good\"). Score 5 when all three elements are crisp; 4.5 when the agenda is fully present and sequenced but slightly informal in delivery.",
        },
        {
          label: "Mid",
          min: 2.5,
          max: 3.5,
          criteria:
            "Agenda mentioned but partial — either time framing missing, fewer than 3 phases, or no client buy-in. Implicit structure rather than intentional framing.",
        },
        {
          label: "Weak",
          min: 1,
          max: 2,
          criteria: "Brief or fragmented mention of what's coming, without sequencing or framing.",
        },
        {
          label: "Fail",
          min: 0,
          max: 0,
          criteria: "No upfront structure. Launches into random topics. Client has no sense of where the call is going.",
        },
      ],
      positiveSignals: [
        "Time stated (\"we've got 30 minutes\")",
        "Sequenced coverage, numbered or natural-language",
        "Client confirms (\"sounds good\")",
      ],
      negativeSignals: ["Starts with random questions", "No time stated", "Single vague mention without sequencing"],
      notes: [
        "Numbered enumeration is NOT required. A sequenced delivery covering at least three distinct phases qualifies as structured if paired with explicit time framing and at least implicit client buy-in.",
        "Calibration: \"we've got 30 minutes — connect, get aligned on your goals, what success looks like, walk you through the journey, get clear on support, and schedule the next call\" is Elite framing. Score 4.5–5, not 3.",
      ],
    },

    {
      id: "D4",
      n: 4,
      name: "Goal Alignment & Deep Why",
      max: 15,
      scoring: "discrete",
      whatToLookFor:
        "Does the coach go beyond functional goals to uncover the emotional/identity driver? Is a North Star statement built?",
      buckets: [
        {
          label: "Elite",
          value: 15,
          criteria:
            "Extracts emotional drivers + clear 30-day success metrics. ≥2 follow-up questions on \"why\". Extracts emotional/identity driver (fear, family, legacy, career, self-image). Builds a North Star statement. Defines specific 30-day success metric. Client verbally confirms (\"Yes, that's exactly it\").",
        },
        {
          label: "Strong",
          value: 10,
          criteria:
            "Understands goals but stays surface level. 1 follow-up + some emotional context. 30-day goal vague or not established. North Star implied but not solidified. Physical goals identified, not emotionally deep.",
        },
        {
          label: "Mid",
          value: 5,
          criteria:
            "Mostly repeats sales notes. Asks \"what are your goals?\" and accepts the first answer. Stays physical only. No probing, no emotional depth, no North Star.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "No meaningful alignment. Reads from sales notes without engagement. Accepts generic answer (\"I want to be healthy\") and moves on.",
        },
      ],
      positiveSignals: [
        "\"Why is that important to you?\"",
        "\"What would happen if nothing changes?\"",
        "\"What I hear you saying is…\"",
      ],
      negativeSignals: [
        "Accepts \"I want to be healthy\" without digging",
        "Stays only on physical",
        "Never references the goal later in the call",
      ],
      notes: [
        "Auto-cap: no North Star statement → max 10.",
        "#1 loss dimension per Marcus's analysis: most coaches stay surface on the \"why\".",
      ],
    },

    {
      id: "D5",
      n: 5,
      name: "Program Explanation (3 Phases)",
      max: 10,
      scoring: "range",
      whatToLookFor: "Does the client leave understanding the 3-phase structure and why it exists?",
      buckets: [
        {
          label: "Elite",
          min: 9,
          max: 10,
          criteria:
            "All 3 phases clearly named (in any equivalent phrasing) with outcomes for each. Uses an analogy (pyramid, mountain, ladder) or reassessment cadence. Each phase tied to the client's specific goal. High belief transfer.",
        },
        {
          label: "Strong",
          min: 6,
          max: 8,
          criteria:
            "All 3 phases clearly identified in correct order (with any naming), but delivery is simple or moderately generic. Phases may not be deeply tied to the client's goals, OR analogy / reassessment cadence is missing, OR the coach does not explicitly check client understanding. Score 8 when phases are crisp and complete; 6 when present but brief.",
        },
        {
          label: "Mid",
          min: 3,
          max: 5,
          criteria:
            "Fragmented explanation. 1–2 phases mentioned vaguely, or the progression is implied but not laid out in sequence.",
        },
        {
          label: "Weak",
          min: 1,
          max: 2,
          criteria: "Only references to \"phases\" or \"steps\" without naming or sequencing.",
        },
        {
          label: "Fail",
          min: 0,
          max: 0,
          criteria: "Skips or misrepresents. No phase explanation at all. Just \"we'll do mobility exercises.\"",
        },
      ],
      positiveSignals: [
        "Three-stage progression named in correct order, any equivalent phrasing",
        "Analogies (mountain, pyramid, ladder)",
        "Reassessment cadence stated",
        "Coach asks client if it makes sense",
      ],
      negativeSignals: [
        "\"We'll do a bit of everything\"",
        "No progression described",
        "Phases named but not in the correct sequence",
      ],
      notes: [
        "Halden Method canon: (1) Movement Retraining, (2) Movement Remodeling, (3) Movement Integrating. Accept ANY phrasing conveying the three-stage progression in correct order — legacy synonyms include Reset/Baseline → Build/Strength → Freedom/Mastery.",
        "Calibration: do NOT drop the score because the labels don't say \"Reset/Build/Freedom\". The canonical naming is correct and should be credited as Elite-tier phase identification.",
      ],
    },

    {
      id: "D6",
      n: 6,
      name: "Journey & Expectation Setting",
      max: 10,
      scoring: "discrete",
      whatToLookFor: "Does the coach prepare the client emotionally for the difficulty of the journey?",
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Clearly explains milestones, timeline, challenges. Normalizes emotional friction explicitly. Explains valleys (weeks 3–4). Distinguishes good discomfort from bad pain. Explains the first month is foundational, not transformational. Links back to North Star.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Covers basics but misses emotional prep. Timeline explained, structure ok. Normalizes physical discomfort but not emotional. Missing psychological preparation for valleys.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Vague expectations. Informative but not experiential. Explains what will happen but not how it will feel. Sounds instructional, not coaching.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "No expectation setting. Leaves client with unrealistic expectations. Doesn't mention that there will be hard moments.",
        },
      ],
      positiveSignals: [
        "\"Around week 3–4 you might feel in a valley\"",
        "\"First month: foundational, not transformational\"",
        "\"It's normal to feel overwhelmed\"",
      ],
      negativeSignals: ["Only positivity, no mention of difficulty", "No normalization of struggle"],
      notes: [
        "#2 loss dimension: most coaches explain the timeline but never normalize emotional friction. Clients hit week 3–4 unprepared and disengage.",
      ],
    },

    {
      id: "D7",
      n: 7,
      name: "Support System Clarity",
      max: 5,
      scoring: "discrete",
      whatToLookFor:
        "Does the coach communicate, in this call, exactly how the client will be supported between sessions — primary channel, response expectations, community access, and how accountability will work?",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Clearly explains all channels + when to use each. Primary channel named explicitly. Response time stated (\"I respond within 24h\"). Community access mentioned and how to use it. Accountability style asked or framed (\"Do you want me to push you, or stay in the background?\"). Client visibly understands how to reach the coach and what to expect.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Mentions support but unclear usage. Channel mentioned but no response times. Vague \"reach out anytime\" without structure. No accountability framing.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "Not explained. No mention of how the client reaches the coach between sessions. No channel named. No response expectations.",
        },
      ],
      positiveSignals: [
        "Primary support channel named",
        "\"I respond within 24h\"",
        "Community platform mentioned",
        "\"Do you want me to push you or stay back?\"",
      ],
      negativeSignals: [
        "Generic \"reach out anytime\" without structure",
        "No response-time expectations",
        "No accountability framing",
      ],
      notes: [
        "Scored on what is said in the call. Message history is not required to score it: if the support channel is named, response times stated, community mentioned and accountability style discussed, the dimension can be scored fully.",
      ],
    },

    {
      id: "D8",
      n: 8,
      name: "Coaching Intelligence Questions",
      max: 10,
      scoring: "discrete",
      whatToLookFor:
        "Does the coach gather information that goes beyond logistics into behavioral patterns, psychology, and personalization?",
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Asks key behavioral + self-awareness questions. Asks about behavioral patterns (\"What has stopped you in the past?\"). Probes consistency triggers. Asks about learning style. Asks about stress response. Uses answers to personalize coaching approach. Identifies client archetype signals.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Asks 1–2 but lacks depth. Asks about pain triggers, schedule, training style. Missing behavioral pattern or mindset questions. Doesn't use answers to adapt approach.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Generic questions only. Basic questions only (frequency, equipment, availability). Surface-level coaching. Doesn't use answers to adapt.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "Skipped. No coaching intelligence questions. Only \"when are you available?\" and \"do you have equipment?\" Client not truly known.",
        },
      ],
      positiveSignals: [
        "\"What has stopped you before?\"",
        "\"How do you respond when you're overwhelmed?\"",
        "\"Do you prefer I push you or support gently?\"",
      ],
      negativeSignals: ["Only logistical questions", "No psychological or behavioral inquiry", "Doesn't use responses"],
      notes: [
        "Archetype signals: Doer = confident, data-driven, wants \"the how\". Controller = pushes back, questions the process, needs proof. Worrier = seeks reassurance, asks \"what if\". Follower = enthusiastic but vague goals, history of not following through.",
      ],
    },

    {
      id: "D9",
      n: 9,
      name: "Next Steps & Diagnostics",
      max: 10,
      scoring: "discrete",
      whatToLookFor: "Does the client leave knowing exactly what to do and when?",
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Clear, confident, client understands exactly what to do. Pipeline: diagnostics → film → upload → program → start date. Explains how to film videos (angle, device). Removes all confusion with demo or screen share. Time specified (\"send by Saturday, program Monday\"). Client verbally confirms they understand.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Some clarity but minor confusion. Clear instructions but no demo. Timeline ok but slightly rushed. Minor ambiguity but overall strong clarity.",
        },
        {
          label: "Mid",
          value: 3,
          criteria: "Vague instructions. Partially clear, some gaps. Client has unresolved doubts. No specific timeline.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "No clear next steps. \"I'll send you some stuff\" without explanation. Client doesn't know what to do after the call.",
        },
      ],
      positiveSignals: [
        "Step-by-step pipeline stated",
        "\"Send by Saturday, you'll have your program by Monday\"",
        "Screen share of apps",
      ],
      negativeSignals: ["\"I'll email you something\"", "Client asks \"So what do I do now?\"", "No timeline"],
      notes: [
        "#3 loss dimension: \"I'll send you some stuff\" is the most expensive sentence in coaching. Vague next steps lose clients in the hand-off.",
      ],
    },

    {
      id: "D10",
      n: 10,
      name: "Booking Next Call",
      max: 5,
      scoring: "range",
      whatToLookFor: "Is the next call booked LIVE before the call ends?",
      buckets: [
        {
          label: "Elite",
          min: 4.5,
          max: 5,
          criteria:
            "Date and time confirmed verbally during the call. Coach navigates the client's scheduling constraints live (time zones, weekly availability, conflicts). Score 5 when booking is crisp and the coach proactively closes it; 4.5 when confirmed but slightly rushed or with minor ambiguity.",
        },
        {
          label: "Mid",
          min: 2.5,
          max: 3.5,
          criteria:
            "Attempted but not fully secured. Coach raises booking but leaves excessive flexibility (\"I'll send you a link\") rather than locking date + time live.",
        },
        {
          label: "Weak",
          min: 1,
          max: 2,
          criteria: "Booking referenced only in passing, with no concrete attempt to lock it during the call.",
        },
        {
          label: "Fail",
          min: 0,
          max: 0,
          criteria: "Not addressed. Call ends without any mention of the next call.",
        },
      ],
      positiveSignals: [
        "\"Let's book it now before we close\"",
        "Specific date + time confirmed verbally",
        "Resolves scheduling conflict live",
      ],
      negativeSignals: ["\"I'll send you the link\"", "Call closed without booking", "\"We'll figure it out via message\""],
      notes: [
        "Booking is verbal, not technical. Whether the calendar invite is technically clicked on-screen during the call versus immediately after is an artifact of the recording — it is NOT a deduction.",
        "Calibration: if date and time are confirmed verbally and any scheduling friction is resolved live, score 5/5 even if the transcript does not confirm the invite was sent during the recording.",
      ],
    },

    {
      id: "D11",
      n: 11,
      name: "Close, Recap & Confidence",
      max: 5,
      scoring: "discrete",
      whatToLookFor:
        "Does the call end with energy, structure, and an emotional anchor — not just logistics?",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Strong recap, reinforces confidence. Structured recap: \"Here's what we covered today: X, Y, Z.\" Confidence anchor: \"You're exactly the type of person who succeeds here.\" Emotional reinforcement: excitement for the journey. Does NOT end with only logistics.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Basic close. Positive close but no structured recap. Generic encouragement without emotional anchor. Ends with next steps logistically. Or flat close: \"Ok, talk soon.\"",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "Abrupt or unclear ending. Call ends in a disappointing or flat way. Client leaves without feeling excited.",
        },
      ],
      positiveSignals: ["\"Here's what we covered…\"", "\"You're in exactly the right place\"", "\"I'm excited about this journey with you\""],
      negativeSignals: ["\"Ok, speak next time\"", "No summary", "Flat or cold tone"],
      notes: [
        "Pattern note: even elite calls typically score 3–4/5 here. Missing structured recap is the most universal gap across all coaches. Cap: no structured recap → max 3.",
      ],
    },

    {
      id: "D12",
      n: 12,
      name: "Post-Call Execution",
      max: 5,
      scoring: "range",
      whatToLookFor:
        "Does the coach commit, in-call, to specific post-call deliverables with concrete deadlines? Scores what is said in the call — verification of actual delivery is out of QC scope.",
      buckets: [
        {
          label: "Elite",
          min: 4.5,
          max: 5,
          criteria:
            "Multiple explicit post-call commitments with precise deadlines: recap timing, diagnostics assigned live, program delivery date stated. All time-bound. Score 5 when 3+ commitments with crisp timing; 4.5 when 2+ commitments with precise timing.",
        },
        {
          label: "Strong",
          min: 3.5,
          max: 4,
          criteria:
            "Two or more post-call commitments with mostly precise timing — minor gaps (one commitment with rougher timing, or one specific commitment plus one general one).",
        },
        {
          label: "Mid",
          min: 2,
          max: 3,
          criteria:
            "At least one specific commitment, but timing is rough or only one or two commitments are made. Includes informal-but-real commitments like \"I'll get diagnostics done over the weekend\".",
        },
        {
          label: "Weak",
          min: 1,
          max: 1,
          criteria: "Vague reference to follow-up (\"I'll send you stuff\") without specific deliverable or timing.",
        },
        {
          label: "Fail",
          min: 0,
          max: 0,
          criteria: "No post-call commitments stated at all. Call ends with no clarity on what the coach will do next.",
        },
      ],
      positiveSignals: [
        "\"I'll send you the recap in the next 10–15 minutes\"",
        "\"I'm assigning diagnostics now\"",
        "\"Your program will be ready by Monday\"",
        "Concrete deliverable named",
      ],
      negativeSignals: [
        "No mention of follow-up actions",
        "\"I'll send you stuff\" without specifics",
        "No timing on any commitment",
      ],
      notes: [
        "Informal commitments still count. A specific commitment with implied or rough timing is a real promise — score it Mid, not Fail. Reserve Fail for calls where the coach makes no commitment at all.",
      ],
    },
  ],
};
