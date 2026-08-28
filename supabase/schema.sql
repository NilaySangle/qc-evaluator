-- QC Evaluator — schema
--
-- Run this once in the Supabase SQL editor.
--
-- Two decisions worth stating, because the brief asks for the tables and leaves
-- them to us:
--
-- 1. Dimensions and evidence are their own tables rather than a JSON blob on
--    the run. Reading a report always pulls the whole thing, so a blob would be
--    marginally faster and considerably lazier. Rows mean the question this
--    system exists to answer at scale -- which coach loses points where, and on
--    which dimension across every call -- is a GROUP BY rather than a rewrite.
--    That aggregate view is out of scope here; the schema simply does not close
--    the door on it.
--
-- 2. The transcript lives in its own table. It is up to 65 kB, it is read once
--    during scoring and never again on the report page, and keeping it out of
--    `runs` means listing runs never drags megabytes of call text with it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- runs -----
create table if not exists public.runs (
  id                uuid primary key default gen_random_uuid(),
  call_type         text not null check (call_type in ('kickoff', 'coaching')),

  -- Lifecycle. `queued` exists so a row is present the instant the operator is
  -- redirected, before any model work has started.
  status            text not null default 'queued'
                      check (status in ('queued', 'running', 'complete', 'failed')),
  stage             text not null default 'identify'
                      check (stage in ('identify', 'scoring', 'verifying', 'narrating', 'done')),
  scored_count      int  not null default 0,
  dimension_count   int  not null default 12,

  -- A failed run says why. Both fields are shown on the run page.
  error_code        text,
  error_message     text,

  -- Written every time the worker makes progress. A run that claims to be
  -- running but has not touched this in minutes is dead, and the page says so
  -- instead of spinning forever.
  heartbeat_at      timestamptz,

  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  finished_at       timestamptz,

  -- Stamped for reproducibility: the same transcript scored twice should agree,
  -- and when it does not, these say what changed.
  model             text,
  rubric_version    text,

  -- Report-level results.
  coach_name        text,
  client_name       text,
  call_summary      text,
  brief             text,
  one_thing         jsonb,
  red_flags         jsonb not null default '[]'::jsonb,
  caps_fired        jsonb not null default '[]'::jsonb,
  totals            jsonb,
  meta              jsonb
);

create index if not exists runs_created_at_idx on public.runs (created_at desc);
create index if not exists runs_status_idx     on public.runs (status);
-- Supports the coach-level aggregate this schema is deliberately leaving room for.
create index if not exists runs_coach_idx      on public.runs (coach_name, call_type);

-- ---------------------------------------------------------- transcripts -----
create table if not exists public.transcripts (
  run_id      uuid primary key references public.runs (id) on delete cascade,
  raw_text    text not null,
  char_count  int  not null,
  turn_count  int  not null,
  word_count  int  not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------ run_dimensions -----
create table if not exists public.run_dimensions (
  id              bigserial primary key,
  run_id          uuid not null references public.runs (id) on delete cascade,

  dimension_id    text not null,          -- 'D1' … 'D12'
  ordinal         int  not null,
  name            text not null,
  pillar          text,

  score           numeric(4,1) not null,  -- numeric because kick-off allows 4.5
  max_score       int not null,
  ceiling         numeric(4,1) not null,  -- max after caps
  bucket_label    text not null,

  rationale       text not null,
  quick_fix       text not null,

  -- Absence and failure are different findings and are stored as different
  -- facts. A dimension can be scored low because the coach did it badly, or
  -- flagged not-present because the transcript never shows it.
  behaviour_present boolean not null,
  disabled          boolean not null default false,
  disabled_reason   text,

  -- How much weight the evidence behind this score can bear.
  integrity       text not null default 'ok'
                    check (integrity in ('ok', 'thin', 'unsupported')),
  integrity_note  text,

  cap_notes       jsonb not null default '[]'::jsonb,
  snap_note       text,

  unique (run_id, dimension_id)
);

create index if not exists run_dimensions_run_idx on public.run_dimensions (run_id, ordinal);
-- "Which dimension does the team lose most points on?" without a table scan.
create index if not exists run_dimensions_dim_idx on public.run_dimensions (dimension_id, score);

-- --------------------------------------------------------- run_evidence -----
-- One row per surviving citation. Only evidence that was found in the
-- transcript is stored: a quote that could not be located is not evidence, and
-- persisting it would mean a later reader has to re-derive that judgement.
create table if not exists public.run_evidence (
  id            bigserial primary key,
  run_id        uuid not null references public.runs (id) on delete cascade,
  dimension_id  text,                     -- null when the citation supports a red flag
  red_flag_idx  int,

  line_no       int  not null,
  line_label    text not null,
  speaker       text,
  quote         text not null,

  -- True when the model cited the wrong line and the quote was relocated to the
  -- line it actually came from.
  corrected     boolean not null default false,
  claimed_label text
);

create index if not exists run_evidence_run_idx on public.run_evidence (run_id, dimension_id);

-- ------------------------------------------------------------------ RLS -----
-- Every table is locked and no policy grants access. All reads and writes go
-- through the server with the service role key, which bypasses RLS. The anon
-- key is never used from the browser, so there is nothing for it to reach: a
-- transcript is a recording of a real client conversation and should not be one
-- guessed UUID away from being public.
alter table public.runs           enable row level security;
alter table public.transcripts    enable row level security;
alter table public.run_dimensions enable row level security;
alter table public.run_evidence   enable row level security;
