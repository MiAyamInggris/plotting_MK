"use client";

import { useEffect, useState, type FormEvent } from "react";

type Role = "ADMIN" | "KAPRODI" | "KETUA_KK";

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

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "KAPRODI", label: "Kaprodi" },
  { value: "KETUA_KK", label: "Ketua KK" },
];

function RoleScopeFields({
  role,
  setRole,
  prodiId,
  setProdiId,
  kkId,
  setKkId,
  programStudi,
  kelompokKeahlian,
}: {
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
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {role === "KAPRODI" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Program Studi
          </label>
          <select
            value={prodiId}
            onChange={(e) => setProdiId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— select —</option>
            {programStudi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.kode} — {p.nama}
              </option>
            ))}
          </select>
        </div>
      )}

      {role === "KETUA_KK" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Kelompok Keahlian
          </label>
          <select
            value={kkId}
            onChange={(e) => setKkId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— select —</option>
            {kelompokKeahlian.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
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
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("KAPRODI");
  const [prodiId, setProdiId] = useState("");
  const [kkId, setKkId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("KAPRODI");
  const [editProdiId, setEditProdiId] = useState("");
  const [editKkId, setEditKkId] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "Failed to load data");
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
    setError(null);
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
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to create user",
        );
      }
      setEmail("");
      setName("");
      setPassword("");
      setRole("KAPRODI");
      setProdiId("");
      setKkId("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditProdiId(u.prodiId ?? "");
    setEditKkId(u.kkId ?? "");
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
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
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to update user",
        );
      }
      setEditingId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    }
  }

  async function toggleActive(u: UserRow) {
    setError(null);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktif: !u.aktif }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onCreate}
        className="grid max-w-2xl grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="col-span-2 text-sm font-semibold text-slate-900">Create user</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <RoleScopeFields
          role={role}
          setRole={setRole}
          prodiId={prodiId}
          setProdiId={setProdiId}
          kkId={kkId}
          setKkId={setKkId}
          programStudi={programStudi}
          kelompokKeahlian={kelompokKeahlian}
        />
        <div className="col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Scope</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      ROLE_OPTIONS.find((r) => r.value === u.role)?.label
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      editRole === "KAPRODI" ? (
                        <select
                          value={editProdiId}
                          onChange={(e) => setEditProdiId(e.target.value)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="">— select —</option>
                          {programStudi.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.kode}
                            </option>
                          ))}
                        </select>
                      ) : editRole === "KETUA_KK" ? (
                        <select
                          value={editKkId}
                          onChange={(e) => setEditKkId(e.target.value)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="">— select —</option>
                          {kelompokKeahlian.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.nama}
                            </option>
                          ))}
                        </select>
                      ) : (
                        "—"
                      )
                    ) : (
                      u.prodi?.nama ?? u.kk?.nama ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-2">{u.aktif ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">
                    {editingId === u.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(u.id)}
                          className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(u)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          {u.aktif ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
