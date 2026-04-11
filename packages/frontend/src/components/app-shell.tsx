import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell() {
  return (
    <div className="flex h-screen min-w-[1024px] max-w-[2560px] overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
