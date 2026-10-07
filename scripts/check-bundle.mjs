import { readFileSync } from "node:fs";
// Produced from actual script tags in the production-browser performance test.
// Includes framework/runtime; sums individually gzipped, deduplicated script assets.
const reports = JSON.parse(
  readFileSync("test-results/bundle-budget.json", "utf8"),
);
const budget = 150 * 1024;
const exceptionCeiling = 260 * 1024;
for (const report of reports)
  process.stdout.write(
    `${report.route}: ${(report.gzipBytes / 1024).toFixed(2)} KiB gzip (target 150 KiB)\n`,
  );
if (reports.some((report) => report.gzipBytes > budget)) {
  process.stderr.write(
    "HF-050: exceeds target; see the measured exception in TASKS.md.\n",
  );
  if (process.env.BUNDLE_STRICT === "true") process.exitCode = 1;
}

if (reports.some((report) => report.gzipBytes > exceptionCeiling)) {
  process.stderr.write(
    "HF-050 exception ceiling exceeded (260 KiB); investigate before merging.\n",
  );
  process.exitCode = 1;
}
