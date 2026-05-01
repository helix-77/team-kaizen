/**
 * P9: Find Most Expensive K Rentals — Max-Heap Algorithm
 * Time: O(n log k), Space: O(k)
 *
 * Uses @datastructures-js/priority-queue MinPriorityQueue
 * Accepts: Array of rental objects with a 'price' field, k integer
 * Returns: k most expensive rentals sorted by price descending
 */
import { MinPriorityQueue } from '@datastructures-js/priority-queue';

function findMostExpensiveK(rentals, k) {
  if (!rentals || rentals.length === 0 || k <= 0) return [];
  if (k >= rentals.length) {
    return [...rentals].sort((a, b) => b.price - a.price);
  }

  // Min-heap of size k (keep k largest by evicting the smallest of the k)
  const minHeap = new MinPriorityQueue((item) => item.price);

  for (const rental of rentals) {
    minHeap.enqueue(rental);
    if (minHeap.size() > k) {
      minHeap.dequeue(); // Remove cheapest among tracked
    }
  }

  const result = [];
  while (minHeap.size() > 0) {
    result.push(minHeap.dequeue());
  }
  return result.sort((a, b) => b.price - a.price);
}

export { findMostExpensiveK };
