import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../app/home/page';

jest.mock('../lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

jest.mock('../lib/hooks/useNewsfeed', () => ({
  useNewsfeed: () => ({
    data: null,
    allModules: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: jest.fn(),
  }),
}));

describe('HomePage', () => {
  it('renders hero fallback campaign', () => {
    render(<HomePage />);
    expect(screen.getByText('Winter Collection 2024')).toBeInTheDocument();
    expect(screen.getByText("Discover the season's must-haves")).toBeInTheDocument();
  });

  it('renders core stories row items', () => {
    render(<HomePage />);
    expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Target').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nordstrom').length).toBeGreaterThan(0);
  });

  it('renders current bottom nav contract', () => {
    render(<HomePage />);
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Discover')).toBeInTheDocument();
    expect(screen.getByLabelText('Muse')).toBeInTheDocument();
    expect(screen.getByLabelText('Inspire')).toBeInTheDocument();
    expect(screen.getByLabelText('Cart')).toBeInTheDocument();
  });

  it('links nav items to current routes', () => {
    render(<HomePage />);

    expect(screen.getByLabelText('Home')).toHaveAttribute('href', '/home');
    expect(screen.getByLabelText('Discover')).toHaveAttribute('href', '/discover');
    expect(screen.getByLabelText('Muse')).toHaveAttribute('href', '/chat');
    expect(screen.getByLabelText('Inspire')).toHaveAttribute('href', '/inspire');
    expect(screen.getByLabelText('Cart')).toHaveAttribute('href', '/cart');
  });

  it('renders current logo asset and size', () => {
    render(<HomePage />);
    const logo = screen.getByAltText('Muse');
    expect(logo).toHaveAttribute('src', '/muse-wordmark-gradient.svg');
    expect(logo).toHaveClass('h-16');
  });

  it('toggles menu dropdown', () => {
    render(<HomePage />);
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(menuButton);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
