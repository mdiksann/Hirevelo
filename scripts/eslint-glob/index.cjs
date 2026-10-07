/* eslint-disable @typescript-eslint/no-require-imports -- Next's ESLint plugin requires a CommonJS adapter. */
const { isAbsolute } = require("node:path");
const { globSync } = require("tinyglobby");

// Only @next/eslint-plugin-next uses this adapter (getRootDirs).
// Remove the unpatched braces dependency: GHSA-vfj7-8cjw-p6xm.
exports.globSync = (pattern, options) =>
  globSync(pattern, {
    ...options,
    absolute: isAbsolute(pattern),
    expandDirectories: false,
  }).map((directory) => directory.replace(/\/$/, ""));
