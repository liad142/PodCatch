import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock SpotifyShowCard Component
// In a real scenario, import the actual component
interface SpotifyShow {
  id: string;
  name: string;
  description: string;
  publisher: string;
  images: Array<{ url: string; height?: number; width?: number }>;
  total_episodes: number;
  explicit: boolean;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyShowCardProps {
  show: SpotifyShow;
  isLoading?: boolean;
  error?: string | null;
  onClick?: (show: SpotifyShow) => void;
  onListenClick?: (spotifyUrl: string) => void;
  variant?: 'default' | 'compact' | 'featured';
}

// Mock implementation for testing
const SpotifyShowCard: React.FC<SpotifyShowCardProps> = ({
  show,
  isLoading = false,
  error = null,
  onClick,
  onListenClick,
  variant = 'default',
}) => {
  if (isLoading) {
    return (
      <div data-testid="show-card" className="show-card loading">
        <div data-testid="skeleton-image" className="animate-pulse bg-gray-200 aspect-square" />
        <div data-testid="skeleton-title" className="animate-pulse bg-gray-200 h-4 mt-2" />
        <div data-testid="skeleton-publisher" className="animate-pulse bg-gray-200 h-3 mt-1" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="show-card" className="show-card error">
        <div data-testid="error-message" className="text-red-500">
          {error}
        </div>
      </div>
    );
  }

  const handleCardClick = () => {
    onClick?.(show);
  };

  const handleListenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onListenClick?.(show.external_urls.spotify);
  };

  const imageUrl = show.images?.[0]?.url || '';

  return (
    <div
      data-testid="show-card"
      className={`show-card cursor-pointer ${variant}`}
      onClick={handleCardClick}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={show.name}
          data-testid="show-image"
          className="aspect-square object-cover"
        />
      ) : (
        <div data-testid="placeholder-image" className="aspect-square bg-gray-200" />
      )}

      <div className="show-content p-4">
        <h3 data-testid="show-title" className="font-semibold line-clamp-2">
          {show.name}
        </h3>

        <p data-testid="show-publisher" className="text-sm text-gray-500 mt-1">
          {show.publisher}
        </p>

        <p data-testid="show-description" className="text-sm mt-2 line-clamp-2">
          {show.description}
        </p>

        <div className="flex items-center gap-2 mt-3">
          <span data-testid="episode-count" className="text-xs text-gray-400">
            {show.total_episodes} episodes
          </span>

          {show.explicit && (
            <span data-testid="explicit-badge" className="text-xs bg-gray-200 px-1 rounded">
              E
            </span>
          )}
        </div>

        <button
          data-testid="listen-button"
          onClick={handleListenClick}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded-full"
        >
          Listen on Spotify
        </button>
      </div>
    </div>
  );
};

