# Testing Setup Guide

This document provides instructions for setting up the testing environment for the PodCatch project.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PodCatch project cloned and dependencies installed

## Installation

### 1. Install Testing Dependencies

Run the following command to install all required testing dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw @vitejs/plugin-react jsdom
```

Or using yarn:

```bash
yarn add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw @vitejs/plugin-react jsdom
```

### 2. Update package.json

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Create Vitest Configuration

Create a `vitest.config.ts` file in the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 4. Create Test Setup File

Create a `src/__tests__/setup.ts` file:

```typescript
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());
```

### 5. Create MSW Handlers

Create the MSW (Mock Service Worker) handlers for API mocking.

Create `src/__tests__/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Spotify Categories
  http.get('/api/spotify/categories', ({ request }) => {
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'US';

    return HttpResponse.json({
      categories: {
        items: [
          { id: 'comedy', name: 'Comedy', icons: [{ url: 'https://example.com/comedy.jpg' }] },
          { id: 'news', name: 'News', icons: [{ url: 'https://example.com/news.jpg' }] },
        ],
      },
      market,
    });
  }),

  // Spotify Shows
  http.get('/api/spotify/shows/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      name: 'Test Podcast',
      description: 'A test podcast description',
      publisher: 'Test Publisher',
      images: [{ url: 'https://example.com/show.jpg' }],
      episodes: {
        items: [
          { id: 'ep1', name: 'Episode 1', description: 'First episode' },
          { id: 'ep2', name: 'Episode 2', description: 'Second episode' },
        ],
      },
    });
  }),

  // Spotify Search
  http.get('/api/spotify/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query) {
      return HttpResponse.json({ shows: { items: [] } });
    }

    return HttpResponse.json({
      shows: {
        items: [
          { id: 'show1', name: `${query} Podcast`, publisher: 'Publisher 1' },
          { id: 'show2', name: `Best of ${query}`, publisher: 'Publisher 2' },
        ],
      },
    });
  }),
];
```

Create `src/__tests__/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests with UI
```bash
npm run test:ui
```

## Directory Structure

```
src/
  __tests__/
    setup.ts              # Test setup file
    mocks/
      handlers.ts         # MSW request handlers
      server.ts           # MSW server setup
    api/
      spotify/
        categories/
          route.test.ts   # Categories API tests
        shows/
          [id]/
            route.test.ts # Shows API tests
        search/
          route.test.ts   # Search API tests
    components/
      Carousel.test.tsx         # Carousel component tests
      SpotifyShowCard.test.tsx  # SpotifyShowCard component tests
      CategoryCard.test.tsx     # CategoryCard component tests
```

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Isolation**: Each test should be independent and not rely on other tests
3. **Mocking**: Use MSW for API mocking to ensure consistent test behavior
4. **Coverage**: Aim for at least 80% code coverage
5. **Cleanup**: Always clean up after tests (handled by setup file)

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure path aliases are correctly configured in `vitest.config.ts`
2. **MSW not intercepting requests**: Check that the server is started in the setup file
3. **React hooks errors**: Make sure `@vitejs/plugin-react` is installed and configured

### Debug Mode

To run tests in debug mode:
```bash
npm test -- --reporter=verbose
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
