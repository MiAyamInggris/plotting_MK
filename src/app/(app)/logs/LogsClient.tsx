"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const ROLES = ["ADMIN", "KAPRODI", "KETUA_KK", "DOSEN", "ACADEMIC"] as const;
const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "IMPORT",
  "PLOT_ASSIGN",
  "PLOT_CLEAR",
  "OPEN_CLASS",
  "DLB_CREATE",
  "ROLE_CHANGE",
  "PASSWORD_RESET",
] as const;
const PAGE_SIZES = [20, 50] as const;
const ALL = "__all__";

type LogRow = {
  id: string;
  actorUserId: string;
  actor: { name: string; email: string };
  actorRole: string;
  impersonatedRole: string | null;
  impersonatedScope: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
};

export default function LogsClient() {
  const [actorSearch, setActorSearch] = useState("");
  const [actorRole, setActorRole] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (actorSearch) params.set("actorSearch", actorSearch);
      if (actorRole !== ALL) params.set("actorRole", actorRole);
      if (action !== ALL) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      setLogs(data.logs);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, actorSearch, actorRole, action, entityType, dateFrom, dateTo]);

  function onFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Actor</Label>
            <Input
              className="w-48"
              placeholder="name or email"
              value={actorSearch}
              onChange={(e) => onFilterChange(setActorSearch)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={actorRole} onValueChange={onFilterChange(setActorRole)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Action</Label>
            <Select value={action} onValueChange={onFilterChange(setAction)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity type</Label>
            <Input
              className="w-36"
              placeholder="e.g. Dosen"
              value={entityType}
              onChange={(e) => onFilterChange(setEntityType)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              className="w-36"
              value={dateFrom}
              onChange={(e) => onFilterChange(setDateFrom)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              className="w-36"
              value={dateTo}
              onChange={(e) => onFilterChange(setDateTo)(e.target.value)}
            />
          </div>
        </div>

        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground">
            {totalCount === 0 ? "0 entries" : `${rangeStart}–${rangeEnd} of ${totalCount}`}
          </Label>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => onFilterChange(setPageSize)(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 bg-card">Actor</TableHead>
              <TableHead className="sticky top-0 bg-card">Role</TableHead>
              <TableHead className="sticky top-0 bg-card">Action</TableHead>
              <TableHead className="sticky top-0 bg-card">Entity</TableHead>
              <TableHead className="sticky top-0 bg-card">Detail</TableHead>
              <TableHead className="sticky top-0 bg-card">IP</TableHead>
              <TableHead className="sticky top-0 bg-card">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={7} />
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState icon={ScrollText} title="No activity found" />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="h-12">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">{log.actor.name}</span>
                      <span className="text-xs text-muted-foreground">{log.actor.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="text-[10px]">{log.actorRole}</Badge>
                      {log.impersonatedRole && (
                        <span className="text-[10px] text-muted-foreground">
                          via View as{log.impersonatedScope ? ` — ${log.impersonatedScope}` : ""}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{log.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-xs text-muted-foreground" title={log.detail ?? ""}>
                    {log.detail ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.ip ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
