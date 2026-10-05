import { execFileSync } from "node:child_process";
function setup() {
  const database =
    process.env.DATABASE_URL_TEST ??
    "postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test";
  if (!new URL(database).pathname.endsWith("_test"))
    throw new Error("E2E requires a disposable database ending in _test");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: database,
    NODE_ENV: "test",
    SEED_RECRUITER_EMAIL: "recruiter@example.com",
    SEED_RECRUITER_PASSWORD: "Demo-password-123",
  };
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env, stdio: "pipe" },
  );
  execFileSync(
    process.execPath,
    ["--conditions=react-server", "--import", "tsx", "prisma/seed.ts"],
    { env, stdio: "pipe" },
  );
}

setup();
