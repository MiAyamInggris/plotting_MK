// Centralized, adjustable business-rule configuration.

// Default maximum SKS teaching load per lecturer per semester (Phase 7: warn, not block).
export const DEFAULT_SKS_CAP = 15;

// Cross-KK assignment rule (Phase 6 / Phase 7):
// - Admin may always override and assign a dosen from a different KK.
// - Ketua KK is hard-blocked from assigning a dosen outside their own KK.
export const CROSS_KK_RULE = {
  allowAdminOverride: true,
  blockForKetuaKk: true,
} as const;

// Import behavior when a KK / homebase Prodi name from the source spreadsheet
// doesn't match a registered record. Strict (default) leaves the field unset
// and records a warning, since the 9 KKs and ~15 Prodi are a fixed canonical
// list and an unrecognized name is more likely a typo than a new record.
// COE is exempt from this toggle: the dosen master is its authoritative
// source, so unrecognized COE names are always auto-created (upserted).
export const IMPORT_AUTO_CREATE_UNKNOWN_LOOKUPS = false;

