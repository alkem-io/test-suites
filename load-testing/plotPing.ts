import { Plot, plot } from 'nodeplotlib';
import { Layout } from 'nodeplotlib/src/lib/interfaces/index.js';

export const plotPing = (interval: number, ping: number[], title?: string) => {
  const xValues = ping.map((_, i) => (i + 1) * interval);

  // Determine a default window size based on best practices
  // If ping has many values, a larger window is appropriate for smoothing.
  // If few values, a smaller window is necessary.
  const defaultWindowSize =
    ping.length >= 20 ? 10 :    // For 20+ points, use 10-period MA
      ping.length >= 10 ? 5 :  // For 10-19 points, use 5-period MA
      ping.length >= 3 ? 3 :  // For 3-9 points, use 3-period MA
          1;                 // For 0-2 points, technically no MA or just the value itself

  const movingAveragePing = calculateSMA(ping, defaultWindowSize);

  const data: Plot[] = [
    {
      x: xValues,
      y: ping,
      type: 'scatter',
      mode: 'lines',
      name: 'Ping Data'
    },
    {
      x: xValues,
      y: movingAveragePing,
      type: 'scatter',
      mode: 'lines',
      name: `Moving Average (Window ${defaultWindowSize})`,
      line: {
        color: 'red',
        width: 2 // Make the average line a bit thicker
      }
    }
  ];

  const layout: Layout = {
    title,
    xaxis: { title: 'Time (seconds)' },
    yaxis: { title: 'Ping (ms)' }
  };

  return plot(data, layout);
}

const calculateSMA = (data: number[], windowSize: number): number[] => {
  if (windowSize <= 0) {
    throw new Error("Window size must be a positive integer.");
  }
  if (windowSize > data.length) {
    // If window size is larger than data, return an array of NaNs or throw an error
    // For plotting, returning NaNs for non-calculable points is common.
    return new Array(data.length).fill(NaN);
  }

  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      sma.push(NaN); // Not enough data points to form a full window yet
    } else {
      const window = data.slice(i - windowSize + 1, i + 1);
      const sum = window.reduce((acc, val) => acc + val, 0);
      sma.push(sum / windowSize);
    }
  }
  return sma;
};
