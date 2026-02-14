import { render, screen, fireEvent } from '@testing-library/react';
import PageHeader from '@/components/PageHeader';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock MuseLogo component
jest.mock('@/components/MuseLogo', () => {
  return function MuseLogo({ className }: any) {
    return <div data-testid="muse-logo" className={className}>Muse Logo</div>;
  };
});

describe('PageHeader Component', () => {
  describe('Basic Rendering', () => {
    it('renders the Muse logo', () => {
      render(<PageHeader />);
      expect(screen.getByTestId('muse-logo')).toBeInTheDocument();
    });

    it('renders cart button', () => {
      render(<PageHeader />);
      const cartButton = screen.getByLabelText('Shopping Cart');
      expect(cartButton).toBeInTheDocument();
      expect(cartButton).toHaveAttribute('href', '/cart');
    });

    it('renders menu button', () => {
      render(<PageHeader />);
      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    });

    it('applies correct background color', () => {
      const { container } = render(<PageHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('bg-[var(--color-ecru)]');
    });

    it('has sticky positioning', () => {
      const { container } = render(<PageHeader />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('sticky', 'top-0', 'z-30');
    });
  });

  describe('Title Display', () => {
    it('renders title when provided', () => {
      render(<PageHeader title="Test Page" />);
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('does not render title element when not provided', () => {
      const { container } = render(<PageHeader />);
      const h1 = container.querySelector('h1');
      expect(h1).not.toBeInTheDocument();
    });

    it('applies correct styling to title', () => {
      render(<PageHeader title="Saves" />);
      const title = screen.getByText('Saves');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'text-gray-900', 'truncate');
    });
  });

  describe('Back Button', () => {
    it('renders back button when showBack is true', () => {
      render(<PageHeader showBack />);
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('does not render back button by default', () => {
      render(<PageHeader />);
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });

    it('uses custom backHref when provided', () => {
      render(<PageHeader showBack backHref="/custom" />);
      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toHaveAttribute('href', '/custom');
    });

    it('uses default backHref of /home', () => {
      render(<PageHeader showBack />);
      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toHaveAttribute('href', '/home');
    });

    it('calls onBack callback when provided', () => {
      const onBackMock = jest.fn();
      render(<PageHeader showBack onBack={onBackMock} />);

      const backButton = screen.getByLabelText('Go back');
      fireEvent.click(backButton);

      expect(onBackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Menu Dropdown', () => {
    it('does not show menu by default', () => {
      render(<PageHeader />);
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Feedback')).not.toBeInTheDocument();
    });

    it('shows menu when menu button is clicked', () => {
      render(<PageHeader />);

      const menuButton = screen.getByLabelText('Menu');
      fireEvent.click(menuButton);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
    });

    it('hides menu when clicking menu item', () => {
      render(<PageHeader />);

      // Open menu
      const menuButton = screen.getByLabelText('Menu');
      fireEvent.click(menuButton);

      // Click Profile link
      const profileLink = screen.getByText('Profile');
      fireEvent.click(profileLink);

      // Menu should be closed
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('menu links have correct hrefs', () => {
      render(<PageHeader />);

      const menuButton = screen.getByLabelText('Menu');
      fireEvent.click(menuButton);

      const profileLink = screen.getByText('Profile').closest('a');
      const feedbackLink = screen.getByText('Feedback').closest('a');

      expect(profileLink).toHaveAttribute('href', '/profile');
      expect(feedbackLink).toHaveAttribute('href', '/feedback');
    });
  });

  describe('Custom Right Content', () => {
    it('renders custom right content when provided', () => {
      const CustomContent = () => <button>Custom Button</button>;
      render(<PageHeader rightContent={<CustomContent />} />);

      expect(screen.getByText('Custom Button')).toBeInTheDocument();
      expect(screen.queryByLabelText('Shopping Cart')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Menu')).not.toBeInTheDocument();
    });

    it('does not render default buttons when custom content provided', () => {
      render(<PageHeader rightContent={<div>Custom</div>} />);

      expect(screen.queryByLabelText('Shopping Cart')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Menu')).not.toBeInTheDocument();
    });
  });

  describe('Settings Button', () => {
    it('does not render settings button by default', () => {
      render(<PageHeader />);
      expect(screen.queryByLabelText('Settings')).not.toBeInTheDocument();
    });

    it('renders settings button when showSettings is true', () => {
      render(<PageHeader showSettings />);
      const settingsButton = screen.getByLabelText('Settings');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute('href', '/settings');
    });
  });

  describe('Logo Link', () => {
    it('logo links to home page', () => {
      render(<PageHeader />);
      const logoLink = screen.getByTestId('muse-logo').closest('a');
      expect(logoLink).toHaveAttribute('href', '/home');
    });

    it('logo has hover effect', () => {
      render(<PageHeader />);
      const logoLink = screen.getByTestId('muse-logo').closest('a');
      expect(logoLink).toHaveClass('hover:opacity-80', 'transition-opacity');
    });
  });

  describe('Responsive Layout', () => {
    it('uses max-width container', () => {
      const { container } = render(<PageHeader />);
      const innerDiv = container.querySelector('.max-w-7xl');
      expect(innerDiv).toBeInTheDocument();
    });

    it('has proper spacing', () => {
      const { container } = render(<PageHeader />);
      const innerDiv = container.querySelector('.max-w-7xl');
      expect(innerDiv).toHaveClass('px-4', 'pt-12', 'pb-4');
    });

    it('uses flexbox for layout', () => {
      const { container } = render(<PageHeader />);
      const innerDiv = container.querySelector('.max-w-7xl');
      expect(innerDiv).toHaveClass('flex', 'items-center', 'justify-between');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-labels for icon buttons', () => {
      render(<PageHeader />);

      expect(screen.getByLabelText('Shopping Cart')).toBeInTheDocument();
      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    });

    it('back button has aria-label', () => {
      render(<PageHeader showBack />);
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('settings button has aria-label when shown', () => {
      render(<PageHeader showSettings />);
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('header uses semantic HTML', () => {
      const { container } = render(<PageHeader />);
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Hover States', () => {
    it('applies hover styles to buttons', () => {
      render(<PageHeader />);

      const cartButton = screen.getByLabelText('Shopping Cart');
      const menuButton = screen.getByLabelText('Menu');

      expect(cartButton).toHaveClass('hover:bg-white/50');
      expect(menuButton).toHaveClass('hover:bg-white/50');
    });

    it('applies hover styles to back button', () => {
      render(<PageHeader showBack />);
      const backButton = screen.getByLabelText('Go back');
      expect(backButton).toHaveClass('hover:bg-white/50');
    });
  });
});
