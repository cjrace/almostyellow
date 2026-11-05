import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FullResult,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import SummaryReporter from "../reporters/summary";

type Outcome = "expected" | "unexpected" | "flaky" | "skipped";

// The reporter reads only these fields, so plain objects stand in for
// Playwright's classes
function fakeTest(name: string, outcome: Outcome, retries = 1) {
  return {
    retries,
    outcome: () => outcome,
    titlePath: () => ["", "Mobile Chrome", "file.spec.ts", "suite", name],
    parent: { project: () => ({ name: "Mobile Chrome" }) },
  } as unknown as TestCase;
}

function fakeResult(status: TestResult["status"], retry = 0) {
  return { status, retry } as TestResult;
}

function summarise(run: (reporter: SummaryReporter) => void, duration = 5000) {
  const log = vi.spyOn(console, "log").mockReturnValue(undefined);
  const reporter = new SummaryReporter();
  run(reporter);
  reporter.onEnd({ status: "failed", duration } as FullResult);
  return log.mock.calls.map((call) => String(call[0])).join("\n");
}

describe("SummaryReporter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts passes and prints no lists when everything passed", () => {
    const output = summarise((r) => {
      r.onTestEnd(fakeTest("a", "expected"), fakeResult("passed"));
      r.onTestEnd(fakeTest("b", "expected"), fakeResult("passed"));
    });
    expect(output).toContain(
      "Playwright: 2 passed, 0 failed, 0 skipped, 0 flaky (5s)",
    );
    expect(output).not.toContain("Failed:");
    expect(output).not.toContain("Skipped:");
    expect(output).not.toContain("Flaky");
  });

  it("lists a test that failed every attempt once, after its last retry", () => {
    const test = fakeTest("always fails", "unexpected");
    const output = summarise((r) => {
      r.onTestEnd(test, fakeResult("failed", 0));
      r.onTestEnd(test, fakeResult("failed", 1));
    });
    expect(output).toContain("0 passed, 1 failed");
    expect(output).toContain(
      "Failed:\n  [Mobile Chrome] file.spec.ts > suite > always fails",
    );
    expect(output.match(/always fails/g)).toHaveLength(1);
  });

  it("lists a test that passed only after a retry as flaky and passed", () => {
    const test = fakeTest("sometimes fails", "flaky");
    const output = summarise((r) => {
      r.onTestEnd(
        fakeTest("sometimes fails", "unexpected"),
        fakeResult("failed", 0),
      );
      r.onTestEnd(test, fakeResult("passed", 1));
    });
    expect(output).toContain("1 passed, 0 failed, 0 skipped, 1 flaky");
    expect(output).toContain(
      "Flaky (passed only after a retry):\n  [Mobile Chrome] file.spec.ts > suite > sometimes fails",
    );
  });

  it("lists skipped tests by name", () => {
    const output = summarise((r) => {
      r.onTestEnd(fakeTest("not today", "skipped"), fakeResult("skipped"));
    });
    expect(output).toContain("0 passed, 0 failed, 1 skipped, 0 flaky");
    expect(output).toContain(
      "Skipped:\n  [Mobile Chrome] file.spec.ts > suite > not today",
    );
  });

  it("leaves terminal printing to the dot reporter", () => {
    expect(new SummaryReporter().printsToStdio()).toBe(false);
  });
});
