import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

// Prints one summary after the dots: counts, then only what needs attention.
// A test that fails and then passes on retry is reported as passed by
// Playwright, so flaky ones are listed here by name.
export default class SummaryReporter implements Reporter {
  private flaky: TestCase[] = [];
  private skipped: TestCase[] = [];
  private failed: TestCase[] = [];
  private passed = 0;

  printsToStdio() {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Only the last attempt of each test counts
    if (result.status === "skipped") this.skipped.push(test);
    else if (test.outcome() === "unexpected") {
      if (result.retry === test.retries) this.failed.push(test);
    } else if (result.status === "passed") {
      this.passed++;
      if (test.outcome() === "flaky") this.flaky.push(test);
    }
  }

  onEnd(result: FullResult) {
    const counts = [
      [this.passed, "passed"],
      [this.failed.length, "failed"],
      [this.skipped.length, "skipped"],
      [this.flaky.length, "flaky"],
    ].map(([count, label]) => String(count) + " " + String(label));
    const seconds = (result.duration / 1000).toFixed(0);
    const lines = ["", `Playwright: ${counts.join(", ")} (${seconds}s)`];
    const list = (title: string, tests: TestCase[]) => {
      if (tests.length === 0) return;
      lines.push(`${title}:`);
      for (const test of tests) {
        const name = test.titlePath().slice(2).join(" > ");
        lines.push("  [" + (test.parent.project()?.name ?? "") + "] " + name);
      }
    };
    list("Failed", this.failed);
    list("Skipped", this.skipped);
    list("Flaky (passed only after a retry)", this.flaky);
    console.log(lines.join("\n"));
  }
}
