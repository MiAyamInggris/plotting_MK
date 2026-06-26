"use client";

import { useState } from "react";
import { Info, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_SKS_CAP } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { DosenLoadBreakdown } from "@/lib/bebanDosen";

export type DosenOption = {
  id: string;
  kode: string;
  nama: string;
  kkId: string | null;
  aktif: boolean;
  jenis: "TETAP" | "DLB";
  totalSks: number;
};

export type AssignContext = {
  prodiKode: string;
  prodiNama: string;
  kodeMK: string;
  mkNama: string;
  kodeKelas: string;
  sks: number;
};

function LoadBreakdownTooltip({ dosenId, semesterId }: { dosenId: string; semesterId: string }) {
  const [breakdown, setBreakdown] = useState<DosenLoadBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (breakdown || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dosen/${dosenId}/beban?semesterPeriodeId=${semesterId}`);
      if (res.ok) setBreakdown(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tooltip onOpenChange={(open) => open && load()}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        {loading && <p>Loading…</p>}
        {!loading && breakdown && breakdown.byKelas.length === 0 && <p>No load this semester.</p>}
        {!loading && breakdown && breakdown.byKelas.length > 0 && (
          <div className="space-y-1.5">
            {breakdown.byProdi.map((p) => (
              <p key={p.prodiKode}>
                {p.prodiKode}: {p.sks} sks
              </p>
            ))}
            <div className="border-t border-background/20 pt-1">
              {breakdown.byMataKuliah.map((mk) => (
                <p key={mk.kodeMK}>
                  {mk.kodeMK} — {mk.nama}: {mk.sks} sks
                </p>
              ))}
            </div>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function DosenPicker({
  trigger,
  options,
  context,
  semesterId,
  canRegisterDlb,
  onSelect,
  onDlbRegistered,
}: {
  trigger: React.ReactNode;
  options: DosenOption[];
  context: AssignContext;
  semesterId: string;
  canRegisterDlb: boolean;
  onSelect: (dosenId: string) => void;
  onDlbRegistered: (dosen: DosenOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerNama, setRegisterNama] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitDlb() {
    if (!registerNama.trim()) return;
    setSubmitting(true);
    setRegisterError(null);
    try {
      const res = await fetch("/api/dosen/register-dlb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: registerNama.trim(), email: registerEmail.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to register DLB");
      onDlbRegistered({ ...data.dosen, totalSks: 0 });
      onSelect(data.dosen.id);
      setOpen(false);
      setRegistering(false);
      setRegisterNama("");
      setRegisterEmail("");
    } catch (e) {
      setRegisterError(e instanceof Error ? e.message : "Failed to register DLB");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setRegistering(false);
          setRegisterError(null);
        }
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
          {context.prodiKode} — {context.prodiNama} → {context.kodeMK} — {context.mkNama} →{" "}
          {context.kodeKelas} → {context.sks} sks
        </div>

        {registering ? (
          <div className="space-y-3 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="dlb-nama">Nama</Label>
              <Input id="dlb-nama" value={registerNama} onChange={(e) => setRegisterNama(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlb-email">Email (optional)</Label>
              <Input
                id="dlb-email"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
              />
            </div>
            {registerError && <p className="text-sm text-destructive">{registerError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRegistering(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={submitting} onClick={submitDlb}>
                {submitting ? "Registering…" : "Register & assign"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Command>
              <CommandInput placeholder="Search kode or nama…" />
              <CommandList>
                <CommandEmpty>No matching dosen</CommandEmpty>
                <CommandGroup>
                  {options.map((d) => {
                    const projected = d.totalSks + context.sks;
                    const overCap = projected > DEFAULT_SKS_CAP;
                    return (
                      <CommandItem
                        key={d.id}
                        value={`${d.kode} ${d.nama}`}
                        onSelect={() => {
                          onSelect(d.id);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="font-medium">{d.kode}</span> — {d.nama}
                          {d.jenis === "DLB" && (
                            <Badge variant="outline" className="text-[10px]">
                              DLB
                            </Badge>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              "text-xs",
                              overCap ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                            )}
                          >
                            {d.totalSks} → {projected} sks
                          </span>
                          <LoadBreakdownTooltip dosenId={d.id} semesterId={semesterId} />
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
            {canRegisterDlb && (
              <div className="border-t border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setRegistering(true)}
                >
                  <UserPlus className="size-3.5" />
                  Register new DLB
                </Button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
