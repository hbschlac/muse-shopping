/**
 * Integration tests to verify header consistency across all pages
 * Ensures Muse logo, cart button, and menu are displayed correctly
 */

import { render, screen } from '@testing-library/react';

// Mock Next.js dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: '1' }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock components
jest.mock('@/components/MuseLogo', () => {
  return function MuseLogo() {
    return <div data-testid="muse-logo">Muse Logo</div>;
  };
});

jest.mock('@/components/BottomNav', () => {
  return function BottomNav() {
    return <div data-testid="bottom-nav">Bottom Nav</div>;
  };
});

// Mock API hooks
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, first_name: 'Test' }, isAuthenticated: true }),
}));

jest.mock('@/lib/hooks/useNewsfeed', () => ({
  useNewsfeed: () => ({
    data: { heroCampaigns: [], stories: [], modules: [] },
    allModules: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: jest.fn(),
  }),
}));

jest.mock('@/lib/api/products', () => ({
  getFavorites: jest.fn().mockResolvedValue({ items: [] }),
  removeFromFavorites: jest.fn(),
}));

jest.mock('@/lib/api/client', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ success: true, data: { user: {}, profile: {} } }),
  },
}));

jest.mock('@/lib/api/cart', () => ({
  getCart: jest.fn().mockResolvedValue({ stores: [] }),
  updateCartItem: jest.fn(),
  removeFromCart: jest.fn(),
}));

describe('Header Consistency Across Pages', () => {
  const verifyHeaderElements = (options: {
    hasLogo?: boolean;
    hasCart?: boolean;
    hasMenu?: boolean;
    title?: string;
  } = {}) => {
    const { hasLogo = true, hasCart = true, hasMenu = true, title } = options;

    if (hasLogo) {
      expect(screen.getByTestId('muse-logo')).toBeInTheDocument();
    }

    if (hasCart) {
      expect(screen.getByLabelText('Shopping Cart')).toBeInTheDocument();
    }

    if (hasMenu) {
      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    }

    if (title) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  };

  describe('Home Page (Newsfeed)', () => {
    it('displays header with logo, cart, and menu', async () => {
      const Newsfeed = require('@/components/Newsfeed').default;
      render(<Newsfeed />);

      verifyHeaderElements({
        hasLogo: true,
        hasCart: true,
        hasMenu: true,
      });
    });
  });

  describe('Search Page', () => {
    it('displays header with logo, cart, and menu', () => {
      const SearchPage = require('@/app/search/page').default;
      render(<SearchPage />);

      verifyHeaderElements({
        hasLogo: true,
        hasCart: true,
        hasMenu: true,
      });
    });
  });

  describe('Saves Page', () => {
    it('displays header with logo, cart, menu, and title', async () => {
      const SavesPage = require('@/app/saves/page').default;
      const { container } = render(<SavesPage />);

      // Wait for loading to complete
      await screen.findByTestId('muse-logo');

      verifyHeaderElements({
        hasLogo: true,
        hasCart: true,
        hasMenu: true,
        title: 'Saves',
      });
    });
  });

  describe('Profile Page', () => {
    it('displays header with logo, cart, menu, and title', async () => {
      const ProfilePage = require('@/app/profile/page').default;
      render(<ProfilePage />);

      // Wait for loading to complete
      await screen.findByTestId('muse-logo');

      verifyHeaderElements({
        hasLogo: true,
        hasCart: true,
        hasMenu: true,
        title: 'Profile',
      });
    });
  });

  describe('Cart Page', () => {
    it('displays header with logo, cart, menu, and title', async () => {
      const CartPage = require('@/app/cart/page').default;
      render(<CartPage />);

      // Wait for loading to complete
      await screen.findByTestId('muse-logo');

      verifyHeaderElements({
        hasLogo: true,
        hasCart: true,
        hasMenu: true,
        title: 'Cart',
      });
    });
  });

  describe('Header Styling Consistency', () => {
    it('all headers use ecru background', () => {
      const pages = [
        require('@/components/Newsfeed').default,
        require('@/app/search/page').default,
      ];

      pages.forEach((PageComponent) => {
        const { container, unmount } = render(<PageComponent />);
        const header = container.querySelector('header');
        expect(header).toHaveClass('bg-[var(--color-ecru)]');
        unmount();
      });
    });

    it('all headers are sticky positioned', () => {
      const pages = [
        require('@/components/Newsfeed').default,
        require('@/app/search/page').default,
      ];

      pages.forEach((PageComponent) => {
        const { container, unmount } = render(<PageComponent />);
        const header = container.querySelector('header');
        expect(header).toHaveClass('sticky', 'top-0');
        unmount();
      });
    });
  });

  describe('Navigation Links', () => {
    it('cart button links to /cart on all pages', () => {
      const pages = [
        require('@/components/Newsfeed').default,
        require('@/app/search/page').default,
      ];

      pages.forEach((PageComponent) => {
        const { unmount } = render(<PageComponent />);
        const cartButton = screen.getByLabelText('Shopping Cart');
        expect(cartButton).toHaveAttribute('href', '/cart');
        unmount();
      });
    });

    it('logo links to /home on all pages', () => {
      const pages = [
        require('@/components/Newsfeed').default,
        require('@/app/search/page').default,
      ];

      pages.forEach((PageComponent) => {
        const { unmount } = render(<PageComponent />);
        const logoLink = screen.getByTestId('muse-logo').closest('a');
        expect(logoLink).toHaveAttribute('href', '/home');
        unmount();
      });
    });
  });
});
