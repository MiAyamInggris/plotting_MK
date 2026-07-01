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
const ketuaKk: AuthUser = { id: "u2", role: "KETUA_KK", kkId: "kk-1" };

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

describe("DLB are globally assignable — Ketua KK bypasses KK-scope for DLB (R22)", () => {
  it("Ketua KK can plot a DLB from a different KK", () => {
    expect(canPlot(ketuaKk, { kkId: "kk-99", jenis: "DLB" })).toMatchObject({ allowed: true });
  });

  it("Ketua KK can plot a DLB with no KK bound", () => {
    expect(canPlot(ketuaKk, { kkId: null, jenis: "DLB" })).toMatchObject({ allowed: true });
  });

  it("Ketua KK can plot a DLB from their own KK", () => {
    expect(canPlot(ketuaKk, { kkId: "kk-1", jenis: "DLB" })).toMatchObject({ allowed: true });
  });

  it("Ketua KK is still blocked from cross-KK tetap dosen", () => {
    expect(canPlot(ketuaKk, { kkId: "kk-99", jenis: "TETAP" })).toMatchObject({ allowed: false });
  });

  it("Ketua KK can still plot tetap dosen in their own KK", () => {
    expect(canPlot(ketuaKk, { kkId: "kk-1", jenis: "TETAP" })).toMatchObject({ allowed: true });
  });
});
