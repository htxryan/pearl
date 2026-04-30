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

| Token | Purpose | Swatch |
|-------|---------|--------|
| `--pearl-bg` | Page background | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(1 0 0)"></span> |
| `--pearl-fg` | Primary text color | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.145 0 0)"></span> |
| `--pearl-primary` | Brand accent (indigo) | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.511 0.23 277)"></span> |
| `--pearl-secondary` | Secondary surfaces | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.97 0 0)"></span> |
| `--pearl-muted` | Subdued backgrounds | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.97 0 0)"></span> |
| `--pearl-accent` | Highlighted elements | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.962 0.018 272.3)"></span> |
| `--pearl-border` | Border color | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.922 0 0)"></span> |
| `--pearl-ring` | Focus ring color | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.585 0.204 277.1)"></span> |
| `--pearl-surface` | Card/panel backgrounds | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(1 0 0)"></span> |

### Semantic colors

| Token | Purpose | Swatch |
|-------|---------|--------|
| `--pearl-success` | Positive states (green) | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.723 0.192 149.6)"></span> |
| `--pearl-info` | Informational states (blue) | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.623 0.188 259.8)"></span> |
| `--pearl-warning` | Warning states (yellow/orange) | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.769 0.165 70.1)"></span> |
| `--pearl-danger` | Error/destructive states (red) | <span style="display:inline-block;width:2rem;height:1rem;border-radius:4px;border:1px solid #ccc;background:oklch(0.637 0.208 25.3)"></span> |

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
