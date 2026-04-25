import type { Issue } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IssueDetail } from "./issue-detail";

vi.mock("@/hooks/use-issues", () => ({
  useIssue: vi.fn(),
  useComments: vi.fn(),
  useEvents: vi.fn(),
  useDependencies: vi.fn(),
  useUpdateIssue: vi.fn(),
  useCloseIssue: vi.fn(),
  useDeleteIssue: vi.fn(),
  useAddComment: vi.fn(),
  useAddDependency: vi.fn(),
  useRemoveDependency: vi.fn(),
  useHealth: () => ({ data: { project_prefix: "pearl-beads" } }),
}));

import {
  useAddComment,
  useAddDependency,
  useCloseIssue,
  useComments,
  useDeleteIssue,
  useDependencies,
  useEvents,
  useIssue,
  useRemoveDependency,
  useUpdateIssue,
} from "@/hooks/use-issues";

const mockIssue: Issue = {
  id: "pearl-beads-test",
  title: "Shared Test Issue",
  description: "shared body",
  design: "",
  acceptance_criteria: "",
  notes: "",
  status: "open",
  priority: 2,
  issue_type: "task",
  assignee: null,
  owner: "owner",
  estimated_minutes: null,
  created_at: "2026-04-10T10:00:00Z",
  created_by: "owner",
  updated_at: "2026-04-10T12:00:00Z",
  closed_at: null,
  due_at: null,
  defer_until: null,
  external_ref: null,
  spec_id: null,
  pinned: false,
  is_template: false,
  has_attachments: false,
  labels: [],
  labelColors: {},
  metadata: {},
};

const mockMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  isSuccess: false,
  isIdle: true,
  data: undefined,
  variables: undefined,
  status: "idle" as const,
  failureCount: 0,
  failureReason: null,
  reset: vi.fn(),
  context: undefined,
  submittedAt: 0,
};

function renderDetail(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
    data: mockIssue,
    isLoading: false,
    error: null,
  });
  (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  (useUpdateIssue as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useCloseIssue as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useDeleteIssue as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useAddComment as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useAddDependency as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useRemoveDependency as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
});

describe("IssueDetail (shared component)", () => {
  it("renders the same core sections regardless of container context", () => {
    renderDetail(<IssueDetail id="pearl-beads-test" />);

    // Core sections that MUST exist in both modal and full-page contexts
    expect(screen.getByText("Shared Test Issue")).toBeDefined();
    expect(screen.getByText("Fields")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Description" })).toBeDefined();
    expect(screen.getByText(/Comments \(0\)/)).toBeDefined();
    expect(screen.getByText(/Activity \(0\)/)).toBeDefined();
    expect(screen.getByText(/Dependencies \(0\)/)).toBeDefined();
    // Actions menu collapses Claim/Close/Delete behind a single button.
    expect(screen.getByRole("button", { name: /actions/i })).toBeDefined();
  });

  it("does not render mode toggle when in full-page mode (no props)", () => {
    renderDetail(<IssueDetail id="pearl-beads-test" />);

    expect(screen.queryByLabelText(/switch to modal view/i)).toBeNull();
    expect(screen.queryByLabelText(/switch to panel view/i)).toBeNull();
  });

  it("renders mode toggle when container passes the props", () => {
    renderDetail(
      <IssueDetail
        id="pearl-beads-test"
        onClose={() => {}}
        onToggleMode={() => {}}
        currentMode="panel"
      />,
    );

    // Panel mode → maximize icon shown with "switch to modal" label
    expect(screen.getByLabelText(/switch to modal view/i)).toBeDefined();
  });

  it("hides empty Design/Acceptance/Notes sections behind Add buttons", () => {
    renderDetail(<IssueDetail id="pearl-beads-test" />);

    // Empty secondary fields collapse to a single "Add ..." button each.
    expect(screen.getByRole("button", { name: /add design notes/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add acceptance criteria/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add notes/i })).toBeDefined();

    // The empty-state placeholder ("No ... yet. Click to add.") must NOT be
    // rendered alongside the button — the button replaces the section.
    expect(screen.queryByText(/no design notes yet/i)).toBeNull();
    expect(screen.queryByText(/no acceptance criteria yet/i)).toBeNull();
    expect(screen.queryByText(/no notes yet/i)).toBeNull();

    // Description must always render its full section heading, even when empty.
    expect(screen.getByRole("heading", { name: "Description" })).toBeDefined();
  });

  it("renders full section for non-empty secondary fields", () => {
    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { ...mockIssue, design: "design body", notes: "note body" },
      isLoading: false,
      error: null,
    });
    renderDetail(<IssueDetail id="pearl-beads-test" />);

    // Filled fields render their section, not an Add button.
    expect(screen.getByText("design body")).toBeDefined();
    expect(screen.getByText("note body")).toBeDefined();
    expect(screen.queryByRole("button", { name: /add design notes/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add notes/i })).toBeNull();

    // Acceptance criteria is still empty → still shows Add button.
    expect(screen.getByRole("button", { name: /add acceptance criteria/i })).toBeDefined();
  });

  it("close button has context-aware aria-label", () => {
    // Full-page → "Close detail view"
    const { unmount } = renderDetail(<IssueDetail id="pearl-beads-test" />);
    expect(screen.getByLabelText("Close detail view")).toBeDefined();
    unmount();

    // Modal/panel → "Close panel"
    renderDetail(
      <IssueDetail
        id="pearl-beads-test"
        onClose={() => {}}
        onToggleMode={() => {}}
        currentMode="modal"
      />,
    );
    expect(screen.getByLabelText("Close panel")).toBeDefined();
  });
});
