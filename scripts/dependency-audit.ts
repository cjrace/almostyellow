import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { writeHealthReport } from "../tests/health/reports.ts";

const auditSchema = z.object({
  advisories: z.record(
    z.string(),
    z.object({
      module_name: z.string(),
      title: z.string(),
      severity: z.string(),
      url: z.url(),
      patched_versions: z.string().nullable().optional(),
      findings: z.array(
        z.object({ paths: z.array(z.string()), dev: z.boolean().optional() }),
      ),
    }),
  ),
});

export function auditReport(
  name: string,
  output: string,
  status: number | null,
) {
  const parsed = auditSchema.safeParse(JSON.parse(output));
  if (!parsed.success)
    throw new Error(
      `${name}: the registry did not return a valid dependency audit.`,
    );
  const advisories = Object.values(parsed.data.advisories);
  if (advisories.length === 0 && status !== 0)
    throw new Error(
      `${name}: the dependency audit failed without a usable result.`,
    );
  const rows = advisories.map((advisory) => {
    const paths = [
      ...new Set(advisory.findings.flatMap((finding) => finding.paths)),
    ];
    return `- **${advisory.severity}: ${advisory.module_name}** — [${advisory.title}](${advisory.url}). Fixed versions: ${advisory.patched_versions ?? "none reported"}.\n  Paths: ${paths.map((path) => `\`${path}\``).join(", ")}`;
  });
  return {
    passed: status === 0 && advisories.length === 0,
    markdown: [
      `## ${name}`,
      advisories.length === 0
        ? "No known advisories reported."
        : `${advisories.length.toString()} advisories. Installed versions need assessment; this does not establish that each issue is exploitable.`,
      ...rows,
    ].join("\n"),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  mkdirSync("health-reports", { recursive: true });
  writeFileSync("health-reports/dependencies.md", "");
  let passed = true;
  for (const [scope, command] of [
    ["Production dependencies", "pnpm audit --prod --json"],
    ["All dependencies, including development tools", "pnpm audit --json"],
  ]) {
    const result = spawnSync(command, {
      shell: true,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    const file = scope.startsWith("Production")
      ? "audit-production.json"
      : "audit-all.json";
    writeFileSync(`health-reports/${file}`, result.stdout);
    try {
      const report = auditReport(scope, result.stdout, result.status);
      writeHealthReport("dependencies.md", report.markdown);
      console.log(report.markdown);
      passed = passed && report.passed;
    } catch (error) {
      passed = false;
      const message =
        error instanceof Error
          ? error.message
          : "Dependency audit could not finish.";
      writeHealthReport(
        "dependencies.md",
        `## ${scope}\nAudit could not finish: ${message}`,
      );
      console.error(message, result.stderr);
    }
  }
  process.exitCode = passed ? 0 : 1;
}
