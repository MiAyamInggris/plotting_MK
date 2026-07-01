"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { RoleBadge, ROLE_LABEL } from "@/components/RoleBadge";

type AssignableRole = "DOSEN" | "KAPRODI" | "KETUA_KK";

type DosenRow = {
  id: string;
  kode: string;
  nama: string;
  email: string | null;
  nipYpt: string | null;
  homebaseProdiId: string | null;
  homebaseProdi: { kode: string; nama: string } | null;
  kkId: string | null;
  kk: { nama: string } | null;
  user: { id: string; role: Role; prodiId: string | null; kkId: string | null; aktif: boolean } | null;
};

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

const ALL = "__all__";
const NONE = "__none__";
const ASSIGNABLE_ROLES: AssignableRole[] = ["DOSEN", "KAPRODI", "KETUA_KK"];

export default function UsersClient() {
  const [dosenList, setDosenList] = useState<DosenRow[]>([]);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [kelompokKeahlian, setKelompokKeahlian] = useState<KelompokKeahlian[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterKkId, setFilterKkId] = useState(ALL);
  const [filterProdiId, setFilterProdiId] = useState(ALL);

  const [assigningDosen, setAssigningDosen] = useState<DosenRow | null>(null);
  const [assignRole, setAssignRole] = useState<AssignableRole>("DOSEN");
  const [assignProdiId, setAssignProdiId] = useState("");
  const [assignKkId, setAssignKkId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterKkId !== ALL) params.set("kkId", filterKkId);
    if (filterProdiId !== ALL) params.set("homebaseProdiId", filterProdiId);
    return params.toString();
  }, [search, filterKkId, filterProdiId]);

  async function loadDosen() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/dosen${query ? `?${query}` : ""}`);
      if (!res.ok) throw new Error("Failed to load dosen");
      const data = await res.json();
      setDosenList(data.dosen);
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
      const [prodiRes, kkRes] = await Promise.all([
        fetch("/api/program-studi"),
        fetch("/api/kelompok-keahlian"),
      ]);
      setProgramStudi((await prodiRes.json()).programStudi);
      setKelompokKeahlian((await kkRes.json()).kelompokKeahlian);
    }
    loadLookups();
  }, []);

  function startAssign(d: DosenRow) {
    setAssigningDosen(d);
    setAssignRole(d.user?.role === "ADMIN" ? "DOSEN" : (d.user?.role as AssignableRole) ?? "DOSEN");
    setAssignProdiId(d.user?.prodiId ?? d.homebaseProdiId ?? "");
    setAssignKkId(d.user?.kkId ?? d.kkId ?? "");
    setAssignError(null);
  }

  const conflictWarning = useMemo(() => {
    if (!assigningDosen) return null;
    if (assignRole === "KAPRODI" && assignProdiId) {
      const holder = dosenList.find(
        (d) =>
          d.id !== assigningDosen.id &&
          d.user?.role === "KAPRODI" &&
          d.user.prodiId === assignProdiId &&
          d.user.aktif,
      );
      if (holder) return `${holder.kode} — ${holder.nama} is already Kaprodi for this Program Studi.`;
    }
    if (assignRole === "KETUA_KK" && assignKkId) {
      const holder = dosenList.find(
        (d) =>
          d.id !== assigningDosen.id &&
          d.user?.role === "KETUA_KK" &&
          d.user.kkId === assignKkId &&
          d.user.aktif,
      );
      if (holder) return `${holder.kode} — ${holder.nama} is already Ketua KK for this Kelompok Keahlian.`;
    }
    return null;
  }, [assigningDosen, assignRole, assignProdiId, assignKkId, dosenList]);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    if (!assigningDosen?.user) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/users/${assigningDosen.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: assignRole,
          prodiId: assignRole === "KAPRODI" ? assignProdiId : null,
          kkId: assignRole === "KETUA_KK" ? assignKkId : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update role");
      }
      toast.success(`${assigningDosen.kode} is now ${ROLE_LABEL[assignRole]}`);
      setAssigningDosen(null);
      await loadDosen();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setAssigning(false);
    }
  }

  async function toggleActive(d: DosenRow) {
    if (!d.user) return;
    try {
      const res = await fetch(`/api/users/${d.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !d.user.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update account");
      toast.success(d.user.aktif ? "Account deactivated" : "Account activated");
      await loadDosen();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update account");
    }
  }

  async function resetPassword(d: DosenRow) {
    if (!d.user) return;
    try {
      const res = await fetch(`/api/users/${d.user.id}/reset-password`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to reset password");
      }
      toast.success(`${d.kode}'s password was reset to the NIP-based default`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reset password");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <InputGroup className="w-56">
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
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 bg-card">Kode</TableHead>
              <TableHead className="sticky top-0 bg-card">Nama</TableHead>
              <TableHead className="sticky top-0 bg-card">Email</TableHead>
              <TableHead className="sticky top-0 bg-card">KK</TableHead>
              <TableHead className="sticky top-0 bg-card">Homebase</TableHead>
              <TableHead className="sticky top-0 bg-card">Role</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : dosenList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState icon={UserCog} title="No dosen found" />
                </TableCell>
              </TableRow>
            ) : (
              dosenList.map((d) => (
                <TableRow key={d.id} className="h-12">
                  <TableCell className="font-medium">{d.kode}</TableCell>
                  <TableCell>{d.nama}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.email ?? "—"}</TableCell>
                  <TableCell>{d.kk?.nama ?? "—"}</TableCell>
                  <TableCell>{d.homebaseProdi?.kode ?? "—"}</TableCell>
                  <TableCell>
                    {!d.user ? (
                      <Badge variant="secondary">No account</Badge>
                    ) : d.user.role === "ADMIN" ? (
                      <span className="text-xs text-muted-foreground">Admin account</span>
                    ) : (
                      <RoleBadge role={d.user.role} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!d.user ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* Disabled buttons don't reliably receive pointer events for
                                the tooltip trigger, so wrap in a focusable span instead. */}
                            <span tabIndex={0}>
                              <Button variant="outline" size="sm" disabled>
                                Assign role
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Generate Dosen Accounts on the Dosen page first
                          </TooltipContent>
                        </Tooltip>
                      ) : d.user.role === "ADMIN" ? null : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => startAssign(d)}>
                            Assign role
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toggleActive(d)}>
                            {d.user.aktif ? "Deactivate" : "Activate"}
                          </Button>
                          {d.nipYpt ? (
                            <ConfirmDialog
                              trigger={
                                <Button variant="outline" size="sm">
                                  Atur Ulang Kata Sandi
                                </Button>
                              }
                              title={`Atur ulang kata sandi ${d.kode}?`}
                              description="Kata sandi akan direset ke NIP sebelum tanda '-' (mis. 19910017-1 → 19910017). Dosen harus mengganti kata sandi saat login berikutnya."
                              confirmLabel="Atur Ulang"
                              variant="default"
                              onConfirm={() => resetPassword(d)}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span tabIndex={0}>
                                  <Button variant="outline" size="sm" disabled>
                                    Atur Ulang Kata Sandi
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>No NIP on file for this dosen</TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && (
          <p className="text-sm text-muted-foreground">{dosenList.length} item(s)</p>
        )}
      </CardContent>

      <Dialog open={assigningDosen !== null} onOpenChange={(open) => !open && setAssigningDosen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign role — {assigningDosen?.kode} {assigningDosen?.nama}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onAssign} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assign-role">Role</Label>
              <Select value={assignRole} onValueChange={(v) => setAssignRole(v as AssignableRole)}>
                <SelectTrigger id="assign-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {ROLE_LABEL[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignRole === "KAPRODI" && (
              <div className="space-y-1.5">
                <Label htmlFor="assign-prodi">Program Studi</Label>
                <Select
                  value={assignProdiId || NONE}
                  onValueChange={(v) => setAssignProdiId(v === NONE ? "" : v)}
                >
                  <SelectTrigger id="assign-prodi" className="w-full">
                    <SelectValue placeholder="— select —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— select —</SelectItem>
                    {programStudi.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.kode} — {p.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignRole === "KETUA_KK" && (
              <div className="space-y-1.5">
                <Label htmlFor="assign-kk">Kelompok Keahlian</Label>
                <Select value={assignKkId || NONE} onValueChange={(v) => setAssignKkId(v === NONE ? "" : v)}>
                  <SelectTrigger id="assign-kk" className="w-full">
                    <SelectValue placeholder="— select —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— select —</SelectItem>
                    {kelompokKeahlian.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {conflictWarning && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertDescription className="text-amber-800 dark:text-amber-400">
                  {conflictWarning}
                </AlertDescription>
              </Alert>
            )}

            {assignError && <p className="text-sm text-destructive">{assignError}</p>}

            <DialogFooter>
              <Button type="submit" disabled={assigning}>
                {assigning ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