describe('SpotifyShowCard Component', () => {
  const mockShow: SpotifyShow = {
    id: 'show-123',
    name: 'The Test Podcast',
    description: 'A fascinating podcast about testing and quality assurance in software development.',
    publisher: 'Test Publisher Inc.',
    images: [
      { url: 'https://example.com/large.jpg', height: 640, width: 640 },
      { url: 'https://example.com/medium.jpg', height: 300, width: 300 },
    ],
    total_episodes: 150,
    explicit: false,
    external_urls: {
      spotify: 'https://open.spotify.com/show/test-123',
    },
  };

  const mockExplicitShow: SpotifyShow = {
    ...mockShow,
    id: 'show-456',
    explicit: true,
  };

  const mockShowNoImage: SpotifyShow = {
    ...mockShow,
    id: 'show-789',
    images: [],
  };

  describe('Rendering with Props', () => {
    it('renders show card with all information', () => {
      render(<SpotifyShowCard show={mockShow} />);

      expect(screen.getByTestId('show-card')).toBeInTheDocument();
      expect(screen.getByTestId('show-title')).toHaveTextContent('The Test Podcast');
      expect(screen.getByTestId('show-publisher')).toHaveTextContent('Test Publisher Inc.');
      expect(screen.getByTestId('show-description')).toBeInTheDocument();
    });

    it('renders show image correctly', () => {
      render(<SpotifyShowCard show={mockShow} />);

      const image = screen.getByTestId('show-image');
      expect(image).toHaveAttribute('src', 'https://example.com/large.jpg');
      expect(image).toHaveAttribute('alt', 'The Test Podcast');
    });

    it('renders placeholder when no image is available', () => {
      render(<SpotifyShowCard show={mockShowNoImage} />);

      expect(screen.getByTestId('placeholder-image')).toBeInTheDocument();
      expect(screen.queryByTestId('show-image')).not.toBeInTheDocument();
    });

    it('shows episode count', () => {
      render(<SpotifyShowCard show={mockShow} />);

      expect(screen.getByTestId('episode-count')).toHaveTextContent('150 episodes');
    });

    it('shows explicit badge for explicit shows', () => {
      render(<SpotifyShowCard show={mockExplicitShow} />);

      expect(screen.getByTestId('explicit-badge')).toBeInTheDocument();
    });

    it('does not show explicit badge for non-explicit shows', () => {
      render(<SpotifyShowCard show={mockShow} />);

      expect(screen.queryByTestId('explicit-badge')).not.toBeInTheDocument();
    });

    it('renders Listen on Spotify button', () => {
      render(<SpotifyShowCard show={mockShow} />);

      expect(screen.getByTestId('listen-button')).toHaveTextContent('Listen on Spotify');
    });

    it('truncates long titles', () => {
      const longTitleShow = {
        ...mockShow,
        name: 'This is a very long podcast title that should be truncated to prevent overflow',
      };

      render(<SpotifyShowCard show={longTitleShow} />);

      const title = screen.getByTestId('show-title');
      expect(title).toHaveClass('line-clamp-2');
    });

    it('truncates long descriptions', () => {
      render(<SpotifyShowCard show={mockShow} />);

      const description = screen.getByTestId('show-description');
      expect(description).toHaveClass('line-clamp-2');
    });
  });

  describe('Loading State', () => {
    it('shows skeleton elements when loading', () => {
      render(<SpotifyShowCard show={mockShow} isLoading={true} />);

      expect(screen.getByTestId('skeleton-image')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-title')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-publisher')).toBeInTheDocument();
    });

    it('skeleton elements have animation class', () => {
      render(<SpotifyShowCard show={mockShow} isLoading={true} />);

      expect(screen.getByTestId('skeleton-image')).toHaveClass('animate-pulse');
      expect(screen.getByTestId('skeleton-title')).toHaveClass('animate-pulse');
    });

    it('does not show actual content when loading', () => {
      render(<SpotifyShowCard show={mockShow} isLoading={true} />);

      expect(screen.queryByTestId('show-title')).not.toBeInTheDocument();
      expect(screen.queryByTestId('show-image')).not.toBeInTheDocument();
    });

    it('card has loading class when loading', () => {
      render(<SpotifyShowCard show={mockShow} isLoading={true} />);

      expect(screen.getByTestId('show-card')).toHaveClass('loading');
    });
  });

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(<SpotifyShowCard show={mockShow} error="Failed to load show" />);

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Failed to load show')).toBeInTheDocument();
    });

    it('error message has error styling', () => {
      render(<SpotifyShowCard show={mockShow} error="Error occurred" />);

      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toHaveClass('text-red-500');
    });

    it('does not show show content when error is present', () => {
      render(<SpotifyShowCard show={mockShow} error="Something went wrong" />);

      expect(screen.queryByTestId('show-title')).not.toBeInTheDocument();
      expect(screen.queryByTestId('show-image')).not.toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('calls onClick with show data when card is clicked', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(<SpotifyShowCard show={mockShow} onClick={onClick} />);

      await user.click(screen.getByTestId('show-card'));

      expect(onClick).toHaveBeenCalledWith(mockShow);
    });

    it('calls onListenClick with Spotify URL when button is clicked', async () => {
      const onListenClick = vi.fn();
      const user = userEvent.setup();

      render(<SpotifyShowCard show={mockShow} onListenClick={onListenClick} />);

      await user.click(screen.getByTestId('listen-button'));

      expect(onListenClick).toHaveBeenCalledWith('https://open.spotify.com/show/test-123');
    });

    it('Listen button click does not trigger card onClick', async () => {
      const onClick = vi.fn();
      const onListenClick = vi.fn();
      const user = userEvent.setup();

      render(
        <SpotifyShowCard
          show={mockShow}
          onClick={onClick}
          onListenClick={onListenClick}
        />
      );

      await user.click(screen.getByTestId('listen-button'));

      expect(onListenClick).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('card is clickable with cursor pointer', () => {
      render(<SpotifyShowCard show={mockShow} />);

      expect(screen.getByTestId('show-card')).toHaveClass('cursor-pointer');
    });
  });

  describe('Variants', () => {
    it('renders default variant by default', () => {
      render(<SpotifyShowCard show={mockShow} />);

      expect(screen.getByTestId('show-card')).toHaveClass('default');
    });

    it('renders compact variant when specified', () => {
      render(<SpotifyShowCard show={mockShow} variant="compact" />);

      expect(screen.getByTestId('show-card')).toHaveClass('compact');
    });

    it('renders featured variant when specified', () => {
      render(<SpotifyShowCard show={mockShow} variant="featured" />);

      expect(screen.getByTestId('show-card')).toHaveClass('featured');
    });
  });

  describe('Accessibility', () => {
    it('image has alt text matching show name', () => {
      render(<SpotifyShowCard show={mockShow} />);

      const image = screen.getByTestId('show-image');
      expect(image).toHaveAttribute('alt', mockShow.name);
    });

    it('button is focusable', () => {
      render(<SpotifyShowCard show={mockShow} />);

      const button = screen.getByTestId('listen-button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    it('handles show with missing optional fields', () => {
      const minimalShow: SpotifyShow = {
        id: 'minimal-123',
        name: 'Minimal Show',
        description: '',
        publisher: 'Unknown',
        images: [],
        total_episodes: 0,
        explicit: false,
        external_urls: {
          spotify: 'https://open.spotify.com/show/minimal',
        },
      };

      render(<SpotifyShowCard show={minimalShow} />);

      expect(screen.getByTestId('show-card')).toBeInTheDocument();
      expect(screen.getByTestId('episode-count')).toHaveTextContent('0 episodes');
    });

    it('handles very long publisher names', () => {
      const longPublisherShow: SpotifyShow = {
        ...mockShow,
        publisher: 'This Is A Very Long Publisher Name That Should Be Handled Gracefully',
      };

      render(<SpotifyShowCard show={longPublisherShow} />);

      expect(screen.getByTestId('show-publisher')).toBeInTheDocument();
    });

    it('handles special characters in show name', () => {
      const specialCharShow: SpotifyShow = {
        ...mockShow,
        name: "The Show's <Special> & \"Unique\" Name",
      };

      render(<SpotifyShowCard show={specialCharShow} />);

      expect(screen.getByTestId('show-title')).toHaveTextContent(
        "The Show's <Special> & \"Unique\" Name"
      );
    });
  });
});
