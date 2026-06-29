import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/lib/validation/auth";
import { logActivity } from "@/lib/activityLog";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.aktif) return null;

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          prodiId: user.prodiId,
          kkId: user.kkId,
          dosenId: user.dosenId,
        };
      },
    }),
  ],
  // LOGIN/LOGOUT are always logged as the real authenticating user, never
  // through the impersonation overlay (that only applies once inside the
  // app, after a real login has already happened).
  events: {
    async signIn({ user }) {
      if (!user.id || !user.role) return;
      await logActivity({
        user: { id: user.id, role: user.role, prodiId: user.prodiId, kkId: user.kkId },
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
      });
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (!token?.sub || !token.role) return;
      await logActivity({
        user: { id: token.sub, role: token.role, prodiId: token.prodiId ?? null, kkId: token.kkId ?? null },
        action: "LOGOUT",
        entityType: "User",
        entityId: token.sub,
      });
    },
  },
});
