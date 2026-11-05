const marker = "<!-- almostyellow-monthly-health -->";

interface Issue {
  number: number;
  body: string | null;
  pull_request?: unknown;
  user: { login: string } | null;
}

interface GitHub {
  paginate: (
    route: string,
    options: {
      owner: string;
      repo: string;
      state: string;
      creator: string;
      per_page: number;
    },
  ) => Promise<Issue[]>;
  rest: {
    issues: {
      create: (options: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        assignees: string[];
      }) => Promise<unknown>;
      update: (options: {
        owner: string;
        repo: string;
        issue_number: number;
        body?: string;
        state?: "closed";
      }) => Promise<unknown>;
      createComment: (options: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<unknown>;
    };
  };
}

export async function updateHealthIssue({
  github,
  owner,
  repo,
  runUrl,
  runId,
  results,
}: {
  github: GitHub;
  owner: string;
  repo: string;
  runUrl: string;
  runId: string;
  results: Partial<
    Record<string, { result: string; outputs?: Record<string, string> }>
  >;
}) {
  const names = {
    quality: "Website checks: Lighthouse, links and images",
    dependencies: "Dependency audit",
  };
  const performanceWarning =
    results.quality?.outputs?.performance_warning === "true";
  const failed =
    performanceWarning ||
    Object.keys(names).some((name) => results[name]?.result !== "success");
  const issues = await github.paginate("GET /repos/{owner}/{repo}/issues", {
    owner,
    repo,
    state: "open",
    creator: "github-actions[bot]",
    per_page: 100,
  });
  const issue = issues.find(
    (item) =>
      !item.pull_request &&
      item.user?.login === "github-actions[bot]" &&
      item.body?.includes(marker),
  );
  const runMarker = `<!-- monthly-health-run:${runId} -->`;
  if (issue?.body?.includes(runMarker)) return;
  const rows = Object.entries(names).map(
    ([name, label]) =>
      `- ${label}: **${results[name]?.result ?? "not run"}${name === "quality" && performanceWarning ? "; performance warning" : ""}**`,
  );
  const body = [
    marker,
    failed
      ? "The monthly health check found problems or could not complete."
      : "All monthly health checks passed.",
    "",
    ...rows,
    "",
    `[Open the run summary and reports](${runUrl}).`,
    "",
    "Dependency findings include development tools and require assessment before deciding whether they affect the live site.",
    runMarker,
  ].join("\n");
  if (failed && !issue) {
    await github.rest.issues.create({
      owner,
      repo,
      title: "Monthly health check: issues found",
      body,
      assignees: ["cjrace"],
    });
  } else if (issue) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body,
    });
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: issue.number,
      body,
      ...(failed ? {} : { state: "closed" as const }),
    });
  }
}
