import React, { useEffect, useRef } from 'react';

const PRICE_CHART_ID = 'price-chart-widget-container';

export const PriceChartWidget = ({ tokenAddress, timeframe = '1D' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !tokenAddress) return;

    const loadWidget = () => {
      if (typeof window.createMyWidget === 'function') {
        // Clear previous widget if exists
        const container = document.getElementById(PRICE_CHART_ID);
        if (container) {
          container.innerHTML = '';
        }

        window.createMyWidget(PRICE_CHART_ID, {
          autoSize: true,
          chainId: 'solana',
          tokenAddress: tokenAddress,
          showHoldersChart: true,
          defaultInterval: timeframe,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Etc/UTC',
          theme: 'moralis',
          locale: 'en',
          showCurrencyToggle: true,
          hideLeftToolbar: false,
          hideTopToolbar: false,
          hideBottomToolbar: false
        });
      } else {
        console.error('createMyWidget function is not defined.');
      }
    };

    if (!document.getElementById('moralis-chart-widget')) {
      const script = document.createElement('script');
      script.id = 'moralis-chart-widget';
      script.src = 'https://moralis.com/static/embed/chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = loadWidget;
      script.onerror = () => {
        console.error('Failed to load the chart widget script.');
      };
      document.body.appendChild(script);
    } else {
      loadWidget();
    }

    // Cleanup function
    return () => {
      const container = document.getElementById(PRICE_CHART_ID);
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [tokenAddress, timeframe]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        id={PRICE_CHART_ID}
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

