/**
 * P13: Price Spike Detection — Monotonic Stack Algorithm
 * Time: O(n), Space: O(n)
 *
 * For each day's price, find the next day with a higher price (spike).
 * Returns array of { date, price, nextSpikeDate, nextSpikePrice, daysUntilSpike }.
 */
function detectPriceSpikes(priceHistory) {
  if (!priceHistory || priceHistory.length === 0) return [];

  const n = priceHistory.length;
  const result = new Array(n).fill(null);
  const stack = []; // indices

  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && priceHistory[i].price > priceHistory[stack[stack.length - 1]].price) {
      const idx = stack.pop();
      result[idx] = {
        date: priceHistory[idx].date,
        price: priceHistory[idx].price,
        nextSpikeDate: priceHistory[i].date,
        nextSpikePrice: priceHistory[i].price,
        daysUntilSpike: i - idx,
      };
    }
    stack.push(i);
  }

  // Remaining in stack — no future spike
  while (stack.length > 0) {
    const idx = stack.pop();
    result[idx] = {
      date: priceHistory[idx].date,
      price: priceHistory[idx].price,
      nextSpikeDate: null,
      nextSpikePrice: null,
      daysUntilSpike: -1,
    };
  }

  return result;
}

export { detectPriceSpikes };
