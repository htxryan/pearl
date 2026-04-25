import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CheckIcon, PlugIcon } from "@/components/ui/icons";
import * as api from "@/lib/api-client";

type MigrationState = "idle" | "testing" | "migrating" | "error";

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed";
const outlineBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed";

export function EmbeddedModeModal() {
  const [tab, setTab] = useState<"managed" | "external">("managed");
  const [state, setState] = useState<MigrationState>("idle");
  const [error, setError] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("3307");
  const [connectionOk, setConnectionOk] = useState(false);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Managed migration: fire POST and schedule a reload. A fallback timer reloads
  // even if the fetch never resolves — works around a Chrome renderer freeze that
  // can occur between the pointer-event click and the fetch response.
  const handleManagedMigration = useCallback(() => {
    setState("migrating");
    setError("");
    api.migrate({ target: "managed" }).catch(() => {});
    reloadTimerRef.current = setTimeout(() => window.location.reload(), 3000);
  }, []);

  const handleTestConnection = useCallback(async () => {
    setState("testing");
    setError("");
    setConnectionOk(false);

    const portNum = Number.parseInt(port, 10);
    if (!portNum || portNum < 1 || portNum > 65535) {
      setError("Port must be a number between 1 and 65535");
      setState("error");
      return;
    }

    try {
      const result = await api.testMigrationServer({ host, port: portNum });
      if (result.ok) {
        setConnectionOk(true);
        setState("idle");
      } else {
        setError(result.error || "Connection failed");
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
      setState("error");
    }
  }, [host, port]);

  const handleExternalMigration = useCallback(async () => {
    setState("migrating");
    setError("");

    const portNum = Number.parseInt(port, 10);
    if (!portNum || portNum < 1 || portNum > 65535) {
      setError("Port must be a number between 1 and 65535");
      setState("error");
      return;
    }

    try {
      const result = await api.migrate({ target: "external", host, port: portNum });
      if (result.ok) {
        window.location.reload();
      } else {
        setState("error");
        setError(result.error || "Migration failed");
      }
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Migration failed");
    }
  }, [host, port]);

  const isBusy = state === "migrating" || state === "testing";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-modal-title"
      onClick={handleBackdropClick}
      data-testid="embedded-mode-modal"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning-foreground text-lg">
            !
          </div>
          <div>
            <h2 id="migration-modal-title" className="text-lg font-semibold">
              Migration Required
            </h2>
            <p className="text-sm text-muted-foreground">Embedded mode is deprecated</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Pearl now requires a Dolt SQL server for reliable data access. Choose how you'd like to
          run it:
        </p>

        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "managed"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("managed")}
            disabled={isBusy}
          >
            Pearl-managed
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "external"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("external")}
            disabled={isBusy}
          >
            I'll run dolt myself
          </button>
        </div>

        {tab === "managed" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pearl will start and manage a dolt sql-server for you. Your existing data will be
              preserved.
            </p>
            <button
              type="button"
              onClick={handleManagedMigration}
              disabled={isBusy}
              className={`w-full ${primaryBtn}`}
              data-testid="migrate-managed-btn"
            >
              <ArrowRightIcon />
              {state === "migrating" ? "Migrating..." : "Start Pearl-managed server"}
            </button>
          </div>
        )}

        {tab === "external" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Start a dolt sql-server yourself, then enter the connection details.
            </p>
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-xs text-warning-foreground">
              Data is not automatically migrated to the external server. After migrating, use{" "}
              <code className="font-mono">dolt push</code> from your original database directory to
              transfer your data.
            </div>
            <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs select-all">
              dolt sql-server --host 127.0.0.1 --port 3307
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="migration-host" className="block text-sm font-medium mb-1">
                  Host
                </label>
                <input
                  id="migration-host"
                  type="text"
                  value={host}
                  onChange={(e) => {
                    setHost(e.target.value);
                    setConnectionOk(false);
                  }}
                  disabled={isBusy}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  data-testid="migration-host-input"
                />
              </div>
              <div>
                <label htmlFor="migration-port" className="block text-sm font-medium mb-1">
                  Port
                </label>
                <input
                  id="migration-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => {
                    setPort(e.target.value.replace(/\D/g, ""));
                    setConnectionOk(false);
                  }}
                  disabled={isBusy}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  data-testid="migration-port-input"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isBusy}
                className={outlineBtn}
                data-testid="test-connection-btn"
              >
                {connectionOk ? <CheckIcon /> : <PlugIcon />}
                {state === "testing"
                  ? "Testing..."
                  : connectionOk
                    ? "Connected"
                    : "Test connection"}
              </button>
              <button
                type="button"
                onClick={handleExternalMigration}
                disabled={isBusy || !connectionOk}
                className={`flex-1 ${primaryBtn}`}
                data-testid="migrate-external-btn"
              >
                <ArrowRightIcon />
                {state === "migrating" ? "Migrating..." : "Migrate"}
              </button>
            </div>
          </div>
        )}

        {state === "error" && error && (
          <div
            className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
            data-testid="migration-error"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
