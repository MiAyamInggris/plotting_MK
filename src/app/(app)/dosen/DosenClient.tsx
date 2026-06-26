"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, Plus, GraduationCap, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { StatusBadge } from "@/components/StatusBadge";

type TingkatPendidikan = "S2" | "S3" | "ON_GOING_S3";

type Dosen = {
  id: string;
  kode: string;
  nama: string;
  namaTanpaGelar: string;
  email: string | null;
  nipYpt: string | null;
  nidn: string | null;
  jfa: string | null;
  tmtJfa: string | null;
  homebaseProdiId: string | null;
  tingkatPendidikan: TingkatPendidikan | null;
  kkId: string | null;
  coeId: string | null;
  bebanStruktural: string | null;
  aktif: boolean;
  homebaseProdi: { kode: string; nama: string } | null;
  kk: { nama: string } | null;
  coe: { nama: string } | null;
};

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };
type Coe = { id: string; nama: string };

const JFA_OPTIONS = [
  "Asisten Ahli (150)",
  "Lektor (200)",
  "Lektor (300)",
  "Lektor Kepala (400)",
  "Lektor Kepala (550)",
  "NJFA",
];

const TINGKAT_OPTIONS: TingkatPendidikan[] = ["S2", "S3", "ON_GOING_S3"];
const ALL = "__all__";
const NONE = "__none__";

type ImportReport = {
  counts: Record<string, number>;
  warnings: { level: "warning" | "error"; message: string; context?: string }[];
};

type FormState = {
  kode: string;
  nama: string;
  namaTanpaGelar: string;
  email: string;
  nipYpt: string;
  nidn: string;
  jfa: string;
  tmtJfa: string;
  homebaseProdiId: string;
  tingkatPendidikan: string;
  kkId: string;
  coeId: string;
  bebanStruktural: string;
};

const EMPTY_FORM: FormState = {
  kode: "",
  nama: "",
  namaTanpaGelar: "",
  email: "",
  nipYpt: "",
  nidn: "",
  jfa: "",
  tmtJfa: "",
  homebaseProdiId: "",
  tingkatPendidikan: "",
  kkId: "",
  coeId: "",
  bebanStruktural: "",
};

function toPayload(f: FormState) {
  return {
    kode: f.kode,
    nama: f.nama,
    namaTanpaGelar: f.namaTanpaGelar,
    email: f.email || null,
    nipYpt: f.nipYpt || null,
    nidn: f.nidn || null,
    jfa: f.jfa || null,
    tmtJfa: f.tmtJfa || null,
    homebaseProdiId: f.homebaseProdiId || null,
    tingkatPendidikan: f.tingkatPendidikan || null,
    kkId: f.kkId || null,
    coeId: f.coeId || null,
    bebanStruktural: f.bebanStruktural || null,
  };
}

function DosenFields({
  value,
  onChange,
  programStudi,
  kelompokKeahlian,
  coeList,
  idPrefix,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
  coeList: Coe[];
  idPrefix: string;
}) {
  function set<K extends keyof FormState>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-kode`}>Kode</Label>
        <Input
          id={`${idPrefix}-kode`}
          required
          maxLength={10}
          value={value.kode}
          onChange={(e) => set("kode", e.target.value.toUpperCase())}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nama`}>Nama</Label>
        <Input
          id={`${idPrefix}-nama`}
          required
          value={value.nama}
          onChange={(e) => set("nama", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nama-tanpa-gelar`}>Nama tanpa gelar</Label>
        <Input
          id={`${idPrefix}-nama-tanpa-gelar`}
          required
          value={value.namaTanpaGelar}
          onChange={(e) => set("namaTanpaGelar", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={value.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nip`}>NIP YPT</Label>
        <Input
          id={`${idPrefix}-nip`}
          value={value.nipYpt}
          onChange={(e) => set("nipYpt", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-nidn`}>NIDN/NUPTK</Label>
        <Input
          id={`${idPrefix}-nidn`}
          value={value.nidn}
          onChange={(e) => set("nidn", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-jfa`}>JFA</Label>
        <Select value={value.jfa || NONE} onValueChange={(v) => set("jfa", v === NONE ? "" : v)}>
          <SelectTrigger id={`${idPrefix}-jfa`} className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {JFA_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tmt-jfa`}>TMT JFA</Label>
        <Input
          id={`${idPrefix}-tmt-jfa`}
          type="date"
          value={value.tmtJfa}
          onChange={(e) => set("tmtJfa", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-homebase`}>Homebase Prodi</Label>
        <Select
          value={value.homebaseProdiId || NONE}
          onValueChange={(v) => set("homebaseProdiId", v === NONE ? "" : v)}
        >
          <SelectTrigger id={`${idPrefix}-homebase`} className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {programStudi.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.kode} — {p.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tingkat`}>Tingkat Pendidikan</Label>
        <Select
          value={value.tingkatPendidikan || NONE}
          onValueChange={(v) => set("tingkatPendidikan", v === NONE ? "" : v)}
        >
          <SelectTrigger id={`${idPrefix}-tingkat`} className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {TINGKAT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-kk`}>Kelompok Keahlian</Label>
        <Select value={value.kkId || NONE} onValueChange={(v) => set("kkId", v === NONE ? "" : v)}>
          <SelectTrigger id={`${idPrefix}-kk`} className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {kelompokKeahlian.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-coe`}>COE</Label>
        <Select value={value.coeId || NONE} onValueChange={(v) => set("coeId", v === NONE ? "" : v)}>
          <SelectTrigger id={`${idPrefix}-coe`} className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {coeList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-beban`}>Beban Struktural</Label>
        <Input
          id={`${idPrefix}-beban`}
          value={value.bebanStruktural}
          onChange={(e) => set("bebanStruktural", e.target.value)}
        />
      </div>
    </div>
  );
}

