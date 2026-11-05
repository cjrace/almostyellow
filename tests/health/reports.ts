import { appendFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export function writeHealthReport(name: string, markdown: string) {
  mkdirSync("health-reports", { recursive: true });
  appendFileSync(join("health-reports", name), `${markdown}\n`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

export function median(values: number[]) {
  if (values.length === 0) throw new Error("No measurements were collected.");
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

const reportSchema = z.object({
  requestedUrl: z.url(),
  categories: z.partialRecord(
    z.string(),
    z.object({ score: z.number().nullable() }),
  ),
  audits: z.partialRecord(
    z.string(),
    z.object({ numericValue: z.number().optional() }),
  ),
});

export function lighthouseReport(directory: string) {
  const byUrl = new Map<string, z.infer<typeof reportSchema>[]>();
  for (const file of readdirSync(directory)) {
    if (!file.endsWith(".report.json")) continue;
    const report = reportSchema.parse(
      JSON.parse(readFileSync(join(directory, file), "utf8")),
    );
    const reports = byUrl.get(report.requestedUrl) ?? [];
    reports.push(report);
    byUrl.set(report.requestedUrl, reports);
  }
  if (byUrl.size === 0) throw new Error("Lighthouse produced no page reports.");
  let performanceWarning = false;
  const rows = [...byUrl].map(([url, reports]) => {
    const category = (name: string) =>
      median(
        reports.map((report) => {
          const value = report.categories[name]?.score;
          if (value === null || value === undefined)
            throw new Error(`Missing ${name} score for ${url}`);
          return value;
        }),
      );
    const score = (name: string) => Math.round(category(name) * 100);
    const metric = (name: string) =>
      median(
        reports.map((report) => {
          const value = report.audits[name]?.numericValue;
          if (value === undefined)
            throw new Error(`Missing ${name} measurement for ${url}`);
          return value;
        }),
      );
    const performance = score("performance");
    if (category("performance") < 0.8) performanceWarning = true;
    return `| ${new URL(url).pathname} | ${score("accessibility").toString()} | ${score("seo").toString()} | ${score("best-practices").toString()} | ${performance.toString()} | ${Math.round(metric("largest-contentful-paint")).toString()} | ${metric("cumulative-layout-shift").toFixed(3)} | ${Math.round(metric("total-byte-weight") / 1024).toString()} |`;
  });
  return {
    performanceWarning,
    markdown: [
      "## Lighthouse",
      "Median values from three runs per public page. Performance warns; the other score thresholds fail.",
      "| Page | Accessibility | SEO | Best practices | Performance | LCP (ms) | CLS | Transfer (KiB) |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...rows.sort(),
    ].join("\n"),
  };
}
