import type { SetupInitializeRequest } from "@pearl/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { setupKeys } from "@/hooks/use-issues";
import { initializeSetup } from "@/lib/api-client";

type WizardStep = "mode" | "server-config" | "initializing" | "done";

export function SetupView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>("mode");
  const [mode, setMode] = useState<"embedded" | "server">("embedded");
  const [serverHost, setServerHost] = useState("");
  const [serverPort, setServerPort] = useState("3307");
  const [serverUser, setServerUser] = useState("root");
  const [serverPassword, setServerPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const initMutation = useMutation({
    mutationFn: (data: SetupInitializeRequest) => initializeSetup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setupKeys.status });
      setStep("done");
    },
    onError: (err: Error) => {
      setError(err.message);
      // Go back to the appropriate step on error
      setStep(mode === "server" ? "server-config" : "mode");
    },
  });

  const handleModeSelect = useCallback(
    (selected: "embedded" | "server") => {
      setMode(selected);
      setError(null);
      if (selected === "embedded") {
        setStep("initializing");
        initMutation.mutate({ mode: "embedded" });
      } else {
        setStep("server-config");
      }
    },
    [initMutation],
  );

  const handleServerSubmit = useCallback(() => {
    setError(null);
    if (!serverHost.trim()) {
      setError("Server host is required");
      return;
    }
    const port = parseInt(serverPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError("Port must be a number between 1 and 65535");
      return;
    }
    setStep("initializing");
    initMutation.mutate({
      mode: "server",
      server_host: serverHost.trim(),
      server_port: port,
      server_user: serverUser.trim() || "root",
      server_password: serverPassword,
    });
  }, [serverHost, serverPort, serverUser, serverPassword, initMutation]);

  const handleDone = useCallback(() => {
    navigate("/list", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
            B
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Welcome to Pearl</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your project database to get started.
          </p>
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-2)]">
          {step === "mode" && <ModeSelection onSelect={handleModeSelect} error={error} />}
          {step === "server-config" && (
            <ServerConfig
              host={serverHost}
              port={serverPort}
              user={serverUser}
              password={serverPassword}
              onHostChange={setServerHost}
              onPortChange={setServerPort}
              onUserChange={setServerUser}
              onPasswordChange={setServerPassword}
              onSubmit={handleServerSubmit}
              onBack={() => {
                setStep("mode");
                setError(null);
              }}
              error={error}
            />
          )}
          {step === "initializing" && <Initializing mode={mode} />}
          {step === "done" && <Done onContinue={handleDone} />}
        </div>
      </div>
    </div>
  );
}

function ModeSelection({
  onSelect,
  error,
}: {
  onSelect: (mode: "embedded" | "server") => void;
  error: string | null;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Choose your database mode</h2>
      <p className="mt-1 text-sm text-muted-foreground">How should Pearl store your data?</p>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={() => onSelect("embedded")}
          className="group w-full rounded-lg border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8Z" />
                <path d="M6 8l2 2 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Embedded</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Recommended
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Zero-config local database. Everything runs on your machine. Perfect for personal
                projects and getting started.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect("server")}
          className="group w-full rounded-lg border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="12" height="4" rx="1" />
                <rect x="2" y="10" width="12" height="4" rx="1" />
                <path d="M8 6v4" />
              </svg>
            </div>
            <div>
              <span className="font-medium text-foreground">Server</span>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect to an external Dolt SQL server. For teams or when you need shared access to
                data.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function ServerConfig({
  host,
  port,
  user,
  password,
  onHostChange,
  onPortChange,
  onUserChange,
  onPasswordChange,
  onSubmit,
  onBack,
  error,
}: {
  host: string;
  port: string;
  user: string;
  password: string;
  onHostChange: (v: string) => void;
  onPortChange: (v: string) => void;
  onUserChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
}) {
  const inputClass =
    "mt-1 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20";
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Server connection</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the details for your Dolt SQL server.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="server-host" className="block text-sm font-medium text-foreground">
              Host
            </label>
            <input
              id="server-host"
              type="text"
              value={host}
              onChange={(e) => onHostChange(e.target.value)}
              placeholder="dolt.example.com"
              className={inputClass}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
          </div>
          <div>
            <label htmlFor="server-port" className="block text-sm font-medium text-foreground">
              Port
            </label>
            <input
              id="server-port"
              type="text"
              inputMode="numeric"
              value={port}
              onChange={(e) => onPortChange(e.target.value)}
              placeholder="3307"
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="server-user" className="block text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="server-user"
              type="text"
              value={user}
              onChange={(e) => onUserChange(e.target.value)}
              placeholder="root"
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
          </div>
          <div>
            <label htmlFor="server-password" className="block text-sm font-medium text-foreground">
              Password
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="server-password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder=""
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </button>
        <Button onClick={onSubmit}>Test &amp; Connect</Button>
      </div>
    </div>
  );
}

function Initializing({ mode }: { mode: "embedded" | "server" }) {
  return (
    <div className="flex flex-col items-center py-8">
      {/* Spinner */}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">Setting up your database...</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "embedded"
          ? "Initializing local database and replica. This may take a moment."
          : "Validating connection and configuring metadata."}
      </p>
    </div>
  );
}

function Done({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">You're all set!</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Your database is configured and ready. Start tracking your issues.
      </p>
      <Button className="mt-6" onClick={onContinue}>
        Get started
      </Button>
    </div>
  );
}
