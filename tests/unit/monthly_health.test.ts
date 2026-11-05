import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { auditReport } from "../../scripts/dependency-audit";
import { updateHealthIssue } from "../../scripts/monthly-health-alert";
import { localResourceUrls } from "../health/targets";
import { lighthouseReport, median } from "../health/reports";

describe("monthly health reporting", () => {
  it("checks canonical links locally and excludes external sites and protected pages", () => {
    expect(
      localResourceUrls(
        [
          "/games#cards",
          "https://www.almostyellow.co.uk/games",
          "/images/card.png",
          "https://example.com/",
          "mailto:hello@example.com",
          "data:image/png;base64,abc",
          "/admin",
          "/admin/films/add",
          "",
        ],
        "http://localhost:3000/films",
      ),
    ).toEqual([
      "http://localhost:3000/games",
      "http://localhost:3000/images/card.png",
    ]);
  });

  it("uses the middle measurement, not a single slow sample", () => {
    expect(median([9000, 1000, 1200])).toBe(1200);
    expect(median([1000, 2000])).toBe(1500);
    expect(() => median([])).toThrow("No measurements");
  });

  it("reports median Lighthouse scores and measurements and flags slow pages", () => {
    const directory = mkdtempSync(join(tmpdir(), "almostyellow-health-"));
    try {
      for (const [index, performance] of [0.95, 0.7, 0.6].entries()) {
        writeFileSync(
          join(directory, `${index.toString()}.report.json`),
          JSON.stringify({
            requestedUrl: "http://localhost:3000/games",
            categories: {
              accessibility: { score: 1 },
              seo: { score: 1 },
              "best-practices": { score: 1 },
              performance: { score: performance },
            },
            audits: {
              "largest-contentful-paint": {
                numericValue: [9000, 1200, 1000][index],
              },
              "cumulative-layout-shift": { numericValue: 0.02 },
              "total-byte-weight": { numericValue: 2048 },
            },
          }),
        );
      }
      const report = lighthouseReport(directory);
      expect(report.performanceWarning).toBe(true);
      expect(report.markdown).toContain(
        "| /games | 100 | 100 | 100 | 70 | 1200 | 0.020 | 2 |",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("refuses to report success when Lighthouse produces no reports", () => {
    const directory = mkdtempSync(join(tmpdir(), "almostyellow-health-"));
    try {
      expect(() => lighthouseReport(directory)).toThrow("no page reports");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("reports advisories and their dependency paths without claiming exploitability", () => {
    const report = auditReport(
      "Development",
      JSON.stringify({
        advisories: {
          example: {
            module_name: "tmp",
            title: "Path traversal",
            severity: "high",
            url: "https://github.com/advisories/example",
            patched_versions: ">=0.2.6",
            findings: [{ paths: [".>@lhci/cli>tmp"], dev: true }],
          },
        },
      }),
      1,
    );
    expect(report.passed).toBe(false);
    expect(report.markdown).toContain(".>@lhci/cli>tmp");
    expect(report.markdown).toContain("does not establish");
  });

  it("only reports a clean audit when the registry returned a valid successful result", () => {
    expect(auditReport("Production", '{"advisories":{}}', 0).passed).toBe(true);
    expect(() => auditReport("Production", '{"advisories":{}}', 1)).toThrow();
    expect(() =>
      auditReport("Production", '{"error":"registry unavailable"}', 1),
    ).toThrow();
    expect(() => auditReport("Production", "not JSON", 1)).toThrow();
  });
});

describe("monthly health issue alerts", () => {
  const marker = "<!-- almostyellow-monthly-health -->";
  function client(
    issues: {
      number: number;
      body: string;
      user: { login: string };
      pull_request?: unknown;
    }[] = [],
  ) {
    return {
      paginate: vi.fn().mockResolvedValue(issues),
      rest: {
        issues: {
          create: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
          createComment: vi.fn().mockResolvedValue({}),
        },
      },
    };
  }
  const options = {
    owner: "cjrace",
    repo: "almostyellow",
    runId: "123-1",
    runUrl: "https://github.com/cjrace/almostyellow/actions/runs/123",
    results: {
      quality: { result: "success" },
      dependencies: { result: "failure" },
    },
  };

  it("assigns a new alert to the owner when a check fails", async () => {
    const github = client();
    await updateHealthIssue({ github, ...options });
    expect(github.rest.issues.create.mock.lastCall?.[0]).toMatchObject({
      assignees: ["cjrace"],
    });
    expect(github.rest.issues.create.mock.lastCall?.[0]).toHaveProperty(
      "body",
      expect.stringContaining(options.runUrl),
    );
  });

  it("alerts for performance warnings even when both jobs pass", async () => {
    const github = client();
    await updateHealthIssue({
      github,
      ...options,
      results: {
        quality: {
          result: "success",
          outputs: { performance_warning: "true" },
        },
        dependencies: { result: "success" },
      },
    });
    expect(github.rest.issues.create.mock.lastCall?.[0]).toHaveProperty(
      "body",
      expect.stringContaining("performance warning"),
    );
  });

  it("updates and comments on the existing bot issue instead of opening another", async () => {
    const github = client([
      { number: 7, body: marker, user: { login: "github-actions[bot]" } },
    ]);
    await updateHealthIssue({ github, ...options });
    expect(github.rest.issues.create).not.toHaveBeenCalled();
    expect(github.rest.issues.createComment).toHaveBeenCalledOnce();
    expect(github.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 7 }),
    );
  });

  it("does not post the same run's alert twice", async () => {
    const github = client([
      {
        number: 7,
        body: `${marker}\n<!-- monthly-health-run:123-1 -->`,
        user: { login: "github-actions[bot]" },
      },
    ]);
    await updateHealthIssue({ github, ...options });
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
    expect(github.rest.issues.update).not.toHaveBeenCalled();
  });

  it("closes its issue after recovery and leaves user-created issues alone", async () => {
    const github = client([
      { number: 6, body: marker, user: { login: "cjrace" } },
      { number: 7, body: marker, user: { login: "github-actions[bot]" } },
    ]);
    await updateHealthIssue({
      github,
      ...options,
      results: {
        quality: { result: "success" },
        dependencies: { result: "success" },
      },
    });
    expect(github.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 7, state: "closed" }),
    );
  });

  it("treats an unfinished check as a problem", async () => {
    const github = client();
    await updateHealthIssue({
      github,
      ...options,
      results: {
        quality: { result: "skipped" },
        dependencies: { result: "success" },
      },
    });
    expect(github.rest.issues.create).toHaveBeenCalledOnce();
  });

  it("does not open an issue after a clean run", async () => {
    const github = client();
    await updateHealthIssue({
      github,
      ...options,
      results: {
        quality: { result: "success" },
        dependencies: { result: "success" },
      },
    });
    expect(github.rest.issues.create).not.toHaveBeenCalled();
  });
});
