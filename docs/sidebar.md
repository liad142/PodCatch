# Sidebar Navigation Documentation

## Overview

PodCatch uses a fixed left sidebar for navigation on desktop and a slide-over drawer on mobile. The sidebar includes all main navigation items, theme toggle, and user status section.

## Routes Mapping

| Label | Route | Icon |
|-------|-------|------|
| Discover | `/browse` | Compass |
| My Podcasts | `/my-podcasts` | Radio |
| Feed | `/feed` | Rss |
| Episode Summaries | `/summaries` | FileText |
| Smart Notes | `/smart-notes` | Brain |
| Saved | `/saved` | Bookmark |
| Settings | `/settings` | Settings |

**Note:** The home page (`/`) also shows "My Podcasts" content and highlights the "My Podcasts" nav item.

## Adding New Navigation Items

To add a new navigation item, edit the `NAV_ITEMS` array in `src/components/Sidebar.tsx`:

```typescript
const NAV_ITEMS = [
  { label: 'Discover', href: '/browse', icon: Compass },
  { label: 'My Podcasts', href: '/my-podcasts', icon: Radio },
  // Add new items here:
  { label: 'New Feature', href: '/new-feature', icon: SomeIcon },
  // ...
] as const;
```

Each item requires:
- `label`: Display text shown in the sidebar
- `href`: Route path
- `icon`: Lucide React icon component

## Mobile Behavior

### Breakpoints
- **Desktop (lg: 1024px+)**: Fixed sidebar visible, 256px width
- **Mobile/Tablet (< 1024px)**: Sidebar hidden, hamburger menu in top header

### Mobile Navigation
1. Hamburger button in top-left opens the drawer
2. Drawer slides in from the left
3. Tapping outside the drawer or pressing Escape closes it
4. Navigating to a page automatically closes the drawer

### Accessibility Features
- `aria-label` on hamburger button
- `aria-expanded` state on toggle
- `role="dialog"` and `aria-modal="true"` on drawer
- Focus trap when drawer is open
- Keyboard navigation (Tab through items, Escape to close)

## Theme Toggle Implementation

### Location
The theme toggle appears in two places:
1. **Desktop**: Top-right of the sidebar header
2. **Mobile**: Top-right of the mobile header bar

### Persistence Strategy
1. **Initial Load**: Checks `localStorage` for `podcatch-theme` key
2. **Default**: If no stored preference, follows system preference (`prefers-color-scheme`)
3. **On Toggle**: Saves choice to `localStorage` and applies immediately
4. **System Changes**: Listens for system theme changes when set to "system" mode

### Theme Values
- `light`: Force light mode
- `dark`: Force dark mode  
- `system`: Follow OS/browser preference

### Implementation Details
- Theme is applied via CSS class on `<html>` element (`dark` or `light`)
- CSS variables in `globals.css` define colors for both modes
- Uses `suppressHydrationWarning` on `<html>` to prevent hydration mismatch

### Usage in Components

```typescript
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  
  // theme: 'light' | 'dark' | 'system' (user preference)
  // resolvedTheme: 'light' | 'dark' (actual applied theme)
  // setTheme: (theme) => void (set specific theme)
  // toggleTheme: () => void (toggle between light/dark)
}
```

## File Structure

```
src/
├── app/
│   └── layout.tsx          # Root layout with Sidebar
├── components/
│   └── Sidebar.tsx         # Main sidebar component
└── contexts/
    └── ThemeContext.tsx    # Theme provider and hook
```

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ [Mobile Header - visible < lg]                      │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  Sidebar │         Main Content Area                │
│  (fixed) │         (max-width: 7xl)                 │
│  256px   │                                          │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### CSS Classes Applied
- Desktop: `lg:pl-64` (padding for sidebar width)
- Mobile: `pt-14` (padding for mobile header height)

## Settings Page Theme Selection

The Settings page (`/settings`) provides a more detailed theme selector with three options:
- Light (Sun icon)
- Dark (Moon icon)
- System (Monitor icon)

This gives users explicit control over following system preferences vs. a fixed theme.
