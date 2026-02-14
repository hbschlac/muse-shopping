/**
 * Header Performance Monitoring
 * Tracks rendering performance and user interactions with the header component
 */

interface HeaderMetric {
  name: string;
  value: number;
  timestamp: number;
  page?: string;
  metadata?: Record<string, any>;
}

class HeaderPerformanceMonitor {
  private metrics: HeaderMetric[] = [];
  private readonly maxMetrics = 100;

  /**
   * Track header render time
   */
  trackRender(page: string, renderTime: number) {
    this.addMetric({
      name: 'header.render',
      value: renderTime,
      timestamp: Date.now(),
      page,
    });

    // Log slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`[Header Performance] Slow render on ${page}: ${renderTime}ms`);
    }

    // Send to analytics
    this.sendToAnalytics('header_render', {
      page,
      renderTime,
      isSlow: renderTime > 16,
    });
  }

  /**
   * Track menu interaction
   */
  trackMenuOpen(page: string) {
    this.addMetric({
      name: 'header.menu.open',
      value: 1,
      timestamp: Date.now(),
      page,
    });

    this.sendToAnalytics('header_menu_open', { page });
  }

  /**
   * Track menu item click
   */
  trackMenuClick(page: string, item: string) {
    this.addMetric({
      name: 'header.menu.click',
      value: 1,
      timestamp: Date.now(),
      page,
      metadata: { item },
    });

    this.sendToAnalytics('header_menu_click', { page, item });
  }

  /**
   * Track cart button click
   */
  trackCartClick(page: string) {
    this.addMetric({
      name: 'header.cart.click',
      value: 1,
      timestamp: Date.now(),
      page,
    });

    this.sendToAnalytics('header_cart_click', { page });
  }

  /**
   * Track logo click
   */
  trackLogoClick(page: string) {
    this.addMetric({
      name: 'header.logo.click',
      value: 1,
      timestamp: Date.now(),
      page,
    });

    this.sendToAnalytics('header_logo_click', { page });
  }

  /**
   * Track back button click
   */
  trackBackClick(page: string) {
    this.addMetric({
      name: 'header.back.click',
      value: 1,
      timestamp: Date.now(),
      page,
    });

    this.sendToAnalytics('header_back_click', { page });
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const renderMetrics = this.metrics.filter(m => m.name === 'header.render');
    const avgRenderTime =
      renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length || 0;
    const slowRenders = renderMetrics.filter(m => m.value > 16).length;

    return {
      totalMetrics: this.metrics.length,
      renderMetrics: {
        count: renderMetrics.length,
        average: avgRenderTime,
        slowRenders,
        slowRenderPercentage: (slowRenders / renderMetrics.length) * 100 || 0,
      },
      interactions: {
        menuOpens: this.metrics.filter(m => m.name === 'header.menu.open').length,
        menuClicks: this.metrics.filter(m => m.name === 'header.menu.click').length,
        cartClicks: this.metrics.filter(m => m.name === 'header.cart.click').length,
        logoClicks: this.metrics.filter(m => m.name === 'header.logo.click').length,
        backClicks: this.metrics.filter(m => m.name === 'header.back.click').length,
      },
    };
  }

  /**
   * Get metrics for specific page
   */
  getPageMetrics(page: string) {
    return this.metrics.filter(m => m.page === page);
  }

  /**
   * Clear old metrics
   */
  private addMetric(metric: HeaderMetric) {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(eventName: string, properties: Record<string, any>) {
    // Send to backend analytics service
    if (typeof window !== 'undefined') {
      const authToken = localStorage.getItem('auth_token');

      fetch('/api/v1/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          eventType: 'ui_interaction',
          eventName,
          eventData: {
            component: 'header',
            ...properties,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          },
        }),
      }).catch(err => {
        console.error('[Header Analytics] Failed to send event:', err);
      });
    }

    // Integration with Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Header Analytics] ${eventName}:`, properties);
    }
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics() {
    return {
      metrics: this.metrics,
      summary: this.getSummary(),
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
export const headerMonitor = new HeaderPerformanceMonitor();

/**
 * React hook for header performance monitoring
 */
export function useHeaderPerformance(page: string) {
  const trackRender = (renderTime: number) => headerMonitor.trackRender(page, renderTime);
  const trackMenuOpen = () => headerMonitor.trackMenuOpen(page);
  const trackMenuClick = (item: string) => headerMonitor.trackMenuClick(page, item);
  const trackCartClick = () => headerMonitor.trackCartClick(page);
  const trackLogoClick = () => headerMonitor.trackLogoClick(page);
  const trackBackClick = () => headerMonitor.trackBackClick(page);

  return {
    trackRender,
    trackMenuOpen,
    trackMenuClick,
    trackCartClick,
    trackLogoClick,
    trackBackClick,
  };
}
