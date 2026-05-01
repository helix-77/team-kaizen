/**
 * P8: Find Cheapest K Rentals — Min-Heap Algorithm
 * Time: O(n log k), Space: O(k)
 *
 * Uses @datastructures-js/priority-queue MinPriorityQueue
 * Accepts: Array of rental objects with a 'price' field, k integer
 * Returns: k cheapest rentals sorted by price ascending
 */
import { MinPriorityQueue } from '@datastructures-js/priority-queue';

function findCheapestK(rentals, k) {
  if (!rentals || rentals.length === 0 || k <= 0) return [];
  if (k >= rentals.length) {
    return [...rentals].sort((a, b) => a.price - b.price);
  }

  // Max-heap of size k (keep k smallest by evicting the largest of the k)
  // We use a MinPriorityQueue with negated priorities to simulate a max-heap
  const maxHeap = new MinPriorityQueue((item) => -item.price);

  for (const rental of rentals) {
    maxHeap.enqueue(rental);
    if (maxHeap.size() > k) {
      maxHeap.dequeue(); // Remove the most expensive among tracked
    }
  }

  const result = [];
  while (maxHeap.size() > 0) {
    result.push(maxHeap.dequeue());
  }
  return result.sort((a, b) => a.price - b.price);
}

export { findCheapestK };
