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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_SKS_CAP } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { DosenLoadBreakdown } from "@/lib/bebanDosen";
import RegisterDlbDialog from "./RegisterDlbDialog";

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
  optionsLoading = false,
  context,
  semesterId,
  canRegisterDlb,
  onSelect,
  onDlbRegistered,
}: {
  trigger: React.ReactNode;
  options: DosenOption[];
  optionsLoading?: boolean;
  context: AssignContext;
  semesterId: string;
  canRegisterDlb: boolean;
  onSelect: (dosenId: string) => void;
  onDlbRegistered: (dosen: DosenOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dlbDialogOpen, setDlbDialogOpen] = useState(false);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            {context.prodiKode} — {context.prodiNama} → {context.kodeMK} — {context.mkNama} →{" "}
            {context.kodeKelas} → {context.sks} sks
          </div>

          <Command>
            <CommandInput placeholder="Search kode or nama…" />
            <CommandList>
              <CommandEmpty>{optionsLoading ? "Loading dosen…" : "No matching dosen"}</CommandEmpty>
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
                onClick={() => {
                  setOpen(false);
                  setDlbDialogOpen(true);
                }}
              >
                <UserPlus className="size-3.5" />
                Register new DLB
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <RegisterDlbDialog
        open={dlbDialogOpen}
        onOpenChange={setDlbDialogOpen}
        onRegistered={(dosen) => {
          onDlbRegistered(dosen);
          onSelect(dosen.id);
        }}
      />
    </>
  );
}
