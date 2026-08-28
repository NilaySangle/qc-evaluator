import type { Rubric } from "./types";

/**
 * Coaching call rubric — transcribed from fixtures/rubrics/coaching-call-rubric.md.
 *
 * Two things about this document that the code downstream has to respect:
 *
 * 1. Every dimension table is `| Score | Criteria |` with single values, and the
 *    header is explicit: "No interpolation." So every dimension is `discrete`.
 *
 * 2. The stated total is 100, but the twelve dimension maxima sum to 105
 *    (10+10+15+15+10+15+5+5+5+5+5+5). The kick-off rubric sums to exactly 100,
 *    so this is specific to this document rather than a convention. We do not
 *    silently pick a dimension to shave. See `statedTotalNote` and the
 *    normalisation in lib/scoring/total.ts.
 */
export const coachingRubric: Rubric = {
  callType: "coaching",
  title: "Coaching call",
  version: "coaching-2026-08-27",
  statedTotal: 100,
  statedTotalNote:
    "Document header states 100 points (85 with D4 disabled), but the twelve dimension maxima sum to 105. Scores are normalised over the sum of active maxima and reported on the 100 scale, which is the generalisation of the rubric's own D4 rule ('the percentage is the raw score over 85. Report the result on the 100 scale').",
  scoringNote:
    "Discrete scoring. Each dimension's score must be exactly one of the bucket values listed in its table. No interpolation. Pick the bucket the call most closely matches and let the reasoning carry the nuance.",
  intro:
    "The three things every coaching call must strengthen are Connection, Confidence and Continuity. Every score is grounded in those three pillars and in direct transcript evidence: specific moments, quotes, or observable behaviours. If a behaviour is not verifiable in the transcript, score conservatively. Never score from impressions or assumptions. Scope is transcript only — video delivery and in-app messaging are not part of this, so only in-call promises are scored.",

  caps: [
    {
      id: "next_call_not_booked",
      condition: "Next call NOT booked live during the call",
      effect: { kind: "dimension_fixed", target: "D10", value: 0 },
      detection: "model",
      owner: "D10",
      question:
        "Did the call END without the next call being booked live during the call? true = not booked live (cap fires).",
      nonRecoverable: true,
    },
    {
      id: "no_vision_connection",
      condition: "No connection to long-term vision at any point in the call",
      effect: { kind: "dimension_max", target: "D3", value: 10 },
      detection: "model",
      owner: "D3",
      question:
        "Was there NO connection to the client's long-term vision at any point in the call? true = no vision connection anywhere (cap fires).",
    },
    {
      id: "coach_talk_over_75",
      condition: "Coach speaks >75% of the call (client passive/monologue)",
      effect: { kind: "total_max", value: 75 },
      detection: "deterministic",
      threshold: { metric: "coach_talk_share", gt: 0.75 },
    },
    {
      id: "no_accountability_commitment",
      condition:
        "No concrete accountability commitment the client owns before close — no specific, verifiable deliverable the client confirms. A single named anchor OR a progression-gated ask (\"send me your X video(s) before I progress you\", client confirms) both satisfy this and do NOT trigger the cap.",
      effect: { kind: "dimension_max", target: "D6", value: 10 },
      detection: "model",
      owner: "D6",
      question:
        "Was there NO concrete accountability commitment the client owns before close? A single named anchor OR a progression-gated ask the client confirms both satisfy this and mean the cap does NOT fire. true = no such commitment (cap fires).",
    },
    {
      id: "struggle_ignored",
      condition: "Client struggle present but ignored or avoided",
      effect: { kind: "dimension_fixed", target: "D8", value: 0 },
      detection: "model",
      owner: "D8",
      question:
        "Was a client struggle PRESENT in the call but ignored, minimised, avoided, or met with defensiveness? true = struggle present and mishandled (cap fires). If no struggle was present at all, answer false.",
      nonRecoverable: true,
    },
    {
      id: "no_action_steps",
      condition: "No action steps stated for either party before close",
      effect: { kind: "total_max", value: 70 },
      detection: "model",
      owner: "D6",
      question:
        "Did the call end with NO action steps stated for either party? true = no action steps for coach or client (cap fires).",
    },
  ],

  bands: [
    {
      name: "ELITE",
      min: 90,
      max: 100,
      description:
        "Client feels seen, challenged, and connected to their future self. Referral and re-sign behavior expected.",
    },
    {
      name: "STRONG",
      min: 80,
      max: 89,
      description: "Good call with isolated weaknesses. Client satisfied but not deeply moved.",
    },
    {
      name: "INCONSISTENT",
      min: 70,
      max: 79,
      description: "Technically present but emotionally flat. Retention risk building quietly.",
    },
    {
      name: "AT RISK",
      min: 60,
      max: 69,
      description: "Weak client experience. Client may be doubting the process.",
    },
    {
      name: "FAIL",
      min: 0,
      max: 59,
      description: "Core elements missing. Immediate coaching intervention required.",
    },
  ],

  principles: [
    "Three-part test for every score: depth (how far the coach went), clarity (how well it landed), and client response (did it actually land). A perfect explanation that the client didn't confirm is not elite.",
    "Quote-first rationale. Every rationale must begin with a direct or paraphrased reference to a specific moment in the transcript. No impressions.",
    "Conservative on missing evidence. If a behavior cannot be verified, score the lower tier of its band.",
    "The four client feelings are the ultimate test: 'this is built for me / I know exactly what to do / I trust this process / my coach is paying attention'.",
    "Framework use is judged by naturalness, not completeness. A coach who covers all sections robotically scores lower on D12 than one who weaves them organically.",
  ],

  dimensions: [
    {
      id: "D1",
      n: 1,
      name: "Check-In & Connection",
      max: 10,
      pillar: "CONNECTION",
      scoring: "discrete",
      whatToLookFor:
        "Does the coach open with genuine curiosity and gauge the client's real state before anything else? Does the call intention get set explicitly?",
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Coach asks about body, wins, AND struggles. Listens before responding — no interruption. Reflects what they hear back to the client (\"What I'm hearing is…\"). States clear call intention tied to client's actual state. Coach reads what kind of call is needed today and adjusts the approach accordingly.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Good questions but limited depth. Solid check-in, reflects but not fully. Call intention stated but generic (\"let's keep making progress on your goals\").",
        },
        {
          label: "Surface",
          value: 3,
          criteria:
            "Surface-level: \"How's it going?\" Doesn't reflect. Moves to program topics within 30 seconds. No call intention stated.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "Skips check-in entirely or rushes through. No acknowledgment of client's state. Launches directly into program content.",
        },
      ],
      positiveSignals: [
        "Coach adjusts call plan based on check-in answers",
        "Client opens up beyond surface level",
        "Intention is stated and tailored to this client's current moment",
      ],
      negativeSignals: [
        "\"Okay let's get started\"",
        "Monosyllabic client response and coach moves on",
        "No listening pause",
        "No call intention set",
      ],
      notes: [
        "SOP prompts to listen for: \"How's your body been feeling since last time?\" / \"What's your biggest win since our last call?\" / \"What felt hardest?\"",
        "Calibration (Marcus): \"The check-in is how you gauge what kind of call this person actually needs today. The framework is a container, not a script. If someone hops on in tears, you put the framework away.\"",
      ],
    },

    {
      id: "D2",
      n: 2,
      name: "Diagnostics Review",
      max: 10,
      pillar: "VALUE",
      scoring: "discrete",
      whatToLookFor:
        "When applicable, does the coach demonstrate expertise through specific, personalized feedback — not generic commentary? Is 1–2 movements reviewed (not more), and are findings tied directly to client goals?",
      optional: {
        signal: "diagnostics_review",
        presenceTests: [
          "A diagnostics or movement review actually took place on this call (screen-share of a movement, or the coach walking through recorded footage).",
          "The client submitted video or diagnostics that the coach responds to during the call.",
        ],
        guidance:
          "Diagnostics are only due at milestone calls (weeks 8, 16, 24) or when a video was submitted. If neither happened, the rubric is explicit: score N/A and do NOT penalize the coach — disable this dimension rather than scoring it Fail. When disabled the call is scored over the remaining active dimensions, which is the redistribution the rubric calls for.",
      },
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Screen shares 1–2 movements only (per SOP). Makes specific, anatomically precise observations. Directly ties findings to client's stated pain points and goals. Client clearly understands the connection. Coach selects movements that point back to client's why.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Good observations but not fully tied to goals. Expertise shown, context-linking incomplete. Reviews correct number of movements.",
        },
        {
          label: "Surface",
          value: 3,
          criteria:
            "Reviews movements with generic feedback (\"Good effort, keep your back straight\"). No tie to client goals or pain points. Possibly reviews too many movements.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "Skipped, rushed, or unclear. Feedback generic or absent. Personalization not visible.",
        },
      ],
      positiveSignals: [
        "Coach explicitly selects movements tied to client's presenting goal",
        "Anatomical specificity",
        "Client has a visible \"I didn't know that\" moment",
      ],
      negativeSignals: [
        "\"Looks good overall\"",
        "Generic cues not connected to goals",
        "Reviews 5+ movements without focus",
      ],
      notes: [
        "SOP time allocation: 3–4 min, only applicable at weeks 8, 16, 24.",
        "Scoring note from the rubric: if diagnostics are not applicable this cycle (non-milestone call, no video submitted), note this and score N/A, redistributing weight. Do not penalize the coach. The rubric names D3 and D4 as the redistribution targets, but D4 is itself often disabled on the same non-milestone calls; rather than invent a two-target split that breaks when D4 is off, this dimension is disabled and the score is normalised over all remaining active dimensions — a proportional redistribution that holds in every combination.",
        "Calibration (Marcus): \"One to two movements — not a hundred. Always pick the movements that point back to the client's goals, their why.\"",
      ],
    },

    {
      id: "D3",
      n: 3,
      name: "Program Focus + Vision",
      max: 15,
      pillar: "EMOTION — Belief + Long-Term Buy-In",
      scoring: "discrete",
      whatToLookFor:
        "Does the coach connect the current block to the client's 12-month vision and identity? Or do they only talk about this week?",
      buckets: [
        {
          label: "Elite",
          value: 15,
          criteria:
            "Clearly explains what the current block targets. Explicitly connects this phase to client's 12-month vision by name. Reinforces Halden Method difference: \"We build from your diagnostics and goals — not random workouts.\" Client responds with belief or insight. Client leaves understanding not just WHAT but WHY this specific block, at this specific time, is the path to their specific goal.",
        },
        {
          label: "Strong",
          value: 10,
          criteria:
            "Block explained and connected to goals but vision tie is generic (\"this builds toward your long-term health\"). Emotional resonance present but not sharp.",
        },
        {
          label: "Mid",
          value: 5,
          criteria:
            "Vague explanation. Block explained as logistics only. Client understands what to do this week but not why it matters long-term. No 12-month vision referenced.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "No explanation of block. Just \"keep doing your workouts.\" No connection to vision.",
        },
      ],
      positiveSignals: [
        "12-month vision referenced by name",
        "Client responds with buy-in or insight",
        "Block tied to previous and next phase",
      ],
      negativeSignals: [
        "Only current week discussed",
        "\"Just keep going\"",
        "Client passive",
        "Reframe not attempted when client is confused",
      ],
      notes: [
        "Auto-cap: no long-term vision connection anywhere in the call → max 10.",
        "#1 loss dimension per Marcus's analysis: \"They explain the program but forget to make the client believe in the journey.\"",
      ],
    },

    {
      id: "D4",
      n: 4,
      name: "Movement Coaching Quality",
      max: 15,
      pillar: "SUPPORT — Real Coaching, Not Commentary",
      scoring: "discrete",
      whatToLookFor:
        "Does something actually improve or click during this call? Is the coach coaching — or just narrating?",
      optional: {
        signal: "movement_coaching",
        presenceTests: [
          "Client performed any live movement during the call.",
          "Coach gave setup, breathing, or control cues in response to a movement.",
          "There was a video review of a recorded movement attempt with real-time feedback.",
          "Coach gave real-time form correction while the client moved.",
        ],
        guidance:
          "ALL four presence tests must be absent to disable this dimension. If even one is present, score normally. When disabled the call is scored over the remaining active dimensions.",
      },
      buckets: [
        {
          label: "Elite",
          value: 15,
          criteria:
            "Reviews 1–2 movements live. Specific cues given: setup, breathing, control. Asks reflective questions. Improvement is observable or client verbally confirms a new understanding. Links back to goal. If client is a \"talker,\" coach redirects to live movement.",
        },
        {
          label: "Strong",
          value: 10,
          criteria:
            "Clear coaching and relevant cues. Missing reflective questions or goal link. Client engaged but no breakthrough or redirection of talker dynamic.",
        },
        {
          label: "Mid",
          value: 5,
          criteria:
            "Mostly telling (\"Keep your back straight, squeeze your glutes\"). No reflective questions. No back-and-forth coaching exchange.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "No live coaching. Just commentary or \"looks fine.\" Client is a passive observer. Coach lets the call become purely talk without movement.",
        },
      ],
      positiveSignals: [
        "Client has an \"aha\" moment",
        "Coach adjusts cue based on client response",
        "Live exchange (back and forth)",
        "Talker redirected to movement",
      ],
      negativeSignals: [
        "One-way monologue",
        "No client input solicited",
        "Client spends 8 minutes talking and no movement happens",
        "No goal link after coaching",
      ],
      notes: [
        "Reflective questions to listen for: \"Where do you feel this most?\" / \"What felt hardest here?\" / \"What changed when you tried it that way?\"",
        "#3 loss dimension: coaches narrate instead of coaching.",
      ],
    },

    {
      id: "D5",
      n: 5,
      name: "Adjustments & Strategy",
      max: 10,
      pillar: "GOALS — Adaptability + Confidence",
      scoring: "discrete",
      whatToLookFor:
        "When adjustments are made — training or lifestyle — are they framed as intelligent, strategic progress? Or do they feel like a step backward?",
      absentDefault: {
        score: 7,
        when: "No adjustments are needed this cycle.",
        reason:
          "Rubric scoring note: score 7/10 by default, because strategic awareness is still visible in how the coach communicates program status.",
      },
      buckets: [
        {
          label: "Elite",
          value: 10,
          criteria:
            "Adjustments explained with clear rationale tied to the client's long game. Explicitly framed as protection and strategy: \"We're adapting — not backing off. This protects the long game.\" Both training and lifestyle constraints addressed if applicable. Client leaves feeling smarter and more confident, not discouraged.",
        },
        {
          label: "Strong",
          value: 7,
          criteria:
            "Adjustments made and explained. Framing present but brief. Client doesn't feel discouraged but isn't fully empowered.",
        },
        {
          label: "Surface",
          value: 3,
          criteria:
            "Adjustments made without clear rationale. Client accepts changes but doesn't understand why. Subtle discouragement possible.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "Reactive, unexplained changes. Client confused or mildly demoralized. No protective framing applied.",
        },
      ],
      positiveSignals: [
        "Client says \"Oh, that makes sense\"",
        "Adjustment tied to the bigger goal",
        "Coach explains what the adjustment builds toward",
      ],
      negativeSignals: [
        "\"Let's reduce that for now\" with no explanation",
        "Client sounds apologetic or uncertain",
        "No protective framing",
      ],
      notes: [
        "Training adjustments: tempo, reps, volume, regressions/progressions. Lifestyle adjustments: travel, stress, schedule constraints.",
      ],
    },

    {
      id: "D6",
      n: 6,
      name: "Action Steps & Accountability",
      max: 15,
      pillar: "JOURNEY — Clarity + Ownership",
      scoring: "discrete",
      whatToLookFor:
        "Do both the coach AND client leave with specific, time-bound, measurable commitments? Is verbal ownership created — not just instructions given?",
      buckets: [
        {
          label: "Elite",
          value: 15,
          criteria:
            "Coach states commitments out loud with a named deliverable and date. Client commitments are specific: \"Film ___ by ___.\" / \"Complete ___ daily.\" Client owns a weekly theme in their own words. If client is slipping, coach creates micro-commitments. Both sides know exactly what's expected.",
        },
        {
          label: "Strong",
          value: 10,
          criteria:
            "Clear commitments but lacks specific deadlines or measurability. One side more accountable than the other. Client commitment present but vague.",
        },
        {
          label: "Mid",
          value: 5,
          criteria:
            "Vague action steps: \"Do your workouts,\" \"Let me know how it goes.\" No deadline, no specific task. No verbal ownership.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "No clear next steps for either party. Call ends without accountability.",
        },
      ],
      positiveSignals: [
        "Client repeats back their commitment",
        "Both sides have a named task + deadline",
        "Coach calls out a behavior pattern change",
        "Micro-commitment created for slipping client",
      ],
      negativeSignals: [
        "\"Keep doing what you're doing\"",
        "No named task",
        "No deadline",
        "Coach never follows up on previous call's commitment",
      ],
      notes: [
        "Only the in-call statement of the coach's own deliverable is scored. Whether it was actually sent is post-call and cannot be verified from a transcript.",
        "#2 loss dimension: most coaches say 'great, keep it up' instead of creating owned commitments on both sides.",
      ],
    },

    {
      id: "D7",
      n: 7,
      name: "Accountability Anchor",
      max: 5,
      pillar: "JOURNEY — Single-Point Focus",
      scoring: "discrete",
      whatToLookFor:
        "Is there a clear, non-negotiable accountability commitment the client owns for the week — one that is gated to a coach action (program progression, feedback)?",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "A clear accountability commitment the client owns and verbally confirms, gated to the coach's next action — a real chain of consequence. Either form qualifies: (a) one explicitly-named anchor, or (b) a specific, verifiable deliverable the client must submit before the coach progresses, even if several items are listed, as long as the deliverable and its consequence are clear and confirmed. Time-bound is satisfied by a hard date OR a session-relative deadline.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Accountability gestured at but NOT clearly gated to a coach action/consequence — tasks listed with equal weight and no clear \"what this unlocks\", or unclear what the client actually owns. Multiple tasks alone is not a downgrade.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "No accountability anchor. Multiple vague tasks or nothing at all.",
        },
      ],
      positiveSignals: [
        "Coach names \"your one accountability task is...\"",
        "A specific deliverable the client confirms (\"Absolutely\")",
        "The deliverable is gated to the coach's next output",
        "A clear submission window (\"before I progress you\", \"over the next two weeks\")",
      ],
      negativeSignals: [
        "Vague commitments with no clear consequence",
        "Client uncertain what they actually owe",
        "No accountability deliverable stated before close",
        "Tasks with no link to any coach action",
      ],
      notes: [
        "Calibration (Devin → Owen, May 2026): \"I want you to send me some videos over the next two weeks… I need to see these before I progress you,\" with the client confirming, is a satisfied anchor at Strong–Elite even though several videos are listed and the deadline is a window. Do NOT downgrade purely because it was framed as a set of videos or used a session-relative deadline.",
      ],
    },

    {
      id: "D8",
      n: 8,
      name: "Struggle Handling",
      max: 5,
      pillar: "CONNECTION + CONFIDENCE",
      scoring: "discrete",
      whatToLookFor:
        "When the client reveals difficulty — physical, emotional, motivational, or frustration with the program — does the coach actually coach through it, or just acknowledge it?",
      absentDefault: {
        score: 5,
        when: "No struggle is present anywhere in the call.",
        reason: "Rubric scoring note: score 5/5 by default. A smooth call is not penalised.",
      },
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Coach does NOT defend, prove, or take the struggle personally. Stays grounded and fact-based. Asks questions to get to the core before offering solutions. Pre-frames if client is upset, reconnects to why, reframes (\"We do not stop — we shift\"), goes full circle, offers options. Client leaves feeling more capable and reconnected — not just heard.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Acknowledges struggle and offers some support. Asks some questions but doesn't fully coach through or reconnect to why. Brief or surface-level reassurance.",
        },
        {
          label: "Fail",
          value: 0,
          criteria:
            "Struggle ignored, minimized, avoided, or coach becomes defensive. Auto-cap: 0/5, non-recoverable.",
        },
      ],
      positiveSignals: [
        "Coach asks multiple questions before offering solutions",
        "Client tone visibly shifts mid-section",
        "Coach references original why from kickoff",
        "Goes full circle",
        "Offers multiple options and commits to one",
      ],
      negativeSignals: [
        "\"Don't worry about it, everyone goes through this\"",
        "Defending the program",
        "Using client's negative language back at them",
        "Moving on without resolution",
      ],
    },

    {
      id: "D9",
      n: 9,
      name: "Close Quality",
      max: 5,
      pillar: "CONFIDENCE",
      scoring: "discrete",
      whatToLookFor:
        "Does the call end with emotional energy, specific celebration, and directional clarity — or just logistics?",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Celebrates a specific, named progress from THIS call. Reiterates direction: \"This block leads directly into your ___ milestone.\" Warm, earned close. Client leaves energized, not just satisfied.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Positive close with some specificity but generic celebration (\"You're doing great\") or flat close without direction. Client leaves satisfied but not energized.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "Abrupt end. Client leaves without emotional reinforcement or directional clarity.",
        },
      ],
      positiveSignals: [
        "Celebration references something specific from THIS call",
        "Direction linked to next phase",
        "Client expresses enthusiasm or gratitude",
      ],
      negativeSignals: [
        "Generic \"good job\"",
        "No specific event referenced",
        "Flat tone",
        "Close rushed because booking ran late",
      ],
    },

    {
      id: "D10",
      n: 10,
      name: "Next Call Booking",
      max: 5,
      pillar: "CONTINUITY",
      scoring: "discrete",
      whatToLookFor: "Is the next call booked LIVE before the call ends? Non-negotiable.",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Booked live on call (non-negotiable met). Booking link shared live. Client books during the call. Date confirmed verbally. Happens before the close.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "Not booked. Call ends without next call locked in live. Automatic 0, non-recoverable.",
        },
      ],
      positiveSignals: ["Date confirmed verbally", "\"We're locked in\"", "Booking completed before close begins"],
      negativeSignals: [
        "\"I'll send you the link later\"",
        "Call ends without booking",
        "\"Message me when you're free\"",
      ],
      notes: [
        "This dimension is binary by design — the rubric lists only 5 and 0. Marcus: \"Book your next call on the call. Always. I don't care if you're at minute 29.\"",
      ],
    },

    {
      id: "D11",
      n: 11,
      name: "Continuity & Follow-Up Clarity",
      max: 5,
      pillar: "CONTINUITY",
      scoring: "discrete",
      whatToLookFor:
        "Does the client know EXACTLY what happens after this call ends — what the coach will do, when, and how?",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Coach restates the accountability anchor explicitly. States their own follow-up with specific timing. Client can answer \"what happens next?\" without hesitation. Chain is clear: client does X by Y → coach delivers Z by W.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Follow-up mentioned but vague timing (\"I'll send you feedback this week\"). Anchor partially restated. Client unsure exactly what to expect or when.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "No post-call structure. Call ends with zero continuity visible.",
        },
      ],
      positiveSignals: [
        "Coach gives specific day for their deliverable",
        "Accountability anchor restated in closing",
        "Clear cause-and-effect chain between client action and coach response",
      ],
      negativeSignals: ["\"I'll check in\"", "\"Message me if you need anything\"", "No timeline on coach's deliverable"],
      notes: [
        "Scope: scored only on the in-call statement. Whether the coach actually delivered afterwards is post-call and cannot be verified from the transcript.",
      ],
    },

    {
      id: "D12",
      n: 12,
      name: "Structure & Time Management",
      max: 5,
      pillar: "FLOW",
      scoring: "discrete",
      whatToLookFor:
        "Did the call feel intentional and controlled — or scattered, rushed, or bloated? SOP target is 25–30 min.",
      buckets: [
        {
          label: "Elite",
          value: 5,
          criteria:
            "Call flows naturally through all applicable SOP sections. Pacing smooth — not rushed, not padded. Close and booking don't feel rushed. Client never confused about where the call is going. Framework is woven in, not announced.",
        },
        {
          label: "Mid",
          value: 3,
          criteria:
            "Slightly uneven pacing. Most sections covered. One section rushed or bloated, or 1 key section compressed to under 30 seconds.",
        },
        {
          label: "Fail",
          value: 0,
          criteria: "Disorganized. Core sections missing. Flow unclear to observer and probably to client.",
        },
      ],
      positiveSignals: [
        "Natural transitions between sections",
        "Close doesn't feel rushed",
        "No section noticeably absent",
      ],
      negativeSignals: [
        "Close rushed because time ran out",
        "Accountability section skipped",
        "Booking feels like an afterthought",
        "Coach loses track of flow mid-call",
      ],
      notes: [
        "SOP sections: check-in (~3 min), diagnostics review (~3–4 min if applicable), program focus + vision (~4–5 min), movement coaching (~8–10 min), adjustments + strategy (~3–4 min), action steps & accountability (~2–3 min), close + next call booking (~1–2 min).",
        "Robotic section announcements are a MID signal, not an ELITE signal. The framework is a container, not a script.",
        "The transcript carries no timestamps, so pacing must be inferred from turn distribution and section coverage rather than measured.",
      ],
    },
  ],
};
