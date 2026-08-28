import { renderToBuffer } from "@react-pdf/renderer";
import { getRun } from "@/lib/db";
import { ReportPdf } from "@/lib/pdf/ReportPdf";

/**
 * The report as a file.
 *
 * Server-rendered so the coach gets the same document every time, generated
 * from the stored run rather than from whatever the browser had on screen.
 * Node runtime: @react-pdf/renderer needs Node streams, not the edge runtime.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

function slug(s: string | null | undefined, fallback: string): string {
  const cleaned = (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned || fallback;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const run = await getRun(id).catch(() => null);
  if (!run) {
    return new Response("No run with that id.", { status: 404 });
  }
  if (run.status !== "complete" || !run.report) {
    // A PDF of a half-finished evaluation would be a document that looks
    // authoritative and is not.
    return new Response(
      `This run is ${run.status}. A PDF is only produced once scoring has finished.`,
      { status: 409 },
    );
  }

  const report = run.report;

  try {
    // Called as a plain function rather than through JSX: it returns the
    // <Document> element renderToBuffer wants, without a cast to bridge the
    // component's own prop types to DocumentProps.
    const buffer = await renderToBuffer(ReportPdf({ report, runId: id }));

    const name = `${slug(report.client, "call")}-${slug(report.callType, "evaluation")}-${report.totals.score}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(
      `The PDF could not be rendered: ${err instanceof Error ? err.message : "unknown error"}`,
      { status: 500 },
    );
  }
}
