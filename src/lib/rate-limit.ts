import { isIP } from "node:net";
import { RateLimitError } from "@/lib/errors";

export const AUTH_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_ATTEMPTS = 10;
// ponytail: one-process limiter; use a shared store before scaling to multiple instances.
type Window = { count: number; expires: number };
export function createRateLimiter(windows = new Map<string, Window>()) {
  return (key: string, now = Date.now()) => {
    for (const [ip, window] of windows)
      if (window.expires <= now) windows.delete(ip);
    const window = windows.get(key) ?? {
      count: 0,
      expires: now + AUTH_WINDOW_MS,
    };
    if (window.count >= AUTH_ATTEMPTS)
      throw new RateLimitError(Math.ceil((window.expires - now) / 1000));
    window.count++;
    windows.set(key, window);
  };
}
const globalLimiter = globalThis as typeof globalThis & {
  authWindows?: Map<string, Window>;
};
export const limitAuthAttempt = createRateLimiter(
  (globalLimiter.authWindows ??= new Map<string, Window>()),
);

export function authIp(headers: Pick<Headers, "get">) {
  // The deployment ingress must overwrite/append this header; use the nearest proxy's address.
  const value = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return value && isIP(value) ? value : "unknown";
}
