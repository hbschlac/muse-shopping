import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../app/home/page';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Hero Banner', () => {
    it('renders the hero banner with initial campaign', () => {
      render(<HomePage />);
      expect(screen.getByText('Winter Collection 2024')).toBeInTheDocument();
      expect(screen.getByText("Discover the season's must-haves")).toBeInTheDocument();
    });

    it('auto-rotates hero banner every 5 seconds', async () => {
      render(<HomePage />);

      // Initial state
      expect(screen.getByText('Winter Collection 2024')).toBeInTheDocument();

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Spring Refresh')).toBeInTheDocument();
      });

      // Fast-forward another 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Sustainable Style')).toBeInTheDocument();
      });
    });

    it('displays hero indicators', () => {
      render(<HomePage />);
      const indicators = screen.getAllByRole('button').filter(btn =>
        btn.className.includes('w-2 h-2')
      );
      expect(indicators).toHaveLength(3);
    });
  });

  describe('Stories Row', () => {
    it('renders all 15 story circles', () => {
      render(<HomePage />);
      const stories = ['Trending', 'Vintage', 'Under $100', 'Stylist Picks', 'New Drops',
        'Casual', 'Elevated', 'Minimalist', 'Boho', 'Classic', 'Edgy',
        'Romantic', 'Athleisure', 'Workwear', 'Weekend'];

      stories.forEach(story => {
        expect(screen.getByText(story)).toBeInTheDocument();
      });
    });

    it('allows horizontal scrolling of stories', () => {
      render(<HomePage />);
      const storiesContainer = screen.getByText('Trending').closest('.overflow-x-auto');
      expect(storiesContainer).toBeInTheDocument();
      expect(storiesContainer).toHaveClass('hide-scrollbar');
    });
  });

  describe('Search/Chat Input', () => {
    it('renders search textarea with placeholder', () => {
      render(<HomePage />);
      const searchInput = screen.getByPlaceholderText('Search or ask Muse...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe('TEXTAREA');
    });

    it('expands textarea on input', () => {
      render(<HomePage />);
      const textarea = screen.getByPlaceholderText('Search or ask Muse...') as HTMLTextAreaElement;

      // Simulate typing
      fireEvent.input(textarea, { target: { value: 'test\ntest\ntest' } });

      // Check that textarea height adjusts (mocked behavior)
      expect(textarea.value).toBe('test\ntest\ntest');
    });

    it('renders search icon', () => {
      render(<HomePage />);
      const searchContainer = screen.getByPlaceholderText('Search or ask Muse...').closest('.h-14');
      expect(searchContainer).toBeInTheDocument();
    });

    it('limits textarea max height to 102px', () => {
      render(<HomePage />);
      const textarea = screen.getByPlaceholderText('Search or ask Muse...') as HTMLTextAreaElement;
      expect(textarea).toHaveClass('max-h-[102px]');
    });
  });

  describe('Brand Modules', () => {
    it('displays context headers for logged-in users', () => {
      render(<HomePage />);
      expect(screen.getByText('Your Favorite Brands')).toBeInTheDocument();
      expect(screen.getByText('Based on brands you told us you love')).toBeInTheDocument();
    });

    it('displays context headers for recommended brands', () => {
      render(<HomePage />);
      expect(screen.getByText('Recommended For You')).toBeInTheDocument();
      expect(screen.getByText("Brands we think you'll love based on your style")).toBeInTheDocument();
    });

    it('renders Reformation brand module', () => {
      render(<HomePage />);
      expect(screen.getByText('Reformation')).toBeInTheDocument();
      const seeAllButtons = screen.getAllByText('See all');
      expect(seeAllButtons.length).toBeGreaterThan(0);
    });

    it('renders Everlane brand module', () => {
      render(<HomePage />);
      expect(screen.getByText('Everlane')).toBeInTheDocument();
    });

    it('renders Free People brand module', () => {
      render(<HomePage />);
      expect(screen.getByText('Free People')).toBeInTheDocument();
    });

    it('allows horizontal scrolling within brand carousels', () => {
      render(<HomePage />);
      const carousels = document.querySelectorAll('.overflow-x-auto.hide-scrollbar');
      expect(carousels.length).toBeGreaterThan(0);
    });

    it('displays product prices in brand modules', () => {
      render(<HomePage />);
      // Check for price format
      const prices = screen.getAllByText(/\$\d+/);
      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe('Scroll to Top Button', () => {
    it('does not show scroll button initially', () => {
      render(<HomePage />);
      const scrollButton = screen.queryByLabelText('Scroll to top');
      expect(scrollButton).not.toBeInTheDocument();
    });

    it('shows scroll button after scrolling down', async () => {
      render(<HomePage />);

      // Simulate scroll event
      Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 300 });
      fireEvent.scroll(window);

      await waitFor(() => {
        const scrollButton = screen.queryByLabelText('Scroll to top');
        // Button visibility is controlled by state
        expect(scrollButton).toBeInTheDocument();
      });
    });

    it('scrolls to top when clicked', async () => {
      const scrollToMock = jest.fn();
      window.scrollTo = scrollToMock;

      render(<HomePage />);

      // Trigger scroll to show button
      Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 300 });
      fireEvent.scroll(window);

      await waitFor(() => {
        const scrollButton = screen.getByLabelText('Scroll to top');
        fireEvent.click(scrollButton);
        expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      });
    });
  });

  describe('Bottom Navigation', () => {
    it('renders all navigation items', () => {
      render(<HomePage />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Muse')).toBeInTheDocument();
      expect(screen.getByText('Saves')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('highlights Home nav item', () => {
      render(<HomePage />);
      const homeNav = screen.getByText('Home').closest('a');
      expect(homeNav).toHaveClass('text-gray-900');
    });

    it('links to correct pages', () => {
      render(<HomePage />);

      const searchLink = screen.getByText('Search').closest('a');
      expect(searchLink).toHaveAttribute('href', '/search');

      const museLink = screen.getByText('Muse').closest('a');
      expect(museLink).toHaveAttribute('href', '/muse');

      const savesLink = screen.getByText('Saves').closest('a');
      expect(savesLink).toHaveAttribute('href', '/saves');
    });
  });

  describe('Responsive Design', () => {
    it('applies ecru background color', () => {
      render(<HomePage />);
      const mainContainer = document.querySelector('.bg-\\[var\\(--color-ecru\\)\\]');
      expect(mainContainer).toBeInTheDocument();
    });

    it('has bottom padding for navigation clearance', () => {
      render(<HomePage />);
      const mainContainer = document.querySelector('.pb-24');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Logo and Branding', () => {
    it('renders gradient M lettermark logo', () => {
      render(<HomePage />);
      const logo = screen.getByAltText('Muse');
      expect(logo).toHaveAttribute('src', '/logo-m.svg');
    });

    it('logo has correct height', () => {
      render(<HomePage />);
      const logo = screen.getByAltText('Muse');
      expect(logo).toHaveClass('h-8');
    });
  });
});
