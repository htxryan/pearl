import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { AppShell } from "@/components/app-shell";
import { ListView } from "@/views/list-view";
import { BoardView } from "@/views/board-view";
import { GraphView } from "@/views/graph-view";
import { DetailView } from "@/views/detail-view";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/list" replace />} />
            <Route path="list" element={<ListView />} />
            <Route path="board" element={<BoardView />} />
            <Route path="graph" element={<GraphView />} />
            <Route path="issues/:id" element={<DetailView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
