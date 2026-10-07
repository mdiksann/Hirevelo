import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getActiveAuthSession, verifyCredentials } from "@/lib/queries/auth";

const maxAge = 30 * 24 * 60 * 60;
export const authConfig = {
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/sign-in", error: "/sign-in" },
  session: { strategy: "jwt", maxAge },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        portal: { type: "text" },
      },
      async authorize(credentials, request) {
        const user = await verifyCredentials(credentials);
        if (!user)
          logger.warn("auth_invalid_credentials", {
            code: "INVALID_CREDENTIALS",
            requestId:
              request.headers.get("x-request-id") ?? crypto.randomUUID(),
          });
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sessionId = crypto.randomUUID();
        await prisma.session.create({
          data: {
            sessionToken: token.sessionId,
            expires: new Date(Date.now() + maxAge * 1000),
            user: { connect: { id: user.id } },
          },
          select: { id: true },
        });
      }
      if (typeof token.sessionId !== "string") return null;
      const session = await getActiveAuthSession(token.sessionId);
      if (!session || session.expires.getTime() <= Date.now()) return null;
      token.sub = session.user.id;
      token.role = session.user.role;
      return token;
    },
    session({ session, token }) {
      if (
        token.sub &&
        (token.role === "RECRUITER" || token.role === "CANDIDATE")
      ) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      logger.info("auth_signed_in", {
        actorId: user.id,
        requestId: crypto.randomUUID(),
      });
    },
    async signOut(message) {
      if ("token" in message && typeof message.token?.sessionId === "string") {
        await prisma.session.deleteMany({
          where: { sessionToken: message.token.sessionId },
        });
      }
    },
  },
  logger: {
    error(error) {
      logger.error("auth_failed", {
        code:
          "type" in error && typeof error.type === "string"
            ? error.type
            : "AUTH_ERROR",
        requestId: crypto.randomUUID(),
      });
    },
    warn(code) {
      logger.warn("auth_warning", { code, requestId: crypto.randomUUID() });
    },
    debug() {},
  },
} satisfies NextAuthConfig;
export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
