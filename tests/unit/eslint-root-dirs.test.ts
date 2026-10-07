import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ESLint } from "eslint";
import { afterAll, beforeAll, expect, it } from "vitest";

// The scoped glob adapter removes GHSA-vfj7-8cjw-p6xm.
// Exercise the plugin's actual caller so dependency upgrades check compatibility.
const require = createRequire(import.meta.url);
const { getRootDirs } =
  require("@next/eslint-plugin-next/dist/utils/get-root-dirs.js") as {
    getRootDirs: (context: {
      cwd: string;
      settings: { next?: { rootDir?: string | string[] } };
    }) => string[];
  };
const fixture = mkdtempSync(join(tmpdir(), "hirevelo-eslint-"));

beforeAll(() => {
  mkdirSync(join(fixture, "web"));
  mkdirSync(join(fixture, "admin"));
  mkdirSync(join(fixture, "web", "pages"));
  writeFileSync(join(fixture, "web", "pages", "index.js"), "");
  writeFileSync(join(fixture, "file.txt"), "not a directory");
});

afterAll(() => rmSync(fixture, { recursive: true, force: true }));

it("uses the lint working directory when rootDir is not configured", () => {
  expect(getRootDirs({ cwd: fixture, settings: {} })).toEqual([fixture]);
});

it("matches directory globs and brace patterns without including files", () => {
  for (const pattern of ["*", "{web,admin}"]) {
    expect(
      getRootDirs({
        cwd: fixture,
        settings: { next: { rootDir: `${fixture}/${pattern}` } },
      }).sort(),
    ).toEqual([join(fixture, "admin"), join(fixture, "web")]);
  }
});

it("handles rootDir arrays, normalized separators, and missing directories", () => {
  expect(
    getRootDirs({
      cwd: fixture,
      settings: {
        next: {
          rootDir: [
            join(fixture, "web").replaceAll("/", "\\"),
            join(fixture, "missing"),
          ],
        },
      },
    }),
  ).toEqual([join(fixture, "web")]);
});

it("still rejects internal HTML links when Next roots use a glob", async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.jsx"],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: {
          "@next/next": require("@next/eslint-plugin-next") as ESLint.Plugin,
        },
        settings: { next: { rootDir: `${fixture}/{web,admin}` } },
        rules: { "@next/next/no-html-link-for-pages": "error" },
      },
    ],
  });
  const [result] = await eslint.lintText('const link = <a href="/">Home</a>;', {
    filePath: "lint-fixture.jsx",
  });
  expect(result?.messages).toEqual([
    expect.objectContaining({
      ruleId: "@next/next/no-html-link-for-pages",
      severity: 2,
    }),
  ]);
});
