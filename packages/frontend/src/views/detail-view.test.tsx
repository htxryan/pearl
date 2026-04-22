import type { Comment, Dependency, Event, Issue } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DetailView } from "./detail-view";

// Mock the hooks
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

// Import the mocked hooks
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
  title: "Test Issue",
  description: "A test description",
  design: "",
  acceptance_criteria: "",
  notes: "",
  status: "open",
  priority: 2,
  issue_type: "task",
  assignee: "testuser",
  owner: "testowner",
  estimated_minutes: null,
  created_at: "2026-04-10T10:00:00Z",
  created_by: "testowner",
  updated_at: "2026-04-10T12:00:00Z",
  closed_at: null,
  due_at: null,
  defer_until: null,
  external_ref: null,
  spec_id: null,
  pinned: false,
  is_template: false,
  has_attachments: false,
  labels: ["frontend", "v1"],
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

function renderWithProviders(issueId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/issues/${issueId}`]}>
        <Routes>
          <Route path="/issues/:id" element={<DetailView />} />
          <Route path="/list" element={<div>List View</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  // Setup default mock returns
  (useUpdateIssue as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useCloseIssue as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useDeleteIssue as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useAddComment as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useAddDependency as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
  (useRemoveDependency as ReturnType<typeof vi.fn>).mockReturnValue(mockMutation);
});

describe("DetailView", () => {
  it("shows loading skeleton when data is loading", () => {
    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderWithProviders("pearl-beads-test");
    // Skeleton should show animated placeholders
    const skeletonElements = document.querySelectorAll(".skeleton-shimmer");
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it("shows error state when issue not found", () => {
    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Not found"),
    });
    (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderWithProviders("nonexistent");
    expect(screen.getByText("Issue not found")).toBeDefined();
    expect(screen.getByText("Back to list")).toBeDefined();
  });

  it("renders issue detail with all fields", () => {
    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockIssue,
      isLoading: false,
      error: null,
    });
    (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderWithProviders("pearl-beads-test");

    // Issue ID (prefix-stripped form) and title
    expect(screen.getByText("test")).toBeDefined();
    expect(screen.getByText("Test Issue")).toBeDefined();

    // Metadata
    expect(screen.getByText("testowner")).toBeDefined();

    // Section headers
    expect(screen.getByText("Fields")).toBeDefined();
    expect(screen.getByText("Description")).toBeDefined();
    expect(screen.getByText("Comments (0)")).toBeDefined();
    expect(screen.getByText("Activity (0)")).toBeDefined();
    expect(screen.getByText("Dependencies (0)")).toBeDefined();

    // Action buttons
    expect(screen.getByText("Claim")).toBeDefined();
    expect(screen.getByText("Close")).toBeDefined();
  });

  it("renders comments when present", () => {
    const comments: Comment[] = [
      {
        id: "c1",
        issue_id: "pearl-beads-test",
        author: "user1",
        text: "This is a test comment",
        created_at: "2026-04-10T11:00:00Z",
      },
    ];

    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockIssue,
      isLoading: false,
      error: null,
    });
    (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: comments });
    (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderWithProviders("pearl-beads-test");

    expect(screen.getByText("Comments (1)")).toBeDefined();
    expect(screen.getByText("This is a test comment")).toBeDefined();
    expect(screen.getByText("user1")).toBeDefined();
  });

  it("renders events in activity timeline", () => {
    const events: Event[] = [
      {
        id: "e1",
        issue_id: "pearl-beads-test",
        event_type: "status_change",
        actor: "user1",
        old_value: "open",
        new_value: "in_progress",
        comment: null,
        created_at: "2026-04-10T11:00:00Z",
      },
    ];

    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockIssue,
      isLoading: false,
      error: null,
    });
    (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: events });
    (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderWithProviders("pearl-beads-test");

    expect(screen.getByText("Activity (1)")).toBeDefined();
    expect(screen.getByText("user1")).toBeDefined();
  });

  it("does not show Claim/Close buttons for closed issues", () => {
    const closedIssue = {
      ...mockIssue,
      status: "closed" as const,
      closed_at: "2026-04-10T14:00:00Z",
    };

    (useIssue as ReturnType<typeof vi.fn>).mockReturnValue({
      data: closedIssue,
      isLoading: false,
      error: null,
    });
    (useComments as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useEvents as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useDependencies as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderWithProviders("pearl-beads-test");

    expect(screen.queryByText("Claim")).toBeNull();
    expect(screen.queryByText("Close")).toBeNull();
  });
});
