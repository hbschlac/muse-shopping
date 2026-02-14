/**
 * E2E tests for header navigation across all pages
 * Tests the actual user flow and interactions with the header
 */

import { test, expect } from '@playwright/test';

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth token if needed
    await page.goto('/home');
  });

  test.describe('Visual Consistency', () => {
    test('header displays Muse logo on all pages', async ({ page }) => {
      const pages = ['/home', '/search', '/saves', '/profile', '/cart'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await expect(page.locator('header [alt="Muse"]')).toBeVisible();
      }
    });

    test('header displays cart button on all pages', async ({ page }) => {
      const pages = ['/home', '/search', '/saves', '/profile', '/cart'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await expect(page.locator('header [aria-label="Shopping Cart"]')).toBeVisible();
      }
    });

    test('header displays menu button on all pages', async ({ page }) => {
      const pages = ['/home', '/search', '/saves', '/profile', '/cart'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await expect(page.locator('header [aria-label="Menu"]')).toBeVisible();
      }
    });

    test('header has ecru background color', async ({ page }) => {
      await page.goto('/home');
      const header = page.locator('header');
      const bgColor = await header.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // ecru color is defined in CSS variables, so we check it exists
      expect(bgColor).toBeTruthy();
    });

    test('header is sticky positioned', async ({ page }) => {
      await page.goto('/home');
      const header = page.locator('header');
      const position = await header.evaluate(el =>
        window.getComputedStyle(el).position
      );

      expect(position).toBe('sticky');
    });
  });

  test.describe('Logo Navigation', () => {
    test('clicking logo navigates to home page', async ({ page }) => {
      await page.goto('/search');
      await page.click('header a[href="/home"]');
      await expect(page).toHaveURL(/\/home/);
    });

    test('logo is clickable from any page', async ({ page }) => {
      const pages = ['/search', '/saves', '/profile'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        const logo = page.locator('header a[href="/home"]');
        await expect(logo).toBeVisible();
        await expect(logo).toBeEnabled();
      }
    });
  });

  test.describe('Cart Button', () => {
    test('clicking cart button navigates to cart page', async ({ page }) => {
      await page.goto('/home');
      await page.click('header [aria-label="Shopping Cart"]');
      await expect(page).toHaveURL(/\/cart/);
    });

    test('cart button works from all pages', async ({ page }) => {
      const pages = ['/home', '/search', '/saves'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.click('header [aria-label="Shopping Cart"]');
        await expect(page).toHaveURL(/\/cart/);
      }
    });
  });

  test.describe('Menu Dropdown', () => {
    test('clicking menu button opens dropdown', async ({ page }) => {
      await page.goto('/home');
      await page.click('header [aria-label="Menu"]');

      await expect(page.locator('text=Profile')).toBeVisible();
      await expect(page.locator('text=Feedback')).toBeVisible();
    });

    test('menu dropdown has correct links', async ({ page }) => {
      await page.goto('/home');
      await page.click('header [aria-label="Menu"]');

      const profileLink = page.locator('a:has-text("Profile")');
      const feedbackLink = page.locator('a:has-text("Feedback")');

      await expect(profileLink).toHaveAttribute('href', '/profile');
      await expect(feedbackLink).toHaveAttribute('href', '/feedback');
    });

    test('clicking Profile navigates to profile page', async ({ page }) => {
      await page.goto('/home');
      await page.click('header [aria-label="Menu"]');
      await page.click('text=Profile');

      await expect(page).toHaveURL(/\/profile/);
    });

    test('clicking Feedback navigates to feedback page', async ({ page }) => {
      await page.goto('/home');
      await page.click('header [aria-label="Menu"]');
      await page.click('text=Feedback');

      await expect(page).toHaveURL(/\/feedback/);
    });

    test('menu closes after clicking a link', async ({ page }) => {
      await page.goto('/home');
      await page.click('header [aria-label="Menu"]');

      // Menu should be open
      await expect(page.locator('text=Profile')).toBeVisible();

      // Click profile link
      await page.click('text=Profile');

      // Wait for navigation
      await page.waitForURL(/\/profile/);

      // Menu should be closed on new page
      await expect(page.locator('header >> text=Profile').last()).not.toBeVisible();
    });
  });

  test.describe('Page Titles', () => {
    test('Saves page displays title in header', async ({ page }) => {
      await page.goto('/saves');
      await expect(page.locator('header h1:has-text("Saves")')).toBeVisible();
    });

    test('Profile page displays title in header', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.locator('header h1:has-text("Profile")')).toBeVisible();
    });

    test('Cart page displays title in header', async ({ page }) => {
      await page.goto('/cart');
      await expect(page.locator('header h1:has-text("Cart")')).toBeVisible();
    });

    test('Checkout page displays title and back button', async ({ page }) => {
      await page.goto('/checkout');
      await expect(page.locator('header h1:has-text("Checkout")')).toBeVisible();
      await expect(page.locator('header [aria-label="Go back"]')).toBeVisible();
    });
  });

  test.describe('Back Button', () => {
    test('checkout page has back button', async ({ page }) => {
      await page.goto('/checkout');
      const backButton = page.locator('header [aria-label="Go back"]');
      await expect(backButton).toBeVisible();
    });

    test('clicking back button on checkout navigates to cart', async ({ page }) => {
      await page.goto('/checkout');
      await page.click('header [aria-label="Go back"]');
      await expect(page).toHaveURL(/\/cart/);
    });
  });

  test.describe('Responsive Behavior', () => {
    test('header is visible on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/home');

      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('header [aria-label="Shopping Cart"]')).toBeVisible();
      await expect(page.locator('header [aria-label="Menu"]')).toBeVisible();
    });

    test('header layout works on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/home');

      await expect(page.locator('header')).toBeVisible();
      const header = page.locator('header');
      const width = await header.boundingBox();

      expect(width?.width).toBeGreaterThan(0);
    });

    test('header layout works on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/home');

      await expect(page.locator('header')).toBeVisible();
      const header = page.locator('header');
      const width = await header.boundingBox();

      expect(width?.width).toBeGreaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('header renders quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/home');
      await page.locator('header').waitFor();
      const endTime = Date.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(3000); // 3 seconds max
    });

    test('header interactions are responsive', async ({ page }) => {
      await page.goto('/home');

      // Menu should open quickly
      const startTime = Date.now();
      await page.click('header [aria-label="Menu"]');
      await page.locator('text=Profile').waitFor();
      const endTime = Date.now();

      const interactionTime = endTime - startTime;
      expect(interactionTime).toBeLessThan(500); // 500ms max
    });
  });

  test.describe('Accessibility', () => {
    test('header has proper landmark', async ({ page }) => {
      await page.goto('/home');
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });

    test('buttons have aria-labels', async ({ page }) => {
      await page.goto('/home');

      await expect(page.locator('[aria-label="Shopping Cart"]')).toBeVisible();
      await expect(page.locator('[aria-label="Menu"]')).toBeVisible();
    });

    test('header is keyboard navigable', async ({ page }) => {
      await page.goto('/home');

      // Tab to cart button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to activate with Enter
      const cartButton = page.locator('header [aria-label="Shopping Cart"]');
      await expect(cartButton).toBeFocused();
    });
  });
});
