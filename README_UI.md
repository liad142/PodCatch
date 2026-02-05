# Liquid Glass UI System

This project uses a custom Glassmorphism design system built with Tailwind CSS.

## Usage

### Glass Design Tokens (`src/lib/glass.ts`)

Import standard glass styles from the library:

```tsx
import { glass } from '@/lib/glass';

// Usage
<div className={glass.card}>Content</div>
```

Available tokens:
- `glass.card`: Main content containers (high blur, subtle border)
- `glass.cardSubtle`: Lighter background for nested items
- `glass.sidebar`: Navigation panels
- `glass.input`: Form inputs
- `glass.buttonPrimary` / `glass.buttonGhost`: Actions
- `glass.overlay`: Modal backdrops
- `glass.modal`: Dialog content

### Component Variants

Core components have been updated with glass variants:

**Card**
```tsx
<Card variant="glass">...</Card>
<Card variant="glass-subtle">...</Card>
```

**Button**
```tsx
<Button variant="glass">Ghost Glass</Button>
<Button variant="glass-outline">Bordered Glass</Button>
<Button variant="glass-primary">Primary Glass</Button>
```

**Badge**
```tsx
<Badge variant="glass">Tag</Badge>
```

**Input**
Default input style is now glass-styled.

### Layout Classes

- `.glass-bg`: Applied to `body` for the global gradient background.
