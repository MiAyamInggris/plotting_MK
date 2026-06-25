"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, UserCog } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { RoleBadge, ROLE_LABEL } from "@/components/RoleBadge";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  aktif: boolean;
  prodiId: string | null;
  kkId: string | null;
  prodi: { nama: string; kode: string } | null;
  kk: { nama: string } | null;
};

type ProgramStudi = { id: string; kode: string; nama: string };
type KelompokKeahlian = { id: string; nama: string };

const ROLE_OPTIONS: Role[] = ["ADMIN", "KAPRODI", "KETUA_KK"];
const NONE = "__none__";

function RoleScopeFields({
  idPrefix,
  role,
  setRole,
  prodiId,
  setProdiId,
  kkId,
  setKkId,
  programStudi,
  kelompokKeahlian,
}: {
  idPrefix: string;
  role: Role;
  setRole: (r: Role) => void;
  prodiId: string;
  setProdiId: (v: string) => void;
  kkId: string;
  setKkId: (v: string) => void;
  programStudi: ProgramStudi[];
  kelompokKeahlian: KelompokKeahlian[];
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-role`}>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger id={`${idPrefix}-role`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {ROLE_LABEL[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {role === "KAPRODI" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-prodi`}>Program Studi</Label>
          <Select value={prodiId || NONE} onValueChange={(v) => setProdiId(v === NONE ? "" : v)}>
            <SelectTrigger id={`${idPrefix}-prodi`} className="w-full">
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

      {role === "KETUA_KK" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-kk`}>Kelompok Keahlian</Label>
          <Select value={kkId || NONE} onValueChange={(v) => setKkId(v === NONE ? "" : v)}>
            <SelectTrigger id={`${idPrefix}-kk`} className="w-full">
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
    </>
  );
}

export default function UsersClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [programStudi, setProgramStudi] = useState<ProgramStudi[]>([]);
  const [kelompokKeahlian, setKelompokKeahlian] = useState<KelompokKeahlian[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("KAPRODI");
  const [prodiId, setProdiId] = useState("");
  const [kkId, setKkId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("KAPRODI");
  const [editProdiId, setEditProdiId] = useState("");
  const [editKkId, setEditKkId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [usersRes, prodiRes, kkRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/program-studi"),
        fetch("/api/kelompok-keahlian"),
      ]);
      if (!usersRes.ok) throw new Error("Failed to load users");
      const usersData = await usersRes.json();
      const prodiData = await prodiRes.json();
      const kkData = await kkRes.json();
      setUsers(usersData.users);
      setProgramStudi(prodiData.programStudi);
      setKelompokKeahlian(kkData.kelompokKeahlian);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          password,
          role,
          prodiId: role === "KAPRODI" ? prodiId : null,
          kkId: role === "KETUA_KK" ? kkId : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to create user");
      }
      setEmail("");
      setName("");
      setPassword("");
      setRole("KAPRODI");
      setProdiId("");
      setKkId("");
      setCreateOpen(false);
      toast.success("User created");
      await loadAll();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditProdiId(u.prodiId ?? "");
    setEditKkId(u.kkId ?? "");
    setEditError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          prodiId: editRole === "KAPRODI" ? editProdiId : null,
          kkId: editRole === "KETUA_KK" ? editKkId : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update user");
      }
      setEditingId(null);
      toast.success("User updated");
      await loadAll();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !u.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      toast.success(u.aktif ? "User deactivated" : "User activated");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-name">Name</Label>
                <Input id="user-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-password">Password</Label>
                <Input
                  id="user-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <RoleScopeFields
                idPrefix="create"
                role={role}
                setRole={setRole}
                prodiId={prodiId}
                setProdiId={setProdiId}
                kkId={kkId}
                setKkId={setKkId}
                programStudi={programStudi}
                kelompokKeahlian={kelompokKeahlian}
              />
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create user"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 bg-card">Name</TableHead>
              <TableHead className="sticky top-0 bg-card">Email</TableHead>
              <TableHead className="sticky top-0 bg-card">Role</TableHead>
              <TableHead className="sticky top-0 bg-card">Scope</TableHead>
              <TableHead className="sticky top-0 bg-card">Status</TableHead>
              <TableHead className="sticky top-0 bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={6} />
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState icon={UserCog} title="No users yet" />
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="h-12">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>{u.prodi?.nama ?? u.kk?.nama ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge active={u.aktif} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(u)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(u)}>
                        {u.aktif ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && (
          <p className="text-sm text-muted-foreground">{users.length} item(s)</p>
        )}
      </CardContent>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <RoleScopeFields
              idPrefix="edit"
              role={editRole}
              setRole={setEditRole}
              prodiId={editProdiId}
              setProdiId={setEditProdiId}
              kkId={editKkId}
              setKkId={setEditKkId}
              programStudi={programStudi}
              kelompokKeahlian={kelompokKeahlian}
            />
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
