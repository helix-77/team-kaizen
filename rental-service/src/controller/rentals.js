
import { centralApiGet } from '../centralApiClient.js';
import { mergeIntervals } from '../algorithms/mergeIntervals.js';
import { findCheapestK } from '../algorithms/cheapestK.js';
import { findMostExpensiveK } from '../algorithms/mostExpensiveK.js';
import { buildGraph, findDependents } from '../algorithms/deviceGraph.js';

let categoriesCache = null;
let categoriesCacheAt = 0;
const CATEGORY_TTL_MS = 10 * 60 * 1000;

const toArray = (payload) => (Array.isArray(payload) ? payload : payload.data || payload.products || payload.devices || []);
const rentalStart = (r) => r.rentalStart || r.startDate || r.start || r.from;
const rentalEnd = (r) => r.rentalEnd || r.endDate || r.end || r.to;
const productIdOf = (r) => r.productId || r.product_id || r.productID;
const renterIdOf = (r) => r.renterId || r.renter_id;

async function getCategories() {
  if (categoriesCache && Date.now() - categoriesCacheAt < CATEGORY_TTL_MS) return categoriesCache;
  const payload = await centralApiGet('/api/data/categories');
  categoriesCache = payload.categories || payload.data || [];
  categoriesCacheAt = Date.now();
  return categoriesCache;
}

function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function mergeBusyPeriods(rentals) {
  const intervals = rentals
    .map((r) => ({ start: rentalStart(r), end: rentalEnd(r) }))
    .filter((p) => p.start && p.end)
    .map((p) => ({ start: dateOnly(p.start), end: dateOnly(p.end) }))
    .sort((a, b) => a.start.localeCompare(b.start));

  const merged = [];
  for (const period of intervals) {
    const last = merged[merged.length - 1];
    if (!last || period.start > last.end) {
      merged.push({ ...period });
    } else if (period.end > last.end) {
      last.end = period.end;
    }
  }
  return merged;
}