export default function DosenClient({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Dosen[]>([]);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [kelompokKeahlian, setKelompokKeahlian] = useState<KelompokKeahlian[]>([]);
  const [coeList, setCoeList] = useState<Coe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterKkId, setFilterKkId] = useState(ALL);
  const [filterProdiId, setFilterProdiId] = useState(ALL);
  const [filterJfa, setFilterJfa] = useState(ALL);
  const [filterCoeId, setFilterCoeId] = useState(ALL);
  const [filterTingkat, setFilterTingkat] = useState(ALL);
  const [filterAktif, setFilterAktif] = useState(ALL);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [generatingAccounts, setGeneratingAccounts] = useState(false);
  const [accountsReport, setAccountsReport] = useState<ImportReport | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterKkId !== ALL) params.set("kkId", filterKkId);
    if (filterProdiId !== ALL) params.set("homebaseProdiId", filterProdiId);
    if (filterJfa !== ALL) params.set("jfa", filterJfa);
    if (filterCoeId !== ALL) params.set("coeId", filterCoeId);
    if (filterTingkat !== ALL) params.set("tingkatPendidikan", filterTingkat);
    if (filterAktif !== ALL) params.set("aktif", filterAktif);
    return params.toString();
  }, [search, filterKkId, filterProdiId, filterJfa, filterCoeId, filterTingkat, filterAktif]);

  async function loadDosen() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/dosen${query ? `?${query}` : ""}`);
      if (!res.ok) throw new Error("Failed to load dosen");
      const data = await res.json();
      setItems(data.dosen);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load dosen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadDosen, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    async function loadLookups() {
      const [prodiRes, kkRes, coeRes] = await Promise.all([
        fetch("/api/program-studi"),
        fetch("/api/kelompok-keahlian"),
        fetch("/api/coe"),
      ]);
      setProgramStudi((await prodiRes.json()).programStudi);
      setKelompokKeahlian((await kkRes.json()).kelompokKeahlian);
      setCoeList((await coeRes.json()).coe);
    }
    loadLookups();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/dosen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(createForm)),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create");
      }
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      toast.success("Dosen created");
      await loadDosen();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(d: Dosen) {
    setEditingId(d.id);
    setEditError(null);
    setEditForm({
      kode: d.kode,
      nama: d.nama,
      namaTanpaGelar: d.namaTanpaGelar,
      email: d.email ?? "",
      nipYpt: d.nipYpt ?? "",
      nidn: d.nidn ?? "",
      jfa: d.jfa ?? "",
      tmtJfa: d.tmtJfa ? d.tmtJfa.slice(0, 10) : "",
      homebaseProdiId: d.homebaseProdiId ?? "",
      tingkatPendidikan: d.tingkatPendidikan ?? "",
      kkId: d.kkId ?? "",
      coeId: d.coeId ?? "",
      bebanStruktural: d.bebanStruktural ?? "",
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/dosen/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(editForm)),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update");
      }
      setEditingId(null);
      toast.success("Dosen updated");
      await loadDosen();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: Dosen) {
    try {
      const res = await fetch(`/api/dosen/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !d.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(d.aktif ? "Dosen deactivated" : "Dosen activated");
      await loadDosen();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function onGenerateAccounts() {
    setGeneratingAccounts(true);
    setAccountsReport(null);
    try {
      const res = await fetch("/api/dosen/generate-accounts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to generate accounts");
      setAccountsReport(data.report);
      const created = data.report.counts.accountsCreated ?? 0;
      toast.success(created > 0 ? `${created} dosen account(s) created` : "No new accounts to create");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate accounts");
    } finally {
      setGeneratingAccounts(false);
    }
  }

  const columnCount = canEdit ? 11 : 10;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dosen</CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="outline" disabled={generatingAccounts}>
                  <UserPlus className="size-4" />
                  {generatingAccounts ? "Generating…" : "Generate Dosen Accounts"}
                </Button>
              }
              title="Generate login accounts for all dosen?"
              description="Creates a DOSEN-role login for every dosen with an email and NIP that doesn't already have an account. Default passwords are derived from NIP and must be changed on first login. Dosen already provisioned are skipped."
              confirmLabel="Generate"
              variant="default"
              onConfirm={onGenerateAccounts}
            />
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Add Dosen
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
                <SheetHeader className="border-b border-border">
                  <SheetTitle>Create Dosen</SheetTitle>
                </SheetHeader>
                <form onSubmit={onCreate} className="flex flex-1 flex-col">
                  <div className="flex-1 space-y-4 p-4">
                    <DosenFields
                      value={createForm}
                      onChange={setCreateForm}
                      programStudi={programStudi}
                      kelompokKeahlian={kelompokKeahlian}
                      coeList={coeList}
                      idPrefix="create"
                    />
                    {createError && <p className="text-sm text-destructive">{createError}</p>}
                  </div>
                  <SheetFooter className="border-t border-border">
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating…" : "Create"}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <InputGroup className="w-48">
              <InputGroupAddon>
                <Search className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="kode, nama, or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">KK</Label>
            <Select value={filterKkId} onValueChange={setFilterKkId}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {kelompokKeahlian.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Homebase</Label>
            <Select value={filterProdiId} onValueChange={setFilterProdiId}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {programStudi.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.kode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">JFA</Label>
            <Select value={filterJfa} onValueChange={setFilterJfa}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {JFA_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">COE</Label>
            <Select value={filterCoeId} onValueChange={setFilterCoeId}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {coeList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pendidikan</Label>
            <Select value={filterTingkat} onValueChange={setFilterTingkat}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {TINGKAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Active</Label>
            <Select value={filterAktif} onValueChange={setFilterAktif}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {accountsReport && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">
              Accounts created: {accountsReport.counts.accountsCreated ?? 0} · Skipped (no email):{" "}
              {accountsReport.counts.skippedNoEmail ?? 0} · Skipped (no NIP):{" "}
              {accountsReport.counts.skippedNoNip ?? 0}
            </p>
            {accountsReport.warnings.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {accountsReport.warnings.map((w, i) => (
                  <li
                    key={i}
                    className={
                      w.level === "error"
                        ? "rounded-md bg-destructive/10 px-2.5 py-1.5 text-destructive"
                        : "rounded-md bg-amber-100 px-2.5 py-1.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                    }
                  >
                    {w.context && <span className="font-mono text-xs opacity-70">[{w.context}] </span>}
                    {w.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 bg-card">Kode</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card">Email</TableHead>
              <TableHead className="sticky top-0 bg-card">NIP/NIDN</TableHead>
              <TableHead className="sticky top-0 bg-card">JFA</TableHead>
              <TableHead className="sticky top-0 bg-card">Homebase</TableHead>
              <TableHead className="sticky top-0 bg-card">Pendidikan</TableHead>
              <TableHead className="sticky top-0 bg-card">KK</TableHead>
              <TableHead className="sticky top-0 bg-card">COE</TableHead>
              <TableHead className="sticky top-0 bg-card">Status</TableHead>
              {canEdit && (
                <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={columnCount} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <EmptyState icon={GraduationCap} title="No dosen found" />
                </TableCell>
              </TableRow>
            ) : (
              items.map((d) => (
                <TableRow key={d.id} className="h-12">
                  <TableCell className="font-medium">{d.kode}</TableCell>
                  <TableCell>{d.nama}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.nipYpt ?? "—"} / {d.nidn ?? "—"}
                  </TableCell>
                  <TableCell>
                    {d.jfa ? <Badge variant="outline">{d.jfa}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{d.homebaseProdi?.kode ?? "—"}</TableCell>
                  <TableCell>{d.tingkatPendidikan ?? "—"}</TableCell>
                  <TableCell>
                    {d.kk ? <Badge variant="outline">{d.kk.nama}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{d.coe?.nama ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge active={d.aktif} />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(d)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleActive(d)}>
                          {d.aktif ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && (
          <p className="text-sm text-muted-foreground">{items.length} item(s)</p>
        )}
      </CardContent>

      {canEdit && (
        <Sheet open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
          <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
            <SheetHeader className="border-b border-border">
              <SheetTitle>Edit Dosen</SheetTitle>
            </SheetHeader>
            <form onSubmit={saveEdit} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 p-4">
                <DosenFields
                  value={editForm}
                  onChange={setEditForm}
                  programStudi={programStudi}
                  kelompokKeahlian={kelompokKeahlian}
                  coeList={coeList}
                  idPrefix="edit"
                />
                {editError && <p className="text-sm text-destructive">{editError}</p>}
              </div>
              <SheetFooter className="border-t border-border">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
}
