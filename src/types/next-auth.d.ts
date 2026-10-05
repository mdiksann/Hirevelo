import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "RECRUITER" | "CANDIDATE";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionId?: string;
    role?: "RECRUITER" | "CANDIDATE";
  }
}
