"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { LogOut, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge, ROLE_LABEL } from "@/components/RoleBadge";

type ImpersonatableRole = "KAPRODI" | "KETUA_KK" | "ACADEMIC";
const VIEW_AS_ROLES: ImpersonatableRole[] = ["KAPRODI", "KETUA_KK", "ACADEMIC"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return chars.join("") || "U";
}

export default function UserMenu({
  name,
  role,
  scopeLabel,
}: {
  name: string;
  role: Role;
  scopeLabel: string | null;
}) {
  const router = useRouter();
  const [viewAsRole, setViewAsRole] = useState<ImpersonatableRole | null>(null);
  const [programStudi, setProgramStudi] = useState<{ id: string; kode: string; nama: string }[]>([]);
  const [kelompokKeahlian, setKelompokKeahlian] = useState<{ id: string; nama: string }[]>([]);
  const [selectedScopeId, setSelectedScopeId] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openViewAs(target: ImpersonatableRole) {
    setError(null);
    setSelectedScopeId("");
    if (target === "KAPRODI" && programStudi.length === 0) {
      const res = await fetch("/api/program-studi");
      if (res.ok) setProgramStudi((await res.json()).programStudi);
    }
    if (target === "KETUA_KK" && kelompokKeahlian.length === 0) {
      const res = await fetch("/api/kelompok-keahlian");
      if (res.ok) setKelompokKeahlian((await res.json()).kelompokKeahlian);
    }
    setViewAsRole(target);
  }

  async function confirmViewAs() {
    if (!viewAsRole) return;
    if (viewAsRole !== "ACADEMIC" && !selectedScopeId) {
      setError("Please select a scope.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { role: viewAsRole };
      if (viewAsRole === "KAPRODI") body.prodiId = selectedScopeId;
      if (viewAsRole === "KETUA_KK") body.kkId = selectedScopeId;
      const res = await fetch("/api/impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to start impersonation");
      setViewAsRole(null);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start impersonation");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1.5 py-2">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <div className="flex items-center gap-1.5">
              <RoleBadge role={role} />
              {scopeLabel && (
                <span className="truncate text-xs text-muted-foreground">{scopeLabel}</span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role === "ADMIN" && (
            <>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Lihat Sebagai
              </DropdownMenuLabel>
              {VIEW_AS_ROLES.map((r) => (
                <DropdownMenuItem key={r} onClick={() => openViewAs(r)}>
                  <Eye className="size-4" />
                  {ROLE_LABEL[r]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={viewAsRole !== null} onOpenChange={(open) => !open && setViewAsRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lihat Sebagai {viewAsRole ? ROLE_LABEL[viewAsRole] : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewAsRole === "KAPRODI" && (
              <div className="space-y-1.5">
                <Label htmlFor="view-as-prodi">Program Studi</Label>
                <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                  <SelectTrigger id="view-as-prodi" className="w-full">
                    <SelectValue placeholder="— select —" />
                  </SelectTrigger>
                  <SelectContent>
                    {programStudi.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.kode} — {p.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {viewAsRole === "KETUA_KK" && (
              <div className="space-y-1.5">
                <Label htmlFor="view-as-kk">Kelompok Keahlian</Label>
                <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                  <SelectTrigger id="view-as-kk" className="w-full">
                    <SelectValue placeholder="— select —" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelompokKeahlian.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {viewAsRole === "ACADEMIC" && (
              <p className="text-sm text-muted-foreground">
                Academic is a global read-only role — no scope to select.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewAsRole(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmViewAs} disabled={starting}>
              {starting ? "Starting…" : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
