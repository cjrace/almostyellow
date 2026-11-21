import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
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
  private maxFailures = 0;
  private total = 0;
  private ran = new Set<TestCase>();

  printsToStdio() {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.maxFailures = config.maxFailures;
    this.total = suite.allTests().length;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.ran.add(test);
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
    // Count the tests that never started rather than the failures alone: a run
    // that finishes with exactly maxFailures failures didn't stop, and the
    // merged CI report adds up failures from shards that each stop on their own.
    const notRun = this.total - this.ran.size;
    if (
      this.maxFailures > 0 &&
      this.failed.length >= this.maxFailures &&
      notRun > 0
    )
      lines.push(
        `Stopped early after ${String(this.maxFailures)} failed tests, so ${String(notRun)} did not run.`,
      );
    list("Failed", this.failed);
    list("Skipped", this.skipped);
    list("Flaky (passed only after a retry)", this.flaky);
    console.log(lines.join("\n"));
  }
}
