import { describe, it, expect } from "vitest";
import { buildActorFields } from "./activityLog";
import type { AuthUser } from "./authz";

describe("buildActorFields", () => {
  it("attributes a normal (non-impersonated) action to the acting user's own role", () => {
    const user: AuthUser = { id: "kap-1", role: "KAPRODI", prodiId: "prodi-1" };
    expect(buildActorFields(user)).toEqual({
      actorUserId: "kap-1",
      actorRole: "KAPRODI",
      impersonatedRole: null,
      impersonatedScope: null,
    });
  });

  it("attributes an impersonated action to the real Admin's id, with impersonation metadata set", () => {
    const user: AuthUser = {
      id: "admin-1",
      role: "KAPRODI",
      prodiId: "prodi-sample",
      impersonation: { impersonatedRole: "KAPRODI", impersonatedScopeLabel: "IF — S1 Teknik Informatika" },
    };
    expect(buildActorFields(user)).toEqual({
      actorUserId: "admin-1",
      actorRole: "KAPRODI",
      impersonatedRole: "KAPRODI",
      impersonatedScope: "IF — S1 Teknik Informatika",
    });
  });
});
