import { http, HttpResponse, delay } from 'msw';

// Mock Spotify API data
const mockCategories = {
  categories: {
    items: [
      {
        id: 'comedy',
        name: 'Comedy',
        icons: [{ url: 'https://example.com/comedy.jpg', height: 274, width: 274 }],
      },
      {
        id: 'news',
        name: 'News & Politics',
        icons: [{ url: 'https://example.com/news.jpg', height: 274, width: 274 }],
      },
      {
        id: 'true-crime',
        name: 'True Crime',
        icons: [{ url: 'https://example.com/crime.jpg', height: 274, width: 274 }],
      },
      {
        id: 'sports',
        name: 'Sports',
        icons: [{ url: 'https://example.com/sports.jpg', height: 274, width: 274 }],
      },
    ],
    total: 4,
    limit: 20,
    offset: 0,
  },
};

const mockShow = {
  id: 'test-show-123',
  name: 'The Test Podcast',
  description: 'A comprehensive test podcast for development purposes.',
  publisher: 'Test Publisher Inc.',
  total_episodes: 150,
  explicit: false,
  languages: ['en'],
  media_type: 'audio',
  images: [
    { url: 'https://example.com/show-large.jpg', height: 640, width: 640 },
    { url: 'https://example.com/show-medium.jpg', height: 300, width: 300 },
    { url: 'https://example.com/show-small.jpg', height: 64, width: 64 },
  ],
  external_urls: {
    spotify: 'https://open.spotify.com/show/test-show-123',
  },
  episodes: {
    items: [
      {
        id: 'ep-001',
        name: 'Episode 1: Getting Started',
        description: 'The first episode of our journey.',
        release_date: '2024-01-15',
        duration_ms: 3600000,
        explicit: false,
        images: [{ url: 'https://example.com/ep1.jpg' }],
      },
      {
        id: 'ep-002',
        name: 'Episode 2: Deep Dive',
        description: 'We explore the topic in depth.',
        release_date: '2024-01-22',
        duration_ms: 4200000,
        explicit: false,
        images: [{ url: 'https://example.com/ep2.jpg' }],
      },
    ],
    total: 150,
    limit: 20,
    offset: 0,
  },
};

const mockSearchResults = {
  shows: {
    items: [
      {
        id: 'search-result-1',
        name: 'Tech Talk Daily',
        description: 'Daily tech news and insights',
        publisher: 'Tech Media Group',
        images: [{ url: 'https://example.com/tech.jpg' }],
        total_episodes: 500,
      },
      {
        id: 'search-result-2',
        name: 'The Tech Podcast',
        description: 'Weekly deep dives into technology',
        publisher: 'Independent Creator',
        images: [{ url: 'https://example.com/tech2.jpg' }],
        total_episodes: 200,
      },
    ],
    total: 2,
    limit: 20,
    offset: 0,
  },
};

// Rate limit tracking for testing
let requestCount = 0;
const RATE_LIMIT_THRESHOLD = 100;

export const handlers = [
  // Spotify Categories API
  http.get('/api/spotify/categories', async ({ request }) => {
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'US';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Simulate rate limiting
    requestCount++;
    if (requestCount > RATE_LIMIT_THRESHOLD) {
      return HttpResponse.json(
        { error: { status: 429, message: 'Rate limit exceeded' } },
        { status: 429, headers: { 'Retry-After': '30' } }
      );
    }

    // Return categories with pagination applied
    const categories = {
      ...mockCategories,
      categories: {
        ...mockCategories.categories,
        items: mockCategories.categories.items.slice(offset, offset + limit),
        limit,
        offset,
      },
    };

    return HttpResponse.json({ ...categories, market });
  }),

  // Spotify Show Details API
  http.get('/api/spotify/shows/:id', async ({ params, request }) => {
    const { id } = params;
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'US';

    // Simulate rate limiting
    requestCount++;
    if (requestCount > RATE_LIMIT_THRESHOLD) {
      return HttpResponse.json(
        { error: { status: 429, message: 'Rate limit exceeded' } },
        { status: 429, headers: { 'Retry-After': '30' } }
      );
    }

    // Simulate not found
    if (id === 'not-found') {
      return HttpResponse.json(
        { error: { status: 404, message: 'Show not found' } },
        { status: 404 }
      );
    }

    // Simulate server error
    if (id === 'server-error') {
      return HttpResponse.json(
        { error: { status: 500, message: 'Internal server error' } },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      ...mockShow,
      id,
      market,
    });
  }),

  // Spotify Search API
  http.get('/api/spotify/search', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const type = url.searchParams.get('type') || 'show';
    const market = url.searchParams.get('market') || 'US';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Simulate rate limiting
    requestCount++;
    if (requestCount > RATE_LIMIT_THRESHOLD) {
      return HttpResponse.json(
        { error: { status: 429, message: 'Rate limit exceeded' } },
        { status: 429, headers: { 'Retry-After': '30' } }
      );
    }

    // Empty query returns empty results
    if (!query || query.trim() === '') {
      return HttpResponse.json({
        shows: { items: [], total: 0, limit, offset },
      });
    }

    // Simulate search with query in results
    const results = {
      shows: {
        ...mockSearchResults.shows,
        items: mockSearchResults.shows.items.map((item) => ({
          ...item,
          name: `${query} - ${item.name}`,
        })),
      },
      market,
      query,
    };

    return HttpResponse.json(results);
  }),

  // Spotify Top Shows by Category
  http.get('/api/spotify/categories/:categoryId/shows', async ({ params, request }) => {
    const { categoryId } = params;
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'US';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Simulate rate limiting
    requestCount++;
    if (requestCount > RATE_LIMIT_THRESHOLD) {
      return HttpResponse.json(
        { error: { status: 429, message: 'Rate limit exceeded' } },
        { status: 429, headers: { 'Retry-After': '30' } }
      );
    }

    return HttpResponse.json({
      shows: mockSearchResults.shows.items.slice(0, limit),
      categoryId,
      market,
    });
  }),

  // Simulate slow response
  http.get('/api/spotify/slow', async () => {
    await delay(3000);
    return HttpResponse.json({ message: 'Slow response completed' });
  }),

  // Simulate network error
  http.get('/api/spotify/network-error', async () => {
    return HttpResponse.error();
  }),
];

// Helper to reset rate limit counter for testing
export const resetRateLimitCounter = () => {
  requestCount = 0;
};

// Export mock data for use in tests
export { mockCategories, mockShow, mockSearchResults };
