/**
 * P7: Merge Overlapping Rental Periods — Interval Merge Algorithm
 * Time: O(n log n), Space: O(n)
 *
 * Accepts: Array of { start: string, end: string } (ISO date strings)
 * Returns: Merged intervals sorted by start date
 */
function mergeIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];

  const parsed = intervals.map((iv) => ({
    start: new Date(iv.start).getTime(),
    end: new Date(iv.end).getTime(),
  }));

  // Sort by start time
  parsed.sort((a, b) => a.start - b.start);

  const merged = [parsed[0]];

  for (let i = 1; i < parsed.length; i++) {
    const last = merged[merged.length - 1];
    const curr = parsed[i];

    if (curr.start <= last.end) {
      // Overlapping or adjacent — extend
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged.map((iv) => ({
    start: new Date(iv.start).toISOString(),
    end: new Date(iv.end).toISOString(),
  }));
}

export { mergeIntervals };
