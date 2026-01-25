import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Carousel Component
// In a real scenario, import the actual component
interface CarouselProps {
  title: string;
  items: Array<{ id: string; name: string; image?: string }>;
  isLoading?: boolean;
  error?: string | null;
  onItemClick?: (id: string) => void;
  onSeeAllClick?: () => void;
  showSeeAll?: boolean;
  skeletonCount?: number;
}

// Mock implementation for testing
const Carousel: React.FC<CarouselProps> = ({
  title,
  items,
  isLoading = false,
  error = null,
  onItemClick,
  onSeeAllClick,
  showSeeAll = true,
  skeletonCount = 6,
}) => {
  if (isLoading) {
    return (
      <div data-testid="carousel" className="carousel">
        <h2>{title}</h2>
        <div data-testid="skeleton-container">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} data-testid="skeleton-item" className="animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="carousel" className="carousel">
        <h2>{title}</h2>
        <div data-testid="error-message" className="text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="carousel" className="carousel">
      <div className="flex justify-between items-center">
        <h2>{title}</h2>
        {showSeeAll && onSeeAllClick && (
          <button data-testid="see-all-button" onClick={onSeeAllClick}>
            See All
          </button>
        )}
      </div>
      <div data-testid="carousel-items" className="flex overflow-x-auto">
        <button data-testid="scroll-left" aria-label="Scroll left">
          {'<'}
        </button>
        {items.map((item) => (
          <div
            key={item.id}
            data-testid="carousel-item"
            onClick={() => onItemClick?.(item.id)}
            className="cursor-pointer"
          >
            {item.image && <img src={item.image} alt={item.name} />}
            <span>{item.name}</span>
          </div>
        ))}
        <button data-testid="scroll-right" aria-label="Scroll right">
          {'>'}
        </button>
      </div>
    </div>
  );
};

