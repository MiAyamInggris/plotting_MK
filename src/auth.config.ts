import type { NextAuthConfig } from "next-auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/health"];

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isPublic = PUBLIC_PREFIXES.some((prefix) =>
        nextUrl.pathname.startsWith(prefix),
      );
      if (isPublic) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.prodiId = user.prodiId;
        token.kkId = user.kkId;
        token.dosenId = user.dosenId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.prodiId = token.prodiId ?? null;
        session.user.kkId = token.kkId ?? null;
        session.user.dosenId = token.dosenId ?? null;
      }
      return session;
    },
  },
};
