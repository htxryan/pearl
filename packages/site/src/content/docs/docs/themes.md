---
title: Themes
description: Customize Pearl's appearance with the design token system.
sidebar:
  order: 4
---

Pearl uses a design token system built on CSS custom properties. Every visual property — color, typography, spacing, elevation — comes from a finite token scale, ensuring consistency across the UI.

## Dark and light modes

Pearl supports both dark and light modes. The active mode is determined by your system preference (`prefers-color-scheme`), with dark mode as the default.

The theme applies automatically — no configuration needed.

## Design tokens

Pearl's visual identity is defined by a set of CSS custom properties in the `:root` scope. These tokens use the [OKLCH color space](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) for perceptually uniform colors.

### Core palette

| Token | Purpose |
|-------|---------|
| `--pearl-bg` | Page background |
| `--pearl-fg` | Primary text color |
| `--pearl-primary` | Brand accent (indigo) |
| `--pearl-secondary` | Secondary surfaces |
| `--pearl-muted` | Subdued backgrounds |
| `--pearl-accent` | Highlighted elements |
| `--pearl-border` | Border color |
| `--pearl-ring` | Focus ring color |
| `--pearl-surface` | Card/panel backgrounds |

### Semantic colors

| Token | Purpose |
|-------|---------|
| `--pearl-success` | Positive states (green) |
| `--pearl-info` | Informational states (blue) |
| `--pearl-warning` | Warning states (yellow/orange) |
| `--pearl-danger` | Error/destructive states (red) |

Each semantic color has a corresponding `-fg` variant for text on that background (e.g., `--pearl-success-fg`).

### Typography

Pearl uses two variable fonts:

- **Inter Variable** — sans-serif, used for body text and headings
- **JetBrains Mono Variable** — monospace, used for code and technical content

These are available through the `--pearl-font-sans` and `--pearl-font-mono` tokens.

### Elevation

Three shadow levels create depth hierarchy:

| Token | Use case |
|-------|----------|
| `--pearl-shadow-sm` | Subtle lift (buttons, badges) |
| `--pearl-shadow-md` | Cards and panels |
| `--pearl-shadow-lg` | Modals and popovers |

## Design philosophy

Pearl's design system follows three principles:

1. **Constrained decision spaces** — every visual property comes from a finite scale, not open-ended values
2. **Deep modules, simple interfaces** — components have small API surfaces with smart defaults
3. **Hierarchy through all channels** — size, weight, and color work together for visual hierarchy
