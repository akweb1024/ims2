# UI Style Implementation Guide

## Purpose
This guide helps you replicate the **same UI/UX, color schema, spacing rhythm, and component styling** from this project into another existing project.

Use this as the implementation source of truth for frontend styling.

## 1. Design System Foundation

### 1.1 Core stack
- Tailwind CSS (v4 style tokens + utility classes)
- CSS custom properties (theme tokens)
- `next-themes` (`darkMode: "class"`)
- shadcn-style UI primitives (`Button`, `Card`, `Input`, `Dialog`, `Table`, etc.)

### 1.2 Token architecture
The system is token-first:
- Semantic tokens are set in `:root` and `.dark`
- Tailwind utilities consume those tokens (`bg-background`, `text-foreground`, `border-border`, etc.)
- Components should prefer semantic utilities over hardcoded colors

## 2. Color Schema (Exact Tokens)

Copy these values exactly into your target project's global CSS token file.

### 2.1 Light theme tokens
```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.99 0.01 260);
  --foreground: oklch(0.15 0.02 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0.02 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.15 0.02 260);
  --primary: oklch(0.49 0.21 264);
  --primary-foreground: oklch(0.98 0.01 260);
  --secondary: oklch(0.96 0.02 260);
  --secondary-foreground: oklch(0.25 0.04 260);
  --muted: oklch(0.96 0.02 260);
  --muted-foreground: oklch(0.45 0.03 260);
  --accent: oklch(0.95 0.03 260);
  --accent-foreground: oklch(0.25 0.04 260);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.92 0.02 260);
  --input: oklch(0.92 0.02 260);
  --ring: oklch(0.49 0.21 264);
  --chart-1: oklch(0.49 0.21 264);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.45 0.15 220);
  --chart-4: oklch(0.7 0.15 320);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.98 0.01 260);
  --sidebar-foreground: oklch(0.25 0.04 260);
  --sidebar-primary: oklch(0.49 0.21 264);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.95 0.03 260);
  --sidebar-accent-foreground: oklch(0.15 0.02 260);
  --sidebar-border: oklch(0.92 0.02 260);
  --sidebar-ring: oklch(0.49 0.21 264);
}
```

### 2.2 Dark theme tokens
```css
.dark {
  --background: oklch(0.13 0.02 260);
  --foreground: oklch(0.98 0.01 260);
  --card: oklch(0.16 0.02 260);
  --card-foreground: oklch(0.98 0.01 260);
  --popover: oklch(0.16 0.02 260);
  --popover-foreground: oklch(0.98 0.01 260);
  --primary: oklch(0.65 0.2 264);
  --primary-foreground: oklch(0.13 0.02 260);
  --secondary: oklch(0.22 0.03 260);
  --secondary-foreground: oklch(0.95 0.03 260);
  --muted: oklch(0.22 0.03 260);
  --muted-foreground: oklch(0.65 0.05 260);
  --accent: oklch(0.25 0.04 260);
  --accent-foreground: oklch(0.98 0.01 260);
  --destructive: oklch(0.6 0.2 25);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.22 0.03 260);
  --input: oklch(0.22 0.03 260);
  --ring: oklch(0.65 0.2 264);
  --chart-1: oklch(0.65 0.2 264);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.7 0.15 220);
  --chart-4: oklch(0.8 0.15 320);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.13 0.02 260);
  --sidebar-foreground: oklch(0.85 0.03 260);
  --sidebar-primary: oklch(0.65 0.2 264);
  --sidebar-primary-foreground: oklch(0.13 0.02 260);
  --sidebar-accent: oklch(0.2 0.03 260);
  --sidebar-accent-foreground: oklch(0.95 0.03 260);
  --sidebar-border: oklch(0.2 0.03 260);
  --sidebar-ring: oklch(0.65 0.2 264);
}
```

## 3. Typography

### 3.1 Font families
- Primary UI font: `Geist` (`--font-geist-sans`)
- Mono font for technical labels/chips: `Geist Mono` (`--font-geist-mono`)

### 3.2 Typography behavior
- Keep `antialiased` globally
- Keep selection style: `selection:bg-primary selection:text-primary-foreground`
- Body feature settings:
```css
font-feature-settings: "rlig" 1, "calt" 1, "cv01" 1, "cv02" 1;
```

## 4. Radius, Corners, Borders

### 4.1 Global corner scale
- Base radius token: `--radius: 0.625rem` (10px)
- Derived tokens:
  - `--radius-sm = 6px`
  - `--radius-md = 8px`
  - `--radius-lg = 10px`
  - `--radius-xl = 14px`

### 4.2 Common radius usage patterns
- Inputs/Buttons: `rounded-md` (8px)
- Cards: `rounded-xl` (14px)
- Action tiles & metric tiles: often `rounded-xl` or `rounded-2xl`
- Pills/badges/search shells: `rounded-full`

### 4.3 Border strategy
- Default: `border border-border`
- Soft surfaces: `border-border/50` or `border-border/60`
- Active/priority states: add left accent border (`border-l-4 border-l-primary/60` etc.)

## 5. Spacing, Margin, Padding Rhythm

### 5.1 Page container
Use this utility for almost all app pages:
```css
.page-wrapper {
  @apply w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8;
}
```

### 5.2 Vertical rhythm
- Page sections: `space-y-6` or `space-y-8`
- Card internal spacing: `py-6` + `px-6`
- Dense rows: `p-3` / `p-4`
- Feature tiles: `p-5`