export const getProducts = async (req, res) => {
  try {
    if (req.query.category) {
      const categories = await getCategories();
      if (!categories.includes(req.query.category)) {
        return res.status(400).json({ error: 'Invalid category', validCategories: categories });
      }
    }
    const data = await centralApiGet('/api/data/products', req.query);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[products]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const data = await centralApiGet(`/api/data/products/${req.params.id}`);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[product]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailability = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

    const payload = await centralApiGet('/api/data/rentals', { product_id: req.params.id, limit: 100 });
    const busyPeriods = mergeBusyPeriods(toArray(payload));
    const requestedStart = from;
    const requestedEnd = to;
    const conflicts = busyPeriods.filter((p) => p.start <= requestedEnd && p.end >= requestedStart);

    const freeWindows = [];
    let cursor = requestedStart;
    for (const busy of conflicts) {
      if (cursor < busy.start) {
        const end = new Date(busy.start);
        end.setDate(end.getDate() - 1);
        freeWindows.push({ start: cursor, end: dateOnly(end) });
      }
      if (busy.end >= cursor) {
        const next = new Date(busy.end);
        next.setDate(next.getDate() + 1);
        cursor = dateOnly(next);
      }
    }
    if (cursor <= requestedEnd) freeWindows.push({ start: cursor, end: requestedEnd });

    res.json({
      productId: Number(req.params.id),
      from,
      to,
      available: conflicts.length === 0,
      busyPeriods,
      freeWindows,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[availability]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getKthBusiestDate = async (req, res) => {
  try {
    const { from, to } = req.query;
    const k = parseInt(req.query.k, 10);
    if (!/^\d{4}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}$/.test(to || '')) {
      return res.status(400).json({ error: 'from and to must be YYYY-MM' });
    }
    if (!Number.isInteger(k) || k < 1) return res.status(400).json({ error: 'k must be a positive integer' });
    if (from > to) return res.status(400).json({ error: 'from must not be after to' });

    const rows = [];
    let cursor = new Date(`${from}-01T00:00:00.000Z`);
    const end = new Date(`${to}-01T00:00:00.000Z`);
    let months = 0;
    while (cursor <= end) {
      if (++months > 12) return res.status(400).json({ error: 'range must be at most 12 months' });
      const month = cursor.toISOString().slice(0, 7);
      const payload = await centralApiGet('/api/data/rentals/stats', { group_by: 'date', month });
      rows.push(...toArray(payload));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const sorted = rows.sort((a, b) => (b.count || 0) - (a.count || 0));
    const kth = sorted[k - 1];
    if (!kth) return res.status(404).json({ error: 'k exceeds available dates' });
    res.json({ from, to, k, date: kth.date, rentalCount: kth.count });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[kth-busiest-date]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTopCategories = async (req, res) => {
  try {
    const k = parseInt(req.query.k || '5', 10);
    if (!Number.isInteger(k) || k < 1) return res.status(400).json({ error: 'k must be a positive integer' });

    const rentals = toArray(await centralApiGet('/api/data/rentals', { renter_id: req.params.id, limit: 100 }));
    const ids = [...new Set(rentals.map(productIdOf).filter(Boolean))];
    if (ids.length === 0) return res.json({ userId: Number(req.params.id), topCategories: [] });

    const products = [];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50).join(',');
      products.push(...toArray(await centralApiGet('/api/data/products/batch', { ids: batch })));
    }

    const productCategories = new Map(products.map((p) => [String(p.id), p.category]));
    const counts = {};
    for (const rental of rentals) {
      const category = productCategories.get(String(productIdOf(rental)));
      if (category) counts[category] = (counts[category] || 0) + 1;
    }

    const topCategories = Object.entries(counts)
      .map(([category, rentalCount]) => ({ category, rentalCount }))
      .sort((a, b) => b.rentalCount - a.rentalCount)
      .slice(0, k);
    res.json({ userId: Number(req.params.id), topCategories });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[top-categories]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFreeStreak = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!Number.isInteger(year)) return res.status(400).json({ error: 'year is required' });
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const rentals = toArray(await centralApiGet('/api/data/rentals', { product_id: req.params.id, from, to, limit: 100 }));
    const busy = mergeBusyPeriods(rentals);
    let best = busy.length === 0 ? { from, to, days: 365 + Number(new Date(`${year}-02-29`).getUTCMonth() === 1) } : { from, to: from, days: 0 };
    let cursor = from;

    for (const period of busy) {
      if (cursor < period.start) {
        const end = new Date(period.start);
        end.setDate(end.getDate() - 1);
        const candidate = { from: cursor, to: dateOnly(end) };
        candidate.days = Math.floor((new Date(candidate.to) - new Date(candidate.from)) / 86400000) + 1;
        if (candidate.days > best.days || busy.length === 0) best = candidate;
      }
      const next = new Date(period.end);
      next.setDate(next.getDate() + 1);
      cursor = dateOnly(next);
    }
    if (busy.length > 0 && cursor <= to) {
      const candidate = { from: cursor, to };
      candidate.days = Math.floor((new Date(candidate.to) - new Date(candidate.from)) / 86400000) + 1;
      if (candidate.days > best.days) best = candidate;
    }
    res.json({ productId: Number(req.params.id), year, longestFreeStreak: best });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[free-streak]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMergedFeed = async (req, res) => {
  try {
    const productIds = [...new Set(String(req.query.productIds || '').split(',').map((v) => parseInt(v, 10)).filter(Number.isInteger))];
    const limit = parseInt(req.query.limit, 10);
    if (productIds.length < 1 || productIds.length > 10) return res.status(400).json({ error: 'productIds must contain 1-10 integers' });
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ error: 'limit must be 1-100' });

    const feed = [];
    for (const productId of productIds) {
      const rentals = toArray(await centralApiGet('/api/data/rentals', { product_id: productId, limit: 100 }));
      feed.push(...rentals.map((r) => ({
        rentalId: r.id,
        productId: productIdOf(r),
        rentalStart: rentalStart(r),
        rentalEnd: rentalEnd(r),
      })));
    }
    feed.sort((a, b) => String(a.rentalStart).localeCompare(String(b.rentalStart)));
    res.json({ productIds, limit, feed: feed.slice(0, limit) });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[merged-feed]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getListings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const data = await centralApiGet('/api/data/products', { page, limit });

    const devices = Array.isArray(data) ? data : data.devices || data.data || [];
    const total = data.total || devices.length;

    res.json({
      data: devices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[listings]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchDevices = async (req, res) => {
  try {
    const { q, type, minPrice, maxPrice, status, sort } = req.query;
    const data = await centralApiGet('/api/data/products');
    let devices = Array.isArray(data) ? data : data.devices || data.data || [];

    if (q) {
      const lower = q.toLowerCase();
      devices = devices.filter(
        (d) =>
          (d.name && d.name.toLowerCase().includes(lower)) ||
          (d.type && d.type.toLowerCase().includes(lower)) ||
          (d.description && d.description.toLowerCase().includes(lower))
      );
    }
    if (type) devices = devices.filter((d) => d.type?.toLowerCase() === type.toLowerCase());
    if (status) devices = devices.filter((d) => d.status?.toLowerCase() === status.toLowerCase());
    if (minPrice) devices = devices.filter((d) => d.price >= parseFloat(minPrice));
    if (maxPrice) devices = devices.filter((d) => d.price <= parseFloat(maxPrice));

    if (sort) {
      const [field, order] = sort.split(':');
      devices.sort((a, b) => {
        if (order === 'desc') return (b[field] || 0) - (a[field] || 0);
        return (a[field] || 0) - (b[field] || 0);
      });
    }

    res.json({ results: devices, count: devices.length });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[search]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const mergePeriods = (req, res) => {
  try {
    const { intervals } = req.body;
    if (!intervals || !Array.isArray(intervals)) {
      return res.status(400).json({ error: 'intervals array is required' });
    }
    const merged = mergeIntervals(intervals);
    res.json({
      original: intervals.length,
      merged: merged.length,
      intervals: merged,
    });
  } catch (err) {
    console.error('[merge]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCheapest = async (req, res) => {
  try {
    const k = parseInt(req.query.k) || 5;
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];
    const cheapest = findCheapestK(devices, k);
    res.json({ k, results: cheapest });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[cheapest]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpensive = async (req, res) => {
  try {
    const k = parseInt(req.query.k) || 5;
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];
    const expensive = findMostExpensiveK(devices, k);
    res.json({ k, results: expensive });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[expensive]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDependencies = async (req, res) => {
  try {
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];
    const graph = buildGraph(devices);
    const dependents = findDependents(graph, req.params.deviceId);
    res.json({
      deviceId: req.params.deviceId,
      dependentCount: dependents.length,
      dependents,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[dependencies]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
