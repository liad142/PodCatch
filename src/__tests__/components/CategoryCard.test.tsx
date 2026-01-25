import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock CategoryCard Component
// In a real scenario, import the actual component
interface Category {
  id: string;
  name: string;
  icons: Array<{ url: string; height?: number; width?: number }>;
}

interface CategoryCardProps {
  category: Category;
  isLoading?: boolean;
  error?: string | null;
  onClick?: (categoryId: string) => void;
  variant?: 'default' | 'small' | 'large';
}

// Mock implementation for testing
const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isLoading = false,
  error = null,
  onClick,
  variant = 'default',
}) => {
  if (isLoading) {
    return (
      <div data-testid="category-card" className="category-card loading">
        <div data-testid="skeleton-image" className="animate-pulse bg-gray-200 aspect-square rounded-lg" />
        <div data-testid="skeleton-title" className="animate-pulse bg-gray-200 h-4 mt-2 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="category-card" className="category-card error">
        <div data-testid="error-message" className="text-red-500 text-center p-4">
          {error}
        </div>
      </div>
    );
  }

  const handleClick = () => {
    onClick?.(category.id);
  };

  const iconUrl = category.icons?.[0]?.url || '';

  const sizeClasses = {
    default: 'w-32 h-32',
    small: 'w-24 h-24',
    large: 'w-48 h-48',
  };

  return (
    <div
      data-testid="category-card"
      className={`category-card cursor-pointer hover:scale-105 transition-transform ${variant} ${sizeClasses[variant]}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={category.name}
            data-testid="category-image"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            data-testid="placeholder-image"
            className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          >
            <span className="text-white text-2xl font-bold">
              {category.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-3">
          <h3
            data-testid="category-name"
            className="text-white font-semibold text-sm line-clamp-2"
          >
            {category.name}
          </h3>
        </div>
      </div>
    </div>
  );
};

describe('CategoryCard Component', () => {
  const mockCategory: Category = {
    id: 'comedy',
    name: 'Comedy',
    icons: [
      { url: 'https://example.com/comedy.jpg', height: 274, width: 274 },
    ],
  };

  const mockCategoryNoIcon: Category = {
    id: 'news',
    name: 'News & Politics',
    icons: [],
  };

  const mockLongNameCategory: Category = {
    id: 'arts',
    name: 'Arts & Entertainment: Books, Music, and More',
    icons: [{ url: 'https://example.com/arts.jpg' }],
  };

  describe('Rendering with Props', () => {
    it('renders category card with name', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toBeInTheDocument();
      expect(screen.getByTestId('category-name')).toHaveTextContent('Comedy');
    });

    it('renders category image correctly', () => {
      render(<CategoryCard category={mockCategory} />);

      const image = screen.getByTestId('category-image');
      expect(image).toHaveAttribute('src', 'https://example.com/comedy.jpg');
      expect(image).toHaveAttribute('alt', 'Comedy');
    });

    it('renders placeholder when no icon is available', () => {
      render(<CategoryCard category={mockCategoryNoIcon} />);

      expect(screen.getByTestId('placeholder-image')).toBeInTheDocument();
      expect(screen.queryByTestId('category-image')).not.toBeInTheDocument();
    });

    it('placeholder shows first letter of category name', () => {
      render(<CategoryCard category={mockCategoryNoIcon} />);

      const placeholder = screen.getByTestId('placeholder-image');
      expect(placeholder).toHaveTextContent('N');
    });

    it('truncates long category names', () => {
      render(<CategoryCard category={mockLongNameCategory} />);

      const name = screen.getByTestId('category-name');
      expect(name).toHaveClass('line-clamp-2');
    });
  });

  describe('Loading State', () => {
    it('shows skeleton elements when loading', () => {
      render(<CategoryCard category={mockCategory} isLoading={true} />);

      expect(screen.getByTestId('skeleton-image')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-title')).toBeInTheDocument();
    });

    it('skeleton elements have animation class', () => {
      render(<CategoryCard category={mockCategory} isLoading={true} />);

      expect(screen.getByTestId('skeleton-image')).toHaveClass('animate-pulse');
      expect(screen.getByTestId('skeleton-title')).toHaveClass('animate-pulse');
    });

    it('does not show actual content when loading', () => {
      render(<CategoryCard category={mockCategory} isLoading={true} />);

      expect(screen.queryByTestId('category-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('category-image')).not.toBeInTheDocument();
    });

    it('card has loading class when loading', () => {
      render(<CategoryCard category={mockCategory} isLoading={true} />);

      expect(screen.getByTestId('category-card')).toHaveClass('loading');
    });

    it('skeleton image has rounded corners', () => {
      render(<CategoryCard category={mockCategory} isLoading={true} />);

      expect(screen.getByTestId('skeleton-image')).toHaveClass('rounded-lg');
    });
  });

  describe('Error State', () => {
    it('shows error message when error prop is provided', () => {
      render(<CategoryCard category={mockCategory} error="Failed to load category" />);

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Failed to load category')).toBeInTheDocument();
    });

    it('error message has error styling', () => {
      render(<CategoryCard category={mockCategory} error="Error occurred" />);

      const errorElement = screen.getByTestId('error-message');
      expect(errorElement).toHaveClass('text-red-500');
    });

    it('does not show category content when error is present', () => {
      render(<CategoryCard category={mockCategory} error="Something went wrong" />);

      expect(screen.queryByTestId('category-name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('category-image')).not.toBeInTheDocument();
    });

    it('card has error class when error is present', () => {
      render(<CategoryCard category={mockCategory} error="Error" />);

      expect(screen.getByTestId('category-card')).toHaveClass('error');
    });
  });

  describe('Click Handlers', () => {
    it('calls onClick with category id when card is clicked', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(<CategoryCard category={mockCategory} onClick={onClick} />);

      await user.click(screen.getByTestId('category-card'));

      expect(onClick).toHaveBeenCalledWith('comedy');
    });

    it('calls onClick on keyboard Enter press', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(<CategoryCard category={mockCategory} onClick={onClick} />);

      const card = screen.getByTestId('category-card');
      card.focus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledWith('comedy');
    });

    it('calls onClick on keyboard Space press', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();

      render(<CategoryCard category={mockCategory} onClick={onClick} />);

      const card = screen.getByTestId('category-card');
      card.focus();
      await user.keyboard(' ');

      expect(onClick).toHaveBeenCalledWith('comedy');
    });

    it('card is clickable with cursor pointer', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toHaveClass('cursor-pointer');
    });

    it('card has hover animation', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toHaveClass('hover:scale-105');
    });
  });

  describe('Variants', () => {
    it('renders default variant by default', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toHaveClass('default');
      expect(screen.getByTestId('category-card')).toHaveClass('w-32');
      expect(screen.getByTestId('category-card')).toHaveClass('h-32');
    });

    it('renders small variant when specified', () => {
      render(<CategoryCard category={mockCategory} variant="small" />);

      expect(screen.getByTestId('category-card')).toHaveClass('small');
      expect(screen.getByTestId('category-card')).toHaveClass('w-24');
      expect(screen.getByTestId('category-card')).toHaveClass('h-24');
    });

    it('renders large variant when specified', () => {
      render(<CategoryCard category={mockCategory} variant="large" />);

      expect(screen.getByTestId('category-card')).toHaveClass('large');
      expect(screen.getByTestId('category-card')).toHaveClass('w-48');
      expect(screen.getByTestId('category-card')).toHaveClass('h-48');
    });
  });

  describe('Accessibility', () => {
    it('image has alt text matching category name', () => {
      render(<CategoryCard category={mockCategory} />);

      const image = screen.getByTestId('category-image');
      expect(image).toHaveAttribute('alt', mockCategory.name);
    });

    it('card has button role', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toHaveAttribute('role', 'button');
    });

    it('card is focusable via tabIndex', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toHaveAttribute('tabIndex', '0');
    });

    it('card has transition for smooth animations', () => {
      render(<CategoryCard category={mockCategory} />);

      expect(screen.getByTestId('category-card')).toHaveClass('transition-transform');
    });
  });

  describe('Visual Elements', () => {
    it('has overlay for text readability', () => {
      render(<CategoryCard category={mockCategory} />);

      const card = screen.getByTestId('category-card');
      // The overlay div should be present in the DOM
      expect(card.querySelector('.bg-black')).toBeInTheDocument();
    });

    it('image covers the entire container', () => {
      render(<CategoryCard category={mockCategory} />);

      const image = screen.getByTestId('category-image');
      expect(image).toHaveClass('object-cover');
    });

    it('category name text is white for contrast', () => {
      render(<CategoryCard category={mockCategory} />);

      const name = screen.getByTestId('category-name');
      expect(name).toHaveClass('text-white');
    });
  });

  describe('Edge Cases', () => {
    it('handles category with empty name', () => {
      const emptyNameCategory: Category = {
        id: 'empty',
        name: '',
        icons: [{ url: 'https://example.com/empty.jpg' }],
      };

      render(<CategoryCard category={emptyNameCategory} />);

      expect(screen.getByTestId('category-card')).toBeInTheDocument();
    });

    it('handles category with special characters in name', () => {
      const specialCategory: Category = {
        id: 'special',
        name: "Kids & Family's <Favorites>",
        icons: [],
      };

      render(<CategoryCard category={specialCategory} />);

      expect(screen.getByTestId('category-name')).toHaveTextContent(
        "Kids & Family's <Favorites>"
      );
    });

    it('handles multiple icons by using the first one', () => {
      const multiIconCategory: Category = {
        id: 'multi',
        name: 'Multi Icon',
        icons: [
          { url: 'https://example.com/first.jpg' },
          { url: 'https://example.com/second.jpg' },
        ],
      };

      render(<CategoryCard category={multiIconCategory} />);

      const image = screen.getByTestId('category-image');
      expect(image).toHaveAttribute('src', 'https://example.com/first.jpg');
    });
  });
});
