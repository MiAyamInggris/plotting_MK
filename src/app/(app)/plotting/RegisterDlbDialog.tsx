"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jfaSchema } from "@/lib/validation/dosen";
import type { DosenOption } from "./DosenPicker";

const NONE = "__none__";

const EMPTY_FORM = {
  kode: "",
  nama: "",
  email: "",
  nidn: "",
  noTelp: "",
  jfa: "",
  homebaseUniv: "",
};

export default function RegisterDlbDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (dosen: DosenOption) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setForm(EMPTY_FORM);
      setError(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dosen/register-dlb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to register DLB");
      }
      onRegistered({ ...data.dosen, totalSks: 0 });
      close(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to register DLB");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Dosen Luar Biasa (DLB)</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dlb-kode">Kode Dosen</Label>
              <Input
                id="dlb-kode"
                required
                maxLength={10}
                value={form.kode}
                onChange={(e) => set("kode", e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlb-nama">Nama</Label>
              <Input id="dlb-nama" required value={form.nama} onChange={(e) => set("nama", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlb-email">Email</Label>
              <Input
                id="dlb-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlb-nidn">NIDN / NUPTK</Label>
              <Input id="dlb-nidn" required value={form.nidn} onChange={(e) => set("nidn", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlb-notelp">No. Telp.</Label>
              <Input
                id="dlb-notelp"
                required
                value={form.noTelp}
                onChange={(e) => set("noTelp", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dlb-jfa">JFA</Label>
              <Select value={form.jfa || NONE} onValueChange={(v) => set("jfa", v === NONE ? "" : v)}>
                <SelectTrigger id="dlb-jfa" className="w-full">
                  <SelectValue placeholder="— select —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— select —</SelectItem>
                  {jfaSchema.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dlb-univ">Homebase Univ.</Label>
              <Input
                id="dlb-univ"
                required
                placeholder="e.g. Universitas Indonesia"
                value={form.homebaseUniv}
                onChange={(e) => set("homebaseUniv", e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.jfa}>
              {submitting ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
