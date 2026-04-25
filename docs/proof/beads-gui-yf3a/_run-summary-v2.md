# Proof-it run summary (v2) — shadcn/BaseUI migration

Date: 2026-04-25T23:45:53.561Z
Meta-epic: beads-gui-yf3a

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | v2-01-sidebar-expanded | ✓ |  |
| 2 | v2-02-status-filter-popover | ✓ |  |
| 3 | v2-03-priority-filter-popover | ✓ |  |
| 4 | v2-04-type-filter-popover | ✓ |  |
| 5 | v2-05-create-issue-form | ✓ |  |
| 6 | v2-06-type-select-open | ✓ |  |
| 7 | v2-07-priority-select-open | ✓ |  |
| 8 | v2-08-date-picker-open | ✓ |  |
| 9 | v2-09-label-picker-open | ✓ |  |
| 10 | v2-10-tooltip-on-icon-button | 🔴 error | locator.hover: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has(svg.lucide-bell), button[aria-label*="notification" i]').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" id="base-ui-_r_2_" aria-expanded="false" aria-haspopup="dialog" aria-label="Notifications" data-base-ui-click-trigger="" class="relative flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">…</button>[22m
[2m  - attempting hover action[22m
[2m    2 × waiting for element to be visible and stable[22m
[2m      - element is visible and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying hover action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible and stable[22m
[2m      - element is visible and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying hover action[22m
[2m      - waiting 100ms[22m
[2m    58 × waiting for element to be visible and stable[22m
[2m       - element is visible and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m     - retrying hover action[22m
[2m       - waiting 500ms[22m
 |
| 11 | v2-11-notification-popover | 🔴 error | locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has(svg.lucide-bell), button[aria-label*="notification" i]').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" id="base-ui-_r_2_" aria-expanded="false" aria-haspopup="dialog" aria-label="Notifications" data-base-ui-click-trigger="" class="relative flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    58 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
 |
| 12 | v2-12-issue-detail-with-pickers | 🔴 error | locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('table tbody tr').first().locator('a').first()[22m
[2m    - locator resolved to <a data-discover="true" href="/issues/sample-project-dzp" aria-label="Open sample-project-dzp" class="truncate hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm">dzp</a>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m      - waiting 100ms[22m
[2m    58 × waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div data-open="" aria-hidden="true" role="presentation" data-base-ui-inert="" class="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"></div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
 |
| 13 | v2-13-detail-priority-select | 🔴 error | locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('button:has-text("P4"), button:has-text("P3"), button:has-text("P2"), button:has-text("P1"), button:has-text("P0")').first()[22m
[2m    - locator resolved to <button tabindex="0" type="button" role="combobox" id="base-ui-_r_5e_" aria-expanded="false" aria-haspopup="listbox" aria-label="Change priority for Implement token bucket algorithm" class="inline-flex items-center justify-between gap-1 rounded border border-border cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 hover:border-foreground/30 data-[placeholder]:text-muted-foreground min-h-[28px] text-xs border-none bg-transpa…>…</button>[22m
[2m  - attempting click action[22m
[2m    2 × waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div class="flex items-center justify-between mt-1">…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m    - retrying click action[22m
[2m    - waiting 20ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="flex items-center justify-between mt-1">…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m  2 × retrying click action[22m
[2m      - waiting 100ms[22m
[2m      - waiting for element to be visible, enabled and stable[22m
[2m      - element is visible, enabled and stable[22m
[2m      - scrolling into view if needed[22m
[2m      - done scrolling[22m
[2m      - <div>…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m  14 × retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="flex items-center justify-between mt-1">…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div class="flex items-center justify-between mt-1">…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div>…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m     - retrying click action[22m
[2m       - waiting 500ms[22m
[2m       - waiting for element to be visible, enabled and stable[22m
[2m       - element is visible, enabled and stable[22m
[2m       - scrolling into view if needed[22m
[2m       - done scrolling[22m
[2m       - <div>…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
[2m    - waiting for element to be visible, enabled and stable[22m
[2m    - element is visible, enabled and stable[22m
[2m    - scrolling into view if needed[22m
[2m    - done scrolling[22m
[2m    - <div class="flex items-center justify-between mt-1">…</div> from <div id="_r_d1_" data-base-ui-portal="">…</div> subtree intercepts pointer events[22m
[2m  - retrying click action[22m
[2m    - waiting 500ms[22m
 |
| 14 | v2-14-actions-menu-dropdown | ✓ |  |
| 15 | v2-15-alert-dialog-confirm-delete | ✓ |  |
| 16 | v2-16-command-palette | ✓ |  |
| 17 | v2-17-search-palette | ✓ |  |
| 18 | v2-19-settings-page | ✓ |  |
| 19 | v2-20-theme-monokai-applied | ✓ |  |
| 20 | v2-21-list-view-monokai-dark | ✓ |  |
| 21 | v2-22-create-dialog-monokai-dark | ✓ |  |
| 22 | v2-23-theme-solarized-light | ✓ |  |
| 23 | v2-24-list-view-solarized-light | ✓ |  |
| 24 | v2-25-board-view-solarized | ✓ |  |
| 25 | v2-26-graph-view-solarized | ✓ |  |
| 26 | v2-27-back-to-default-light | ✓ |  |