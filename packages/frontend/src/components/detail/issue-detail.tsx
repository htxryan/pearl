import { type ReactNode, useEffect, useRef, useState } from "react";
import { AttachmentsGallery } from "@/components/detail/attachments-gallery";
import { CommentsActivityTabs } from "@/components/detail/comments-activity-tabs";
import { DependencyList } from "@/components/detail/dependency-list";
import { DetailHeader } from "@/components/detail/detail-header";
import { Lightbox } from "@/components/detail/lightbox";
import { MarkdownSection } from "@/components/detail/markdown-section";
import { MetadataSidebar, useMetadataSidebarState } from "@/components/detail/metadata-sidebar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AttachmentProvider } from "@/hooks/use-attachment-context";
import type { CloseGuard } from "@/hooks/use-detail-panel";
import { useIsCompact, useIsMobile } from "@/hooks/use-media-query";
import { DetailErrorView, DetailSections, DetailSkeleton } from "@/views/detail-components";
import { useDetailView } from "@/views/use-detail-view";

/**
 * Shared issue detail body — used by both the full-page route (DetailView) and
 * the modal / sidebar container (DetailContainer). The only thing that should
 * differ between those two callers is the outer wrapper chrome; all interior
 * content (header, fields, description, comments, etc.) is rendered by this
 * single component so the two presentations cannot drift.
 */
export interface IssueDetailProps {
  id: string;
  /** Override "exit detail" — e.g. close the modal instead of navigating back. */
  onClose?: () => void;
  /** When provided, shows a mode toggle (panel ↔ modal) in the header. */
  onToggleMode?: () => void;
  currentMode?: "panel" | "modal";
  /** Register a guard that is checked before the container closes or switches issues. */
  onSetCloseGuard?: (guard: CloseGuard | null) => void;
  /**
   * When true, the metadata sidebar is stacked above the main content instead of
   * rendered as a right-side column. Used by narrow containers (e.g. the side
   * panel mode) where a resizable sidebar would leave no room for content.
   */
  forceInlineMetadata?: boolean;
}

