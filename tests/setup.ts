import { vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.stubEnv("NODE_ENV", "test");
process.env.AUTH_SECRET ??= "test-only-secret-at-least-thirty-two-characters";
process.env.AUTH_URL ??= "http://localhost:3100";
process.env.STORAGE_DIR ??= "./storage/cv";
process.env.LOG_LEVEL = "debug";
// Integration reads/writes must never use the development or production database.
const url =
  process.env.DATABASE_URL_TEST ??
  "postgresql://hirevelo:hirevelo_local@localhost:5432/hirevelo_test";
if (!new URL(url).pathname.endsWith("_test"))
  throw new Error("DATABASE_URL_TEST must point to a database ending in _test");
process.env.DATABASE_URL = url;
