import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    prodiId: string | null;
    kkId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      prodiId: string | null;
      kkId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    prodiId?: string | null;
    kkId?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    prodiId?: string | null;
    kkId?: string | null;
  }
}
