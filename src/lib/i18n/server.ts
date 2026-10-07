import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createTranslator, localeCookie, parseLocale } from "@/lib/i18n";
export const getLocale = cache(async () =>
  parseLocale((await cookies()).get(localeCookie)?.value),
);
export async function getTranslator() {
  return createTranslator(await getLocale());
}