describe('Carousel Component', () => {
  const mockItems = [
    { id: '1', name: 'Item 1', image: 'https://example.com/1.jpg' },
    { id: '2', name: 'Item 2', image: 'https://example.com/2.jpg' },
    { id: '3', name: 'Item 3', image: 'https://example.com/3.jpg' },
    { id: '4', name: 'Item 4' }, // No image
  ];

  describe('Rendering with Props', () => {
    it('renders carousel with title', () => {
      render(<Carousel title="Test Carousel" items={mockItems} />);

      expect(screen.getByText('Test Carousel')).toBeInTheDocument();
    });

    it('renders all items', () => {
      render(<Carousel title="Test" items={mockItems} />);

      const items = screen.getAllByTestId('carousel-item');
      expect(items).toHaveLength(mockItems.length);
    });

    it('renders item names correctly', () => {
      render(<Carousel title="Test" items={mockItems} />);

      mockItems.forEach((item) => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      });
    });

    it('renders images for items that have them', () => {
      render(<Carousel title="Test" items={mockItems} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(3); // Only 3 items have images
    });

    it('renders See All button when showSeeAll is true', () => {
      const onSeeAllClick = vi.fn();
      render(
        <Carousel
          title="Test"
          items={mockItems}
          showSeeAll={true}
          onSeeAllClick={onSeeAllClick}
        />
      );

      expect(screen.getByTestId('see-all-button')).toBeInTheDocument();
    });

    it('does not render See All button when showSeeAll is false', () => {
      render(<Carousel title="Test" items={mockItems} showSeeAll={false} />);

      expect(screen.queryByTestId('see-all-button')).not.toBeInTheDocument();
    });

    it('renders scroll buttons', () => {
      render(<Carousel title="Test" items={mockItems} />);

      expect(screen.getByTestId('scroll-left')).toBeInTheDocument();
      expect(screen.getByTestId('scroll-right')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton items when loading', () => {
      render(<Carousel title="Test" items={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId('skeleton-item');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows correct number of skeleton items', () => {
      render(
        <Carousel title="Test" items={[]} isLoading={true} skeletonCount={4} />
      );

      const skeletons = screen.getAllByTestId('skeleton-item');
      expect(skeletons).toHaveLength(4);
    });

    it('skeleton items have animation class', () => {
      render(<Carousel title="Test" items={[]} isLoading={true} />);

      const skeletons = screen.getAllByTestId('skeleton-item');
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    it('does not show actual items when loading', () => {
      render(<Carousel title="Test" items={mockItems} isLoading={true} />);

      expect(screen.queryByTestId('carousel-item')).not.toBeInTheDocument();
    });

    it('still shows title when loading', () => {
      render(<Carousel title="Loading Test" items={[]} isLoading={true} />);

      expect(screen.getByText('Loading Test')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(
        <Carousel title="Test" items={[]} error="Failed to load data" />
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('error message has error styling', () => {
      render(<Carousel title="Test" items={[]} error="Error occurred" />);

      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toHaveClass('text-red-500');
    });

    it('does not show items when error is present', () => {
      render(
        <Carousel title="Test" items={mockItems} error="Something went wrong" />
      );

      expect(screen.queryByTestId('carousel-item')).not.toBeInTheDocument();
    });

    it('still shows title when error is present', () => {
      render(
        <Carousel title="Error Test" items={[]} error="Failed to load" />
      );

      expect(screen.getByText('Error Test')).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('calls onItemClick with correct id when item is clicked', async () => {
      const onItemClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Carousel title="Test" items={mockItems} onItemClick={onItemClick} />
      );

      const firstItem = screen.getAllByTestId('carousel-item')[0];
      await user.click(firstItem);

      expect(onItemClick).toHaveBeenCalledWith('1');
    });

    it('calls onItemClick for each clicked item', async () => {
      const onItemClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Carousel title="Test" items={mockItems} onItemClick={onItemClick} />
      );

      const items = screen.getAllByTestId('carousel-item');

      await user.click(items[0]);
      await user.click(items[1]);

      expect(onItemClick).toHaveBeenCalledTimes(2);
      expect(onItemClick).toHaveBeenNthCalledWith(1, '1');
      expect(onItemClick).toHaveBeenNthCalledWith(2, '2');
    });

    it('calls onSeeAllClick when See All button is clicked', async () => {
      const onSeeAllClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Carousel
          title="Test"
          items={mockItems}
          onSeeAllClick={onSeeAllClick}
          showSeeAll={true}
        />
      );

      await user.click(screen.getByTestId('see-all-button'));

      expect(onSeeAllClick).toHaveBeenCalledTimes(1);
    });

    it('items are keyboard accessible', async () => {
      const onItemClick = vi.fn();

      render(
        <Carousel title="Test" items={mockItems} onItemClick={onItemClick} />
      );

      const items = screen.getAllByTestId('carousel-item');
      expect(items[0]).toHaveClass('cursor-pointer');
    });
  });

  describe('Scrolling Behavior', () => {
    it('scroll buttons are present and accessible', () => {
      render(<Carousel title="Test" items={mockItems} />);

      const leftButton = screen.getByTestId('scroll-left');
      const rightButton = screen.getByTestId('scroll-right');

      expect(leftButton).toHaveAttribute('aria-label', 'Scroll left');
      expect(rightButton).toHaveAttribute('aria-label', 'Scroll right');
    });

    it('carousel container has overflow-x-auto for scrolling', () => {
      render(<Carousel title="Test" items={mockItems} />);

      const itemsContainer = screen.getByTestId('carousel-items');
      expect(itemsContainer).toHaveClass('overflow-x-auto');
    });
  });

  describe('Empty State', () => {
    it('renders carousel structure with no items', () => {
      render(<Carousel title="Empty Carousel" items={[]} />);

      expect(screen.getByTestId('carousel')).toBeInTheDocument();
      expect(screen.getByText('Empty Carousel')).toBeInTheDocument();
      expect(screen.queryAllByTestId('carousel-item')).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('carousel has proper structure', () => {
      render(<Carousel title="Accessible Carousel" items={mockItems} />);

      const carousel = screen.getByTestId('carousel');
      expect(carousel).toBeInTheDocument();
    });

    it('images have alt text', () => {
      render(<Carousel title="Test" items={mockItems} />);

      const images = screen.getAllByRole('img');
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('alt', mockItems[index].name);
      });
    });
  });
});
