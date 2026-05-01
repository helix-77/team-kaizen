export class MinHeap {
  constructor(comparator = (a, b) => a - b) {
    this.heap = [];
    this.comparator = comparator;
  }

  push(val) {
    this.heap.push(val);
    this.siftUp();
  }

  pop() {
    if (this.size() === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.size() > 0) {
      this.heap[0] = last;
      this.siftDown();
    }
    return top;
  }

  peek() {
    return this.heap[0];
  }

  size() {
    return this.heap.length;
  }

  siftUp() {
    let nodeIdx = this.size() - 1;
    while (nodeIdx > 0) {
      let parentIdx = (nodeIdx - 1) >> 1;
      if (this.comparator(this.heap[nodeIdx], this.heap[parentIdx]) < 0) {
        [this.heap[nodeIdx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[nodeIdx]];
        nodeIdx = parentIdx;
      } else break;
    }
  }

  siftDown() {
    let nodeIdx = 0;
    while (true) {
      let leftChildIdx = (nodeIdx << 1) + 1;
      let rightChildIdx = (nodeIdx << 1) + 2;
      let swapIdx = null;

      if (leftChildIdx < this.size()) {
        if (this.comparator(this.heap[leftChildIdx], this.heap[nodeIdx]) < 0) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < this.size()) {
        if (
          (swapIdx === null && this.comparator(this.heap[rightChildIdx], this.heap[nodeIdx]) < 0) ||
          (swapIdx !== null && this.comparator(this.heap[rightChildIdx], this.heap[leftChildIdx]) < 0)
        ) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      [this.heap[nodeIdx], this.heap[swapIdx]] = [this.heap[swapIdx], this.heap[nodeIdx]];
      nodeIdx = swapIdx;
    }
  }
}
