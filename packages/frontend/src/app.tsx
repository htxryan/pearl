import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/components/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";
import { SetupGuard } from "@/components/setup-guard";
import { queryClient } from "@/lib/query-client";
import { ListView } from "@/views/list-view";
import { SetupView } from "@/views/setup-view";

// Lazy-loaded views — reduce initial bundle size
const BoardView = lazy(() => import("@/views/board-view").then((m) => ({ default: m.BoardView })));
const GraphView = lazy(() => import("@/views/graph-view").then((m) => ({ default: m.GraphView })));
const DetailView = lazy(() =>
  import("@/views/detail-view").then((m) => ({ default: m.DetailView })),
);
const SettingsView = lazy(() =>
  import("@/views/settings-view").then((m) => ({
    default: m.SettingsView,
  })),
);
const NotFoundView = lazy(() =>
  import("@/views/not-found-view").then((m) => ({ default: m.NotFoundView })),
);

function ViewFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SetupGuard>
            <Routes>
              <Route path="setup" element={<SetupView />} />
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/list" replace />} />
                <Route path="list" element={<ListView />} />
                <Route
                  path="board"
                  element={
                    <Suspense fallback={<ViewFallback />}>
                      <BoardView />
                    </Suspense>
                  }
                />
                <Route
                  path="graph"
                  element={
                    <Suspense fallback={<ViewFallback />}>
                      <GraphView />
                    </Suspense>
                  }
                />
                <Route
                  path="issues/:id"
                  element={
                    <Suspense fallback={<ViewFallback />}>
                      <DetailView />
                    </Suspense>
                  }
                />
                <Route
                  path="settings/*"
                  element={
                    <Suspense fallback={<ViewFallback />}>
                      <SettingsView />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<ViewFallback />}>
                      <NotFoundView />
                    </Suspense>
                  }
                />
              </Route>
            </Routes>
          </SetupGuard>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
