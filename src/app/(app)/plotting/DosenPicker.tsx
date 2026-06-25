"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type DosenOption = {
  id: string;
  kode: string;
  nama: string;
  kkId: string | null;
  aktif: boolean;
};

export default function DosenPicker({
  trigger,
  options,
  onSelect,
}: {
  trigger: React.ReactNode;
  options: DosenOption[];
  onSelect: (dosenId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search kode or nama…" />
          <CommandList>
            <CommandEmpty>No matching dosen</CommandEmpty>
            <CommandGroup>
              {options.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`${d.kode} ${d.nama}`}
                  onSelect={() => {
                    onSelect(d.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{d.kode}</span> — {d.nama}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
