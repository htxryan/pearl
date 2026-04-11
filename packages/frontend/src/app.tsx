import type { IssueListItem } from "@beads-gui/shared";

export function App() {
  // Verify shared types are importable
  const _typeCheck: IssueListItem | null = null;
  void _typeCheck;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Beads GUI</h1>
        <p className="mt-2 text-muted-foreground">Frontend shell loading...</p>
      </div>
    </div>
  );
}
