import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { AppShell } from "@/components/app-shell";
import { SetupGuard } from "@/components/setup-guard";
import { ErrorBoundary } from "@/components/error-boundary";
import { ListView } from "@/views/list-view";
import { BoardView } from "@/views/board-view";
import { GraphView } from "@/views/graph-view";
import { DetailView } from "@/views/detail-view";
import { SetupView } from "@/views/setup-view";
import { NotFoundView } from "@/views/not-found-view";

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
                <Route path="board" element={<BoardView />} />
                <Route path="graph" element={<GraphView />} />
                <Route path="issues/:id" element={<DetailView />} />
                <Route path="*" element={<NotFoundView />} />
              </Route>
            </Routes>
          </SetupGuard>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
