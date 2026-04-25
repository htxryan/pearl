import type { IssueStatus, IssueType, LabelColor, Priority } from "@pearl/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelBadge } from "@/components/ui/label-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TypePill } from "@/components/ui/type-pill";

const STATUSES: IssueStatus[] = ["open", "in_progress", "closed", "blocked", "deferred"];
const PRIORITIES: Priority[] = [0, 1, 2, 3, 4];
const ISSUE_TYPES: IssueType[] = [
  "task",
  "bug",
  "epic",
  "feature",
  "chore",
  "event",
  "gate",
  "molecule",
];
const LABEL_COLORS: LabelColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
  "gray",
];

export function PrimitiveShowcase() {
  return (
    <div
      data-testid="primitive-showcase"
      className="min-h-screen bg-background text-foreground p-8 space-y-12"
    >
      <h1 className="text-2xl font-bold">Primitive Showcase</h1>

      <section data-testid="showcase-button">
        <h2 className="text-lg font-semibold mb-4">Button</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-xs" variant="outline" aria-label="Icon XS">
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent>Icon XS</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="outline" aria-label="Icon SM">
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent>Icon SM</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Icon">
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent>Icon</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-lg" variant="outline" aria-label="Icon LG">
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent>Icon LG</TooltipContent>
            </Tooltip>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </section>

      <Separator />

      <section data-testid="showcase-badge">
        <h2 className="text-lg font-semibold mb-4">Badge</h2>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <Separator />

      <section data-testid="showcase-avatar">
        <h2 className="text-lg font-semibold mb-4">Avatar</h2>
        <div className="flex flex-wrap gap-3">
          <Avatar>
            <AvatarFallback>RH</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </div>
      </section>

      <Separator />

      <section data-testid="showcase-card">
        <h2 className="text-lg font-semibold mb-4">Card</h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Card content body.</p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section data-testid="showcase-input-textarea">
        <h2 className="text-lg font-semibold mb-4">Input &amp; Textarea</h2>
        <div className="max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Label</Label>
            <Input id="demo-input" placeholder="Type something..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-textarea">Textarea</Label>
            <Textarea id="demo-textarea" placeholder="Write more here..." />
          </div>
        </div>
      </section>

      <Separator />

      <section data-testid="showcase-skeleton">
        <h2 className="text-lg font-semibold mb-4">Skeleton</h2>
        <div className="space-y-2 max-w-sm">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </section>

      <Separator />

      <section data-testid="showcase-tooltip">
        <h2 className="text-lg font-semibold mb-4">Tooltip</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>This is a tooltip</TooltipContent>
        </Tooltip>
      </section>

      <Separator />

      <section data-testid="showcase-status-badge">
        <h2 className="text-lg font-semibold mb-4">StatusBadge</h2>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </section>

      <section data-testid="showcase-priority-indicator">
        <h2 className="text-lg font-semibold mb-4">PriorityIndicator</h2>
        <div className="flex flex-wrap gap-3">
          {PRIORITIES.map((p) => (
            <PriorityIndicator key={p} priority={p} />
          ))}
        </div>
      </section>

      <section data-testid="showcase-type-pill">
        <h2 className="text-lg font-semibold mb-4">TypePill</h2>
        <div className="flex flex-wrap gap-3">
          {ISSUE_TYPES.map((t) => (
            <TypePill key={t} type={t} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {ISSUE_TYPES.map((t) => (
            <TypePill key={`${t}-icon`} type={t} iconOnly />
          ))}
        </div>
      </section>

      <section data-testid="showcase-label-badge">
        <h2 className="text-lg font-semibold mb-4">LabelBadge</h2>
        <div className="flex flex-wrap gap-3">
          {LABEL_COLORS.map((c) => (
            <LabelBadge key={c} name={c} color={c} />
          ))}
          <LabelBadge name="removable" color="blue" removable onRemove={() => {}} />
        </div>
      </section>

      <section data-testid="showcase-empty-state">
        <h2 className="text-lg font-semibold mb-4">EmptyState</h2>
        <EmptyState
          icon="📋"
          title="No items found"
          description="Try adjusting your filters or creating a new item."
        />
      </section>
    </div>
  );
}
