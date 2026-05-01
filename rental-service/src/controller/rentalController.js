import centralApi from '../centralApiClient.js';
import { MinHeap } from '../utils/heap.js';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

export const getStatus = (req, res) => {
  res.json({ service: 'rental-service', status: 'OK' });
};

// P5: Paginated Product Listing with Category Filter
export const getProducts = async (req, res) => {
  try {
    const { category, page, limit } = req.query;

    if (category) {
      let validCategories = cache.get('categories');
      if (!validCategories) {
        const data = await centralApi.get('/api/data/categories');
        validCategories = data.categories;
        cache.set('categories', validCategories);
      }

      if (!validCategories.includes(category.toUpperCase())) {
        return res.status(400).json({
          error: 'Invalid category',
          validCategories,
        });
      }
    }

    const data = await centralApi.get('/api/data/products', req.query);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, suggestion: error.suggestion });
  }
};

export const getProductById = async (req, res) => {
  try {
    const data = await centralApi.get(`/api/data/products/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// P7: Is It Available? (Interval Merging)
export const getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

    // Fetch all rentals for this product
    // Note: We might need to handle pagination if there are many rentals
    const rentals = await centralApi.get('/api/data/rentals', { product_id: id });
    
    // Sort and merge intervals
    const intervals = rentals.data.map(r => ({
      start: new Date(r.rentalStart),
      end: new Date(r.rentalEnd)
    })).sort((a, b) => a.start - b.start);

    const merged = [];
    if (intervals.length > 0) {
      let current = intervals[0];
      for (let i = 1; i < intervals.length; i++) {
        if (intervals[i].start <= current.end) {
          current.end = new Date(Math.max(current.end, intervals[i].end));
        } else {
          merged.push(current);
          current = intervals[i];
        }
      }
      merged.push(current);
    }

    const reqFrom = new Date(from);
    const reqTo = new Date(to);

    const busyPeriods = merged.map(m => ({
      start: m.start.toISOString().split('T')[0],
      end: m.end.toISOString().split('T')[0]
    }));

    // Check availability and find free windows
    const isAvailable = !merged.some(m => m.start <= reqTo && m.end >= reqFrom);
    
    const freeWindows = [];
    let lastEnd = reqFrom;
    for (const m of merged) {
      if (m.start > lastEnd && m.start > reqFrom && lastEnd < reqTo) {
        freeWindows.push({
          start: lastEnd.toISOString().split('T')[0],
          end: new Date(Math.min(reqTo, new Date(m.start.getTime() - 86400000))).toISOString().split('T')[0]
        });
      }
      lastEnd = new Date(Math.max(lastEnd.getTime(), m.end.getTime() + 86400000));
    }
    if (lastEnd < reqTo) {
      freeWindows.push({
        start: lastEnd.toISOString().split('T')[0],
        end: reqTo.toISOString().split('T')[0]
      });
    }

    res.json({
      productId: parseInt(id),
      from,
      to,
      available: isAvailable,
      busyPeriods,
      freeWindows: freeWindows.filter(w => new Date(w.start) <= new Date(w.end))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// P8: The Record Day (Optimized with Min-Heap)
export const getKthBusiestDate = async (req, res) => {
  try {
    const { from, to, k } = req.query;
    const kInt = parseInt(k);

    if (!from || !to || isNaN(kInt) || kInt <= 0) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const startMonth = new Date(from + '-01');
    const endMonth = new Date(to + '-01');
    
    const diffMonths = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth());
    if (diffMonths > 11) return res.status(400).json({ error: 'Max range is 12 months' });
    if (startMonth > endMonth) return res.status(400).json({ error: 'from must not be after to' });

    const heap = new MinHeap((a, b) => a.count - b.count);

    let current = new Date(startMonth);
    while (current <= endMonth) {
      const monthStr = current.toISOString().slice(0, 7);
      const stats = await centralApi.get('/api/data/rentals/stats', { group_by: 'date', month: monthStr });
      
      for (const day of stats.data) {
        heap.push({ date: day.date, count: day.count });
        if (heap.size() > kInt) heap.pop();
      }
      current.setMonth(current.getMonth() + 1);
    }

    if (heap.size() < kInt) return res.status(404).json({ error: 'k exceeds available dates' });

    const result = heap.peek();
    res.json({ from, to, k: kInt, date: result.date, rentalCount: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// P9: What Does This Renter Love? (Optimized with Min-Heap & Batch Fetching)
export const getTopCategories = async (req, res) => {
  try {
    const { id } = req.params;
    const k = parseInt(req.query.k) || 5;

    const rentals = await centralApi.get('/api/data/rentals', { renter_id: id, limit: 100 });
    if (rentals.data.length === 0) return res.json({ userId: parseInt(id), topCategories: [] });

    const productIds = [...new Set(rentals.data.map(r => r.productId))];
    const categoryCounts = {};

    // Batch fetch products (50 at a time)
    for (let i = 0; i < productIds.length; i += 50) {
      const batchIds = productIds.slice(i, i + 50).join(',');
      const products = await centralApi.get('/api/data/products/batch', { ids: batchIds });
      for (const p of products.data) {
        const count = rentals.data.filter(r => r.productId === p.id).length;
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + count;
      }
    }

    const heap = new MinHeap((a, b) => a.count - b.count);
    for (const [category, count] of Object.entries(categoryCounts)) {
      heap.push({ category, count });
      if (heap.size() > k) heap.pop();
    }

    const result = [];
    while (heap.size() > 0) result.unshift(heap.pop());
    
    res.json({ userId: parseInt(id), topCategories: result.map(r => ({ category: r.category, rentalCount: r.count })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// P10: The Long Vacation
export const getLongestFreeStreak = async (req, res) => {
  try {
    const { id } = req.params;
    const { year } = req.query;
    const yearInt = parseInt(year);

    const rentals = await centralApi.get('/api/data/rentals', { product_id: id });
    
    const yearStart = new Date(`${yearInt}-01-01`);
    const yearEnd = new Date(`${yearInt}-12-31`);

    const intervals = rentals.data
      .map(r => ({
        start: new Date(r.rentalStart),
        end: new Date(r.rentalEnd)
      }))
      .filter(i => i.start <= yearEnd && i.end >= yearStart)
      .sort((a, b) => a.start - b.start);

    // Merge
    const merged = [];
    if (intervals.length > 0) {
      let current = {
        start: new Date(Math.max(intervals[0].start, yearStart)),
        end: new Date(Math.min(intervals[0].end, yearEnd))
      };
      for (let i = 1; i < intervals.length; i++) {
        let s = new Date(Math.max(intervals[i].start, yearStart));
        let e = new Date(Math.min(intervals[i].end, yearEnd));
        if (s <= current.end) {
          current.end = new Date(Math.max(current.end, e));
        } else {
          merged.push(current);
          current = { start: s, end: e };
        }
      }
      merged.push(current);
    }

    let maxDays = 0;
    let streak = { from: yearStart.toISOString().split('T')[0], to: yearEnd.toISOString().split('T')[0], days: 365 };

    if (merged.length > 0) {
      let lastEnd = yearStart;
      let streaks = [];
      
      for (const m of merged) {
        if (m.start > lastEnd) {
          const diff = Math.ceil((m.start - lastEnd) / (1000 * 60 * 60 * 24));
          streaks.push({ from: lastEnd.toISOString().split('T')[0], to: new Date(m.start.getTime() - 86400000).toISOString().split('T')[0], days: diff });
        }
        lastEnd = new Date(m.end.getTime() + 86400000);
      }
      
      if (lastEnd <= yearEnd) {
        const diff = Math.ceil((yearEnd - lastEnd + 86400000) / (1000 * 60 * 60 * 24));
        streaks.push({ from: lastEnd.toISOString().split('T')[0], to: yearEnd.toISOString().split('T')[0], days: diff });
      }

      streak = streaks.reduce((max, curr) => curr.days > max.days ? curr : max, { days: -1 });
    }

    res.json({ productId: parseInt(id), year: yearInt, longestFreeStreak: streak });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// P12: The Unified Feed (Optimized with K-Way Merge using Min-Heap)
export const getMergedFeed = async (req, res) => {
  try {
    const { productIds, limit } = req.query;
    if (!productIds) return res.status(400).json({ error: 'productIds required' });
    const ids = [...new Set(productIds.split(',').map(Number))];
    const limitInt = parseInt(limit) || 30;

    const streams = await Promise.all(ids.map(id => centralApi.get('/api/data/rentals', { product_id: id })));
    const iterators = streams.map(s => s.data[Symbol.iterator]());

    const heap = new MinHeap((a, b) => new Date(a.val.rentalStart) - new Date(b.val.rentalStart));

    // Initial fill
    for (let i = 0; i < iterators.length; i++) {
      const next = iterators[i].next();
      if (!next.done) heap.push({ val: next.value, streamIdx: i });
    }

    const feed = [];
    while (feed.length < limitInt && heap.size() > 0) {
      const { val, streamIdx } = heap.pop();
      feed.push({
        rentalId: val.id,
        productId: val.productId,
        rentalStart: val.rentalStart.split('T')[0],
        rentalEnd: val.rentalEnd.split('T')[0]
      });

      const next = iterators[streamIdx].next();
      if (!next.done) heap.push({ val: next.value, streamIdx });
    }

    res.json({ productIds: ids, limit: limitInt, feed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
