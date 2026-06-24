// Single source of truth for "plotting workbook sheet name" -> ProgramStudi.kode.
// Adjust here if a new prodi sheet is added or a code changes.
export const PRODI_SHEET_MAPPING: Record<string, string> = {
  IF: "IF",
  SI: "SI",
  SE: "SE",
  SD: "SD",
  "S1 TT": "TT_S1",
  "S1 TT AJ": "TT_S1_AJ",
  "D3 TT": "TT_D3",
  TE: "TE",
  TB: "TB",
  DP: "DP",
  DKV: "DKV",
  TL: "TL",
  BD: "BD",
  TI: "TI",
  TP: "TP",
};

// "HOMEBASE (Prodi)" values from the dosen master -> ProgramStudi.kode.
export const HOMEBASE_PRODI_MAPPING: Record<string, string> = {
  "S1 Teknik Informatika": "IF",
  "S1 Sistem Informasi": "SI",
  "S1 Rekayasa Perangkat Lunak": "SE",
  "S1 Sains Data": "SD",
  "S1 Teknik Telekomunikasi": "TT_S1",
  "D3 Teknik Telekomunikasi": "TT_D3",
  "S1 Teknik Elektro": "TE",
  "S1 Teknik Biomedis": "TB",
  "S1 Desain Produk": "DP",
  "S1 Desain Komunikasi Visual": "DKV",
  "S1 Teknik Industri": "TI",
  "S1 Teknik Logistik": "TL",
  "S1 Bisnis Digital": "BD",
  "S1 Teknologi Pangan": "TP",
};
