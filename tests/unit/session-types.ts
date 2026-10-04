import type { Session } from "next-auth";
const role: Session["user"]["role"] = "RECRUITER";
const candidate: Session["user"]["role"] = "CANDIDATE";
// @ts-expect-error Auth.js session roles cannot be arbitrary strings.
const invalid: Session["user"]["role"] = "ADMIN";
export const roles = { role, candidate, invalid };
