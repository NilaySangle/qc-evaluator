import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Report } from "../report-types";
import { bandColor, formatScore } from "../ui";

/**
 * The PDF the coach receives.
 *
 * Rendered on the server with @react-pdf/renderer rather than by driving a
 * headless browser. Two reasons. Chromium on a serverless function is a large
 * cold-start tax for a document this simple. And a browser print dialog hands
 * the coach whatever their page happened to look like — margins, backgrounds,
 * cut-off rows — while this produces the same artifact every time, from the
 * same data the page renders.
 *
 * The layout is not the web page shrunk. Screen affordances (collapse arrows,
 * the download button, the run id) are gone, and evidence is always expanded,
 * because paper has no disclosure triangle.
 */

const INK = "#232A33";
const INK_SOFT = "#5A6472";
const INK_MUTE = "#8A93A0";
const HAIRLINE = "#E2E6EB";
const PAPER_SUNK = "#F6F7F8";
const BRAND = "#1F6B54";
const BRAND_SOFT = "#EEF5F2";
const DANGER = "#A8342A";
const DANGER_SOFT = "#FBEEEC";

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 46,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: INK,
    lineHeight: 1.5,
  },

  eyebrow: { fontSize: 6.5, letterSpacing: 1.3, color: INK_MUTE, textTransform: "uppercase" },
  sectionLabel: {
    fontSize: 6.5,
    letterSpacing: 1.3,
    color: INK_MUTE,
    textTransform: "uppercase",
    marginBottom: 5,
  },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  clientName: {
    fontSize: 21,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.3,
    lineHeight: 1.15,
    marginTop: 6,
    marginBottom: 3,
  },
  coachLine: { fontSize: 9, color: INK_SOFT, marginTop: 2 },
  summary: { fontSize: 8.5, color: INK_MUTE, marginTop: 5, maxWidth: 330 },

  scoreBox: { alignItems: "flex-end", minWidth: 96 },
  scoreNum: { fontSize: 34, fontFamily: "Helvetica-Bold", letterSpacing: -1, lineHeight: 1 },
  scoreOutOf: { fontSize: 8, color: INK_MUTE },
  bandText: { fontSize: 7.5, letterSpacing: 1.1, textTransform: "uppercase", marginTop: 2 },

  rule: { borderBottomWidth: 1, borderBottomColor: HAIRLINE, marginVertical: 14 },

  oneThing: { fontSize: 14.5, fontFamily: "Times-Italic", lineHeight: 1.4, color: INK },
  projection: { fontSize: 8, color: INK_SOFT, marginTop: 6 },

  body: { fontSize: 9, color: INK_SOFT, lineHeight: 1.55 },

  capBox: {
    borderWidth: 1,
    borderColor: "#EBC9C4",
    backgroundColor: DANGER_SOFT,
    borderRadius: 4,
    padding: 7,
    marginBottom: 5,
  },
  capEffect: { fontSize: 7, letterSpacing: 0.8, color: DANGER, textTransform: "uppercase" },
  capCondition: { fontSize: 8.5, color: INK, marginTop: 2 },
  capMeasure: { fontSize: 7.5, color: INK_SOFT, marginTop: 2 },

  flagRow: { flexDirection: "row", marginBottom: 7 },
  flagDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4, marginRight: 7 },
  flagTitle: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  flagDetail: { fontSize: 8.5, color: INK_SOFT, marginTop: 1 },

  dim: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 8,
    paddingBottom: 8,
  },
  dimHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dimName: { fontSize: 9.5, fontFamily: "Helvetica-Bold", flex: 1, paddingRight: 8 },
  dimScore: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  dimMeta: { fontSize: 7, color: INK_MUTE, marginTop: 1 },
  dimRationale: { fontSize: 8.5, color: INK_SOFT, marginTop: 4 },

  evidence: {
    borderLeftWidth: 1.5,
    borderLeftColor: "#BFD6CD",
    paddingLeft: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  evidenceLine: { fontSize: 7.5, color: INK, fontFamily: "Times-Italic" },
  evidenceLabel: { fontSize: 6.5, color: BRAND },

  fixBox: {
    backgroundColor: BRAND_SOFT,
    borderRadius: 4,
    padding: 6,
    marginTop: 5,
  },
  fixLabel: { fontSize: 6.5, letterSpacing: 1, color: BRAND, textTransform: "uppercase" },
  fixText: { fontSize: 8.5, color: INK, marginTop: 1.5 },

  note: {
    backgroundColor: PAPER_SUNK,
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
    fontSize: 7.5,
    color: INK_SOFT,
  },

  auditBox: {
    backgroundColor: PAPER_SUNK,
    borderRadius: 5,
    padding: 10,
    marginTop: 14,
  },
  auditGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  auditCell: { width: "25%", paddingRight: 8, marginBottom: 6 },
  auditLabel: { fontSize: 6, letterSpacing: 0.8, color: INK_MUTE, textTransform: "uppercase" },
  auditValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
  auditNote: { fontSize: 6.5, color: INK_MUTE },

  footer: {
    position: "absolute",
    bottom: 26,
    left: 46,
    right: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 7,
    fontSize: 6.5,
    color: INK_MUTE,
  },
});

