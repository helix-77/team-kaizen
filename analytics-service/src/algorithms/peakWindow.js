/**
 * P11: Peak Rental Window — Sliding Window Algorithm
 * Time: O(n), Space: O(1)
 *
 * Finds the contiguous window of 'windowSize' days with the highest
 * total rental activity. Input must be sorted by date.
 */
function findPeakWindow(dailyCounts, windowSize) {
  if (!dailyCounts || dailyCounts.length === 0 || windowSize <= 0) {
    return { window: [], total: 0 };
  }
  if (windowSize > dailyCounts.length) windowSize = dailyCounts.length;

  // Initial window sum
  let windowSum = 0;
  for (let i = 0; i < windowSize; i++) {
    windowSum += dailyCounts[i].count;
  }

  let maxSum = windowSum;
  let maxStart = 0;

  // Slide
  for (let i = windowSize; i < dailyCounts.length; i++) {
    windowSum += dailyCounts[i].count - dailyCounts[i - windowSize].count;
    if (windowSum > maxSum) {
      maxSum = windowSum;
      maxStart = i - windowSize + 1;
    }
  }

  return {
    window: dailyCounts.slice(maxStart, maxStart + windowSize),
    total: maxSum,
    startIndex: maxStart,
  };
}

export { findPeakWindow };