### 5.3 Grid rhythm
- Standard desktop cards: `gap-6`
- Compact tiles/chips: `gap-3` or `gap-4`
- Responsive patterns commonly used:
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - `grid-cols-1 md:grid-cols-2 lg:grid-cols-7`
  - `grid-cols-1 lg:grid-cols-3`

## 6. Layout Design Patterns

### 6.1 App shell
- Sidebar width: `16rem`
- Sidebar mobile width: `18rem`
- Collapsed icon width: `3rem`
- Top header: `h-14` mobile, `lg:h-[65px]`
- Header style: `bg-background/80 backdrop-blur-md border-b border-border`

### 6.2 Sidebar style
- Surface: `bg-card`, right border `border-border`
- Nav item shape: `rounded-xl px-3 py-2.5`
- Active nav state:
  - Background tint: `bg-primary/8`
  - Text: `text-primary`
  - Left indicator strip

### 6.3 Content styling
- Main area scrolls independently: `overflow-y-auto`
- Keep horizontal overflow hidden: `overflow-x-hidden`

## 7. Component Styling Specs

### 7.1 Button spec
Base behavior:
- Height default: `h-9`
- Radius: `rounded-md`
- Focus ring: `focus-visible:ring-[3px] focus-visible:ring-ring/50`

Variants:
- Primary: `bg-primary text-primary-foreground hover:bg-primary/90`
- Outline: `border bg-background hover:bg-accent`
- Secondary: `bg-secondary text-secondary-foreground`
- Ghost: hover-only surface (`hover:bg-accent`)
- Destructive: `bg-destructive text-white`

### 7.2 Card spec
- Base: `rounded-xl border shadow-sm`
- Standard body spacing: `px-6 py-6`
- Common upgraded style: `glass-card border-border/60 shadow-sm`

### 7.3 Input spec
- Height: `h-9`
- Radius: `rounded-md`
- Border: `border-input`
- Focus ring: same 3px pattern as Button
- Placeholder: `text-muted-foreground`

### 7.4 Dialog spec
- Overlay: `bg-black/50`
- Modal panel: `rounded-lg border p-6 shadow-lg`
- Max width: `sm:max-w-lg`
- Motion: fade + zoom in/out

### 7.5 Table spec
- Text size: `text-sm`
- Header row: subtle bottom border
- Row hover: `hover:bg-muted/50`
- Cell spacing: `p-2`

## 8. Surface Effects and Visual Feel

### 8.1 Glass utilities
Use these utilities to maintain identical visual feel:
```css
.glass-panel {
  @apply bg-background/80 backdrop-blur-md border border-border/50 shadow-sm;
}

.glass-card {
  @apply bg-card/60 backdrop-blur-sm border border-border shadow-sm;
}
```

### 8.2 Shadows and elevation
- Base cards: `shadow-sm`
- Hover elevation: `hover:shadow-md` or `hover:shadow-lg`
- Floating overlays/dropdowns: `shadow-xl`

### 8.3 Interaction motion
- Keep transitions short and soft (`duration-200` or `duration-300`)
- Micro movement: `hover:-translate-y-0.5` or `hover:-translate-y-1`

## 9. Animation Standard

Use existing utility animation tokens:
- `animate-fade-in`
- `animate-fade-in-up`
- `animate-scale-in`
- `animate-slide-in-right`
- `stagger-children` for dashboard tiles

Avoid heavy/parallax animation; keep movement subtle and functional.

## 10. Implementation Steps for Target Project

1. Add global design tokens (`:root`, `.dark`) exactly as above.
2. Enable `darkMode: "class"` in Tailwind config.
3. Map semantic Tailwind colors (`background`, `foreground`, `primary`, etc.) to CSS variables.
4. Set radius mappings (`lg/md/sm`) from `--radius` token.
5. Add utility classes: `.page-wrapper`, `.glass-panel`, `.glass-card`, and animation utilities.
6. Align core primitives first (`Button`, `Input`, `Card`, `Dialog`, `Table`) before page-level restyling.
7. Refactor pages to semantic classes (`bg-background`, `text-foreground`, `border-border`) and remove hardcoded hex where possible.
8. Apply shell consistency (sidebar width, header height, nav item styles).
9. Apply spacing rhythm and grid patterns to each module screen.
10. Run light + dark visual QA on desktop and mobile breakpoints.

## 11. QA Checklist (Definition of Done)

- [ ] Light and dark mode both look coherent and token-correct.
- [ ] No major screens rely on hardcoded colors for base surfaces/text.
- [ ] Primary buttons, inputs, cards, and dialogs visually match this project.
- [ ] Page containers are consistent (`max-w-7xl`, horizontal paddings, vertical rhythm).
- [ ] Sidebar/nav/header behavior and spacing match the shell pattern.
- [ ] Focus ring and accessibility states are visible (`ring-[3px]`).
- [ ] Hover states are subtle, not jumpy.
- [ ] Scrollbars are styled and not visually broken.
- [ ] Mobile layout spacing and typography remain clean.

## 12. Notes for Your Developer

- Do not start by copying random page CSS.
- First lock the design tokens and primitive components.
- After primitives are aligned, page migration becomes much faster and consistent.
- Use semantic classes everywhere so future theme updates require only token changes.

## 13. Source References in This Project

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/app/layout.tsx`
- `src/components/layout/ClientLayout.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/table.tsx`
- `src/app/page.tsx`