function Evidence({ items }: { items: Report["dimensions"][number]["evidence"] }) {
  if (items.length === 0) return null;
  return (
    <View style={s.evidence}>
      {items.map((e, i) => (
        <View key={i} style={{ marginBottom: i === items.length - 1 ? 0 : 2.5 }}>
          <Text style={s.evidenceLabel}>
            {e.label}
            {e.speaker ? ` · ${e.speaker}` : ""}
          </Text>
          <Text style={s.evidenceLine}>&ldquo;{e.quote}&rdquo;</Text>
        </View>
      ))}
    </View>
  );
}

export function ReportPdf({ report, runId }: { report: Report; runId: string }) {
  const color = bandColor(report.totals.band);
  const { oneThing, totals, meta } = report;

  return (
    <Document
      title={`${report.client ?? "Call"} — ${report.rubricTitle} evaluation`}
      author="QC Evaluator"
      subject={`${totals.score}/100 — ${totals.band}`}
    >
      <Page size="A4" style={s.page}>
        {/* header */}
        <View style={s.headerRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={s.eyebrow}>Full analysis · {report.rubricTitle}</Text>
            <Text style={s.clientName}>{report.client ?? "Unnamed client"}</Text>
            {report.coach && <Text style={s.coachLine}>Coached by {report.coach}</Text>}
            {report.callSummary && <Text style={s.summary}>{report.callSummary}</Text>}
          </View>
          <View style={s.scoreBox}>
            <Text style={[s.scoreNum, { color }]}>{totals.score}</Text>
            <Text style={s.scoreOutOf}>out of 100</Text>
            <Text style={[s.bandText, { color }]}>{totals.band}</Text>
            {totals.cappedFrom != null && (
              <Text style={{ fontSize: 6.5, color: INK_MUTE, marginTop: 1 }}>
                capped from {totals.cappedFrom}
              </Text>
            )}
          </View>
        </View>

        <View style={s.rule} />

        {/* the one thing */}
        <Text style={s.sectionLabel}>The one thing</Text>
        <Text style={s.oneThing}>&ldquo;{oneThing.text}&rdquo;</Text>
        {oneThing.projectedScore != null && (
          <Text style={s.projection}>
            {oneThing.dimensionName} scored {formatScore(oneThing.currentScore)}/{oneThing.max}. At{" "}
            {formatScore(oneThing.targetScore)}/{oneThing.max}, this call scores{" "}
            {oneThing.projectedScore}/100 — {oneThing.projectedBand}
            {oneThing.delta ? ` (+${oneThing.delta})` : ""}.
          </Text>
        )}

        <View style={s.rule} />

        {/* brief */}
        <Text style={s.sectionLabel}>The brief</Text>
        <Text style={s.body}>{report.brief}</Text>

        {/* caps */}
        {report.capsFired.length > 0 && (
          <>
            <View style={s.rule} />
            <Text style={s.sectionLabel}>Automatic caps</Text>
            {report.capsFired.map((c) => (
              <View
                key={c.id}
                style={[s.capBox, c.binding ? {} : { borderColor: HAIRLINE, backgroundColor: PAPER_SUNK }]}
                wrap={false}
              >
                <Text style={[s.capEffect, c.binding ? {} : { color: INK_SOFT }]}>
                  {c.effect}
                  {c.nonRecoverable && c.binding ? " · non-recoverable" : ""}
                </Text>
                <Text style={s.capCondition}>{c.condition}</Text>
                {c.measurement ? <Text style={s.capMeasure}>{c.measurement}</Text> : null}
                {!c.binding ? (
                  <Text style={s.capMeasure}>
                    Condition holds, but the call already scored below this ceiling, so no points were
                    removed.
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        )}

        {/* red flags */}
        <View style={s.rule} />
        <Text style={s.sectionLabel}>Red flags</Text>
        {report.redFlags.length === 0 ? (
          <Text style={s.body}>
            None found. Nothing in this transcript reads as a retention risk on its own.
          </Text>
        ) : (
          report.redFlags.map((f, i) => (
            <View key={i} style={s.flagRow} wrap={false}>
              <View style={[s.flagDot, { backgroundColor: f.severity === "high" ? DANGER : "#C98A2E" }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.flagTitle}>{f.title}</Text>
                <Text style={s.flagDetail}>{f.detail}</Text>
                <Evidence items={f.evidence} />
              </View>
            </View>
          ))
        )}

        {/* dimensions */}
        <View style={s.rule} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
          <Text style={s.sectionLabel}>Twelve dimensions</Text>
          <Text style={{ fontSize: 7, color: INK_MUTE }}>
            {totals.raw}/{totals.activeMax} raw
          </Text>
        </View>

        {report.dimensions.map((d) => (
          <View key={d.id} style={s.dim} wrap={false}>
            <View style={s.dimHead}>
              <Text style={s.dimName}>
                {d.n}. {d.name}
                {d.capNotes.length > 0 ? "  ★" : ""}
              </Text>
              <Text style={[s.dimScore, { color: d.disabled ? INK_MUTE : color }]}>
                {d.disabled ? "N/A" : `${formatScore(d.score)}/${d.max}`}
              </Text>
            </View>

            <Text style={s.dimMeta}>
              {d.disabled ? "Not scored" : d.bucketLabel}
              {d.pillar ? ` · ${d.pillar}` : ""}
              {!d.behaviourPresent && !d.disabled ? " · not present in transcript" : ""}
              {d.ceiling < d.max ? ` · capped at ${formatScore(d.ceiling)}/${d.max}` : ""}
            </Text>

            <Text style={s.dimRationale}>{d.disabled ? d.disabledReason : d.rationale}</Text>

            <Evidence items={d.evidence} />

            {d.integrity === "unsupported" && d.integrityNote ? (
              <Text style={[s.note, { backgroundColor: DANGER_SOFT, color: DANGER }]}>
                {d.integrityNote}
              </Text>
            ) : null}

            {!d.disabled && d.quickFix ? (
              <View style={s.fixBox}>
                <Text style={s.fixLabel}>Quick fix</Text>
                <Text style={s.fixText}>{d.quickFix}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* audit trail */}
        <View style={s.auditBox} wrap={false}>
          <Text style={s.sectionLabel}>How this score was produced</Text>
          <Text style={{ fontSize: 8, color: INK_SOFT }}>{totals.method}</Text>

          <View style={s.auditGrid}>
            <View style={s.auditCell}>
              <Text style={s.auditLabel}>Evidence</Text>
              <Text style={s.auditValue}>
                {meta.evidence.verified + meta.evidence.relocated}/{meta.evidence.total}
              </Text>
              <Text style={s.auditNote}>
                {meta.evidence.dropped > 0 ? `${meta.evidence.dropped} dropped` : "all verified"}
              </Text>
            </View>
            <View style={s.auditCell}>
              <Text style={s.auditLabel}>Coach talk share</Text>
              <Text style={s.auditValue}>
                {meta.coachTalkShare != null ? `${(meta.coachTalkShare * 100).toFixed(1)}%` : "—"}
              </Text>
              <Text style={s.auditNote}>measured</Text>
            </View>
            <View style={s.auditCell}>
              <Text style={s.auditLabel}>Transcript</Text>
              <Text style={s.auditValue}>{meta.transcriptTurns} turns</Text>
              <Text style={s.auditNote}>{meta.transcriptChars.toLocaleString()} chars</Text>
            </View>
            <View style={s.auditCell}>
              <Text style={s.auditLabel}>Rubric</Text>
              <Text style={s.auditValue}>{meta.rubricVersion.split("-")[0]}</Text>
              <Text style={s.auditNote}>{meta.model}</Text>
            </View>
          </View>

          {meta.notes.map((n, i) => (
            <Text key={i} style={{ fontSize: 7, color: INK_MUTE, marginTop: 3 }}>
              {n}
            </Text>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text>
            {report.client ?? "Call"} · {report.rubricTitle} · {totals.score}/100 {totals.band}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}  ·  run ${runId.slice(0, 8)}`}
          />
        </View>
      </Page>
    </Document>
  );
}