export function IssueDetail({
  id,
  onClose,
  onToggleMode,
  currentMode,
  onSetCloseGuard,
  forceInlineMetadata,
}: IssueDetailProps) {
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    inlineCollapsed,
    setInlineCollapsed,
    width: sidebarWidth,
    setWidth: setSidebarWidth,
  } = useMetadataSidebarState();

  const {
    issue,
    isLoading,
    error,
    comments,
    events,
    dependencies,
    parsedFields,
    backPath,
    backLabel,
    showCloseConfirm,
    setShowCloseConfirm,
    showDeleteConfirm,
    setShowDeleteConfirm,
    lightboxRef,
    setLightboxRef,
    isDirty,
    dirtyFields,
    updateMutation,
    closeMutation,
    deleteMutation,
    addCommentMutation,
    addDepMutation,
    removeDepMutation,
    handleFieldUpdate,
    handleClose,
    handleDelete,
    handleClaim,
    handleNavigateBack,
  } = useDetailView(id, { onExit: onClose });

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!onSetCloseGuard) return;
    onSetCloseGuard(() => {
      if (isDirtyRef.current) {
        return window.confirm("You have unsaved changes. Discard them?");
      }
      return true;
    });
    return () => onSetCloseGuard(null);
  }, [onSetCloseGuard]);

  if (isLoading) return <DetailSkeleton />;

  if (error || !issue) {
    return (
      <DetailErrorView
        error={error}
        id={id}
        backPath={backPath}
        backLabel={backLabel}
        onBack={handleNavigateBack}
      />
    );
  }

  const mainContent = (
    <DetailSections>
      <CollapsibleSection title="Description" hasContent={!!issue.description}>
        <MarkdownSection
          title="Description"
          content={issue.description}
          field="description"
          onSave={(val) => handleFieldUpdate("description", val)}
          hideTitle={isMobile}
        />
      </CollapsibleSection>

      {(issue.design || issue.status !== "closed") && (
        <CollapsibleSection title="Design Notes" hasContent={!!issue.design}>
          <MarkdownSection
            title="Design Notes"
            content={issue.design}
            field="design"
            onSave={(val) => handleFieldUpdate("design", val)}
            hideTitle={isMobile}
            collapseWhenEmpty
          />
        </CollapsibleSection>
      )}

      {(issue.acceptance_criteria || issue.status !== "closed") && (
        <CollapsibleSection title="Acceptance Criteria" hasContent={!!issue.acceptance_criteria}>
          <MarkdownSection
            title="Acceptance Criteria"
            content={issue.acceptance_criteria}
            field="acceptance_criteria"
            onSave={(val) => handleFieldUpdate("acceptance_criteria", val)}
            hideTitle={isMobile}
            collapseWhenEmpty
          />
        </CollapsibleSection>
      )}

      {(issue.notes || issue.status !== "closed") && (
        <CollapsibleSection title="Notes" hasContent={!!issue.notes}>
          <MarkdownSection
            title="Notes"
            content={issue.notes}
            field="notes"
            onSave={(val) => handleFieldUpdate("notes", val)}
            hideTitle={isMobile}
            collapseWhenEmpty
          />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Attachments"
        hasContent={parsedFields.some((p) => p.parsed.blocks.size > 0)}
      >
        <AttachmentsGallery onThumbnailClick={setLightboxRef} />
      </CollapsibleSection>

      <CollapsibleSection title="Dependencies" hasContent={dependencies.length > 0}>
        <DependencyList
          issueId={id}
          dependencies={dependencies}
          onAdd={(dependsOnId) =>
            addDepMutation.mutateAsync({ issue_id: id, depends_on_id: dependsOnId })
          }
          onRemove={(depIssueId, depDependsOnId) =>
            removeDepMutation.mutate({ issueId: depIssueId, dependsOnId: depDependsOnId })
          }
          isAdding={addDepMutation.isPending}
          hideTitle={isMobile}
        />
      </CollapsibleSection>

      <CommentsActivityTabs
        comments={comments}
        events={events}
        onAddComment={(text) => addCommentMutation.mutateAsync({ issueId: id, data: { text } })}
        isAddingComment={addCommentMutation.isPending}
      />
    </DetailSections>
  );

  // On compact viewports (mobile/tablet) or in narrow containers (side panel
  // mode), the sidebar stacks above the main scroll flow so it remains
  // accessible without the horizontal real estate a sidebar demands.
  const showInlineMetadata = forceInlineMetadata || isCompact;

  return (
    <AttachmentProvider parsedFields={parsedFields} onPillClick={setLightboxRef}>
      <div className="flex flex-col h-full overflow-hidden">
        <DetailHeader
          issue={issue}
          backLabel={backLabel}
          onNavigateBack={handleNavigateBack}
          onClaim={handleClaim}
          onRequestClose={() => setShowCloseConfirm(true)}
          onRequestDelete={() => setShowDeleteConfirm(true)}
          isUpdatePending={updateMutation.isPending}
          isClosePending={closeMutation.isPending}
          isDeletePending={deleteMutation.isPending}
          onFieldUpdate={handleFieldUpdate}
          isDirty={isDirty}
          dirtyFields={dirtyFields}
          onToggleMode={onToggleMode}
          currentMode={currentMode}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto min-w-0">
            {showInlineMetadata && (
              <div className="border-b border-border">
                <MetadataSidebar
                  issue={issue}
                  onFieldUpdate={handleFieldUpdate}
                  collapsed={inlineCollapsed}
                  onToggleCollapsed={() => setInlineCollapsed((p) => !p)}
                  width={sidebarWidth}
                  onWidthChange={setSidebarWidth}
                  layout="inline"
                />
              </div>
            )}
            {mainContent}
          </div>
          {!showInlineMetadata && (
            <MetadataSidebar
              issue={issue}
              onFieldUpdate={handleFieldUpdate}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((p) => !p)}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              layout="sidebar"
            />
          )}
        </div>

        <ConfirmDialog
          isOpen={showCloseConfirm}
          onConfirm={() => {
            setShowCloseConfirm(false);
            handleClose();
          }}
          onCancel={() => setShowCloseConfirm(false)}
          title="Close issue?"
          description={`Are you sure you want to close "${issue.title}"? This can be undone.`}
          confirmLabel="Close Issue"
          isPending={closeMutation.isPending}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          title="Delete issue permanently?"
          description={`This will permanently delete "${issue.title}" and remove all its dependency links. This cannot be undone.`}
          confirmLabel="Delete Issue"
          isPending={deleteMutation.isPending}
        />
      </div>
      <Lightbox activeRef={lightboxRef} onClose={() => setLightboxRef(null)} />
    </AttachmentProvider>
  );
}

/** Collapsible wrapper for detail sections on mobile. On desktop, renders children directly. */
function CollapsibleSection({
  title,
  hasContent,
  children,
}: {
  title: string;
  hasContent: boolean;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(hasContent);

  useEffect(() => {
    if (hasContent) setExpanded(true);
  }, [hasContent]);

  if (!isMobile) return <>{children}</>;

  // On mobile when empty, skip the toggle wrapper — let the collapsed
  // "Add {title}" button (rendered inside MarkdownSection) stand alone.
  if (!hasContent) return <>{children}</>;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && children}
    </div>
  );
}
