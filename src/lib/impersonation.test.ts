import { describe, it, expect } from "vitest";
import { applyImpersonationOverlay, type ImpersonationState } from "./impersonation";
import type { AuthUser } from "./authz";

const admin: AuthUser = { id: "admin-1", role: "ADMIN", prodiId: null, kkId: null };
const kaprodi: AuthUser = { id: "kap-1", role: "KAPRODI", prodiId: "prodi-real", kkId: null };

const kaprodiState: ImpersonationState = {
  role: "KAPRODI",
  prodiId: "prodi-sample",
  kkId: null,
  scopeLabel: "IF — S1 Teknik Informatika",
};

describe("applyImpersonationOverlay", () => {
  it("returns the real user unchanged when there is no impersonation state", () => {
    expect(applyImpersonationOverlay(admin, null)).toBe(admin);
  });

  it("overlays role/prodiId/kkId for a real ADMIN with active impersonation state", () => {
    const result = applyImpersonationOverlay(admin, kaprodiState);
    expect(result.role).toBe("KAPRODI");
    expect(result.prodiId).toBe("prodi-sample");
    expect(result.impersonation).toEqual({
      impersonatedRole: "KAPRODI",
      impersonatedScopeLabel: "IF — S1 Teknik Informatika",
    });
  });

  it("keeps the real Admin's id even while impersonating, for audit attribution", () => {
    const result = applyImpersonationOverlay(admin, kaprodiState);
    expect(result.id).toBe("admin-1");
  });

  it("never overlays a non-admin real user, even with a present impersonation state", () => {
    const result = applyImpersonationOverlay(kaprodi, kaprodiState);
    expect(result).toBe(kaprodi);
    expect(result.role).toBe("KAPRODI");
    expect(result.prodiId).toBe("prodi-real");
    expect(result.impersonation).toBeUndefined();
  });
});
