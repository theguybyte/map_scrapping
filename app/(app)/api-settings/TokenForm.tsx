"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Save, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TokenFormProps {
  hasToken: boolean;
  tokenMasked: string | null;
  source: "db" | "env" | null;
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "deleting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function TokenForm({ hasToken, tokenMasked, source }: TokenFormProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [, startTransition] = useTransition();

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) {
      setStatus({ kind: "error", message: "Pegá un token antes de guardar." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/settings/apify", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = (await res.json()) as
        | { ok: true; username: string; plan: string | null }
        | { error: string };
      if (!res.ok || !("ok" in data)) {
        setStatus({
          kind: "error",
          message: ("error" in data && data.error) || "No se pudo validar el token.",
        });
        return;
      }
      setStatus({
        kind: "success",
        message: `Token válido — ${data.username}${data.plan ? ` (${data.plan})` : ""}`,
      });
      setToken("");
      setShow(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Error de red",
      });
    }
  }

  async function onDelete() {
    if (!confirm("¿Borrar el token de Apify guardado?")) return;
    setStatus({ kind: "deleting" });
    try {
      const res = await fetch("/api/settings/apify", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message: data.error ?? "No se pudo borrar el token.",
        });
        return;
      }
      setStatus({ kind: "success", message: "Token borrado." });
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Error de red",
      });
    }
  }

  const busy = status.kind === "saving" || status.kind === "deleting";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {hasToken ? (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Configurado
          </Badge>
        ) : (
          <Badge className="bg-zinc-100 text-zinc-600">
            <AlertCircle className="mr-1 h-3 w-3" /> Sin configurar
          </Badge>
        )}
        {source && (
          <Badge
            className={
              source === "db"
                ? "bg-purple-100 text-purple-700"
                : "bg-amber-100 text-amber-700"
            }
          >
            {source === "db" ? "Supabase" : "ENV fallback"}
          </Badge>
        )}
        {tokenMasked && (
          <code className="text-xs text-zinc-500 font-mono">{tokenMasked}</code>
        )}
      </div>

      <form onSubmit={onSave} className="flex flex-col gap-2">
        <Label htmlFor="apify-token">Apify API Token</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="apify-token"
              type={show ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="apify_api_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={busy}
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              tabIndex={-1}
              aria-label={show ? "Ocultar" : "Mostrar"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button type="submit" disabled={busy || !token.trim()}>
            <Save className="h-4 w-4" />
            {status.kind === "saving" ? "Validando…" : "Guardar"}
          </Button>
          {hasToken && source === "db" && (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" />
              Borrar
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Se valida contra <code className="font-mono">users/me</code> antes de guardar.
          Encontrá el token en{" "}
          <a
            href="https://console.apify.com/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:underline"
          >
            console.apify.com → Settings → Integrations
          </a>
          .
        </p>
      </form>

      {status.kind === "success" && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </div>
      )}
      {status.kind === "error" && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {status.message}
        </div>
      )}
    </div>
  );
}
