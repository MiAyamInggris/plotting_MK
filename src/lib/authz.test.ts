import { describe, it, expect } from "vitest";
import {
  canManageUsers,
  canManageMasterData,
  canManageSemesters,
  canEditCourses,
  canViewPlotting,
  canPlot,
  canRegisterDlb,
  type AuthUser,
} from "./authz";

const academic: AuthUser = { id: "u1", role: "ACADEMIC" };

describe("ACADEMIC is blocked from every mutation", () => {
  it("cannot manage users", () => {
    expect(canManageUsers(academic)).toBe(false);
  });

  it("cannot manage master data", () => {
    expect(canManageMasterData(academic)).toBe(false);
  });

  it("cannot manage semesters", () => {
    expect(canManageSemesters(academic)).toBe(false);
  });

  it("cannot edit courses, even for no specific prodi", () => {
    expect(canEditCourses(academic, "prodi-1")).toBe(false);
  });

  it("cannot plot a dosen", () => {
    expect(canPlot(academic, { kkId: "kk-1" })).toMatchObject({ allowed: false });
  });

  it("cannot clear a plotted dosen either", () => {
    expect(canPlot(academic, null)).toMatchObject({ allowed: false });
  });

  it("cannot register a DLB", () => {
    expect(canRegisterDlb(academic)).toBe(false);
  });

  it("can still view the read-only recap/plotting dashboards", () => {
    expect(canViewPlotting(academic)).toBe(true);
  });
});
