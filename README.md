# Plotting MK

Internal web app for managing the *plotting* (assignment) of lecturers (dosen) to course
class-sections (kelas) each semester, and tracking each lecturer's teaching load (beban dosen).
Replaces a manual Excel-based workflow with a database-backed tool.

## Tech stack

Next.js (App Router, TypeScript) · PostgreSQL on Neon · Prisma · NextAuth (Credentials) ·
Tailwind CSS · SheetJS (`xlsx`) · Zod.

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

`prisma db seed` creates:

- The 9 registered Kelompok Keahlian and 15 Program Studi.
- The active SemesterPeriode (`Ganjil 2025/2026`).
- Per-prodi `Kebutuhan SKS` recap targets (from the source workbook; DKV is left unset since its
  source cell is a broken formula — set it manually via the Recap page).
- A default Admin account: `admin@local` / `changeme`. **Change this password after first login.**

Verify the setup with `GET /api/health` — it should return `{ "ok": true }`.

## Roles

Three roles, enforced server-side on every route (not just hidden in the UI):

- **Admin** — manages users (and binds Kaprodi → Prodi, Ketua KK → KK), manages all master data
  (Dosen, KK, Prodi, COE), runs imports, and has full access as a superuser.
- **Kaprodi** — bound to one Program Studi. Creates/edits Mata Kuliah, SKS, and course offerings
  for their own prodi only. Read-only on the Plotting board.
- **Ketua KK** — bound to one Kelompok Keahlian. Assigns/reassigns/clears the pengampu (lecturer)
  on course sections, restricted to lecturers in their own KK (Admin may override). Cannot create
  courses, change SKS, or manage users.

Admin creates Kaprodi and Ketua KK accounts via `/users`.

## Importing data

Import page: `/import` (Admin only). Two separate, idempotent imports — re-running either updates
existing records rather than duplicating them:

1. **Dosen master** (`Data Dosen 2026_TUP_ Maret 2026.xlsx`, sheet `DOSEN`) — run this first. Upserts
   lecturers by `kode`.
2. **Plotting workbook** (`Plotting MK Tawar KK Semester Ganjil 2025_2026.xlsx`) — sets each
   lecturer's `bebanStruktural` from the `Beban Dosen` sheet, then parses every per-prodi sheet's
   semester blocks into Mata Kuliah / Course Offerings / Kelas, matching sections to dosen by kode.

Both source files are expected locally at `data/` (gitignored — never committed; the database is
the source of truth after import). For local testing, each import section has a "Use local data/
file" button that reads directly from that folder instead of requiring a manual upload.

The import report lists counts (created vs. updated) and warnings (unrecognized KK/prodi/COE
names, unknown dosen codes, unparseable dates, duplicate section labels, etc.) — review these
after every import.

### Sheet name → ProgramStudi code mapping

Defined in [`src/lib/import/prodiMapping.ts`](src/lib/import/prodiMapping.ts):

| Sheet | Kode | Sheet | Kode |
|---|---|---|---|
| IF | IF | D3 TT | TT_D3 |
| SI | SI | TE | TE |
| SE | SE | TB | TB |
| SD | SD | DP | DP |
| S1 TT | TT_S1 | DKV | DKV |
| S1 TT AJ | TT_S1_AJ | TL | TL |
| | | BD | BD |
| | | TI | TI |
| | | TP | TP |

## Business rules

Centralized in [`src/lib/validation/rules.ts`](src/lib/validation/rules.ts) and
[`src/lib/config.ts`](src/lib/config.ts):

- SKS load cap: warns (doesn't block) when a lecturer's total SKS for the active period exceeds
  `DEFAULT_SKS_CAP` (default 15).
- Cross-KK assignment: blocked for Ketua KK, overridable by Admin (`CROSS_KK_RULE`).
- Inactive dosen cannot be assigned (hard error).
- Cross-prodi teaching is a soft warning.

## Recap & export

`/recap` — Beban Dosen (per-lecturer load, filterable by KK/prodi), Per-Prodi Summary
(Kebutuhan vs. Sudah Diampu vs. Kekurangan SKS; Admin can edit the target), and Pivot Individu
(per-lecturer drill-down by kode). "Export current plotting" downloads a `.xlsx` reproducing the
source workbook's per-prodi block layout, suitable for re-import.

## Development

```bash
npx tsc --noEmit   # type-check
npx eslint .       # lint
npm run build      # production build
npm run test       # unit tests (import parser, validation rules) — vitest
npm run test:e2e   # e2e happy path (login → import → reassign → recap) — playwright,
                   # requires the dev server reachable at localhost:3000
```

## Environment variables

See `.env.example`. `DATABASE_URL` is the pooled Neon connection (runtime); `DIRECT_URL` is the
non-pooled connection (Prisma Migrate only, bypasses PgBouncer).
