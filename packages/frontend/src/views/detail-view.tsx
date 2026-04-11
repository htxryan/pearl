import { useParams } from "react-router";

export function DetailView() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Issue Detail</h2>
      <p className="mt-2 text-muted-foreground">
        Viewing issue: <code className="rounded bg-muted px-2 py-1">{id}</code>
      </p>
      <p className="mt-1 text-muted-foreground">Detail panel will be implemented in E4.</p>
    </div>
  );
}
