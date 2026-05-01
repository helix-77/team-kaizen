import dayjs from 'dayjs';
import { centralApiGet } from '../centralApiClient.js';
import { findPeakWindow } from '../algorithms/peakWindow.js';
import { detectPriceSpikes } from '../algorithms/priceSpikes.js';

const toArray = (payload) => (Array.isArray(payload) ? payload : payload.data || []);

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function addDays(date, days) {
  const copy = new Date(`${date}T00:00:00.000Z`);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

export const getPeakWindow = async (req, res) => {
  try {
    const windowSize = parseInt(req.query.days) || 7;
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];

    const dayCounts = {};
    for (const d of devices) {
      if (d.rentals) {
        for (const r of d.rentals) {
          const day = dayjs(r.startDate || r.date).format('YYYY-MM-DD');
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      }
      if (d.createdAt) {
        const day = dayjs(d.createdAt).format('YYYY-MM-DD');
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    }

    const sorted = Object.entries(dayCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const peak = findPeakWindow(sorted, windowSize);
    res.json({ windowSize, ...peak });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[peak-window]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSurgeDays = async (req, res) => {
  try {
    const { month } = req.query;
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }

    const payload = await centralApiGet('/api/data/rentals/stats', { group_by: 'date', month });
    const counts = new Map(toArray(payload).map((row) => [row.date, row.count || 0]));
    const data = Array.from({ length: daysInMonth(month) }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`;
      return { date, count: counts.get(date) || 0, nextSurgeDate: null, daysUntil: null };
    });

    const waiting = [];
    for (let i = 0; i < data.length; i += 1) {
      while (waiting.length && data[i].count > data[waiting[waiting.length - 1]].count) {
        const previous = waiting.pop();
        data[previous].nextSurgeDate = data[i].date;
        data[previous].daysUntil = i - previous;
      }
      waiting.push(i);
    }

    res.json({ month, data });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[surge-days]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const { date } = req.query;
    const limit = parseInt(req.query.limit || '10', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'limit must be 1-50' });
    }

    const counts = new Map();
    for (const yearOffset of [1, 2]) {
      const base = new Date(`${date}T00:00:00.000Z`);
      base.setUTCFullYear(base.getUTCFullYear() - yearOffset);
      const center = base.toISOString().slice(0, 10);
      const rentals = toArray(await centralApiGet('/api/data/rentals', {
        from: addDays(center, -7),
        to: addDays(center, 7),
        limit: 100,
      }));
      for (const rental of rentals) {
        const productId = rental.productId || rental.product_id;
        if (productId) counts.set(productId, (counts.get(productId) || 0) + 1);
      }
    }

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (top.length === 0) return res.json({ date, recommendations: [] });

    const products = toArray(await centralApiGet('/api/data/products/batch', { ids: top.map(([id]) => id).join(',') }));
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const recommendations = top.map(([productId, score]) => {
      const product = byId.get(String(productId)) || {};
      return {
        productId: Number(productId),
        name: product.name,
        category: product.category,
        score,
      };
    });

    res.json({ date, recommendations });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[recommendations]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTrends = async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];

    const formatMap = {
      daily: 'YYYY-MM-DD',
      weekly: 'YYYY-[W]WW',
      monthly: 'YYYY-MM',
      yearly: 'YYYY',
    };
    const fmt = formatMap[period] || formatMap.monthly;

    const buckets = {};
    for (const d of devices) {
      const key = dayjs(d.createdAt || d.updatedAt || new Date()).format(fmt);
      if (!buckets[key]) buckets[key] = { period: key, count: 0, totalPrice: 0 };
      buckets[key].count++;
      buckets[key].totalPrice += d.price || 0;
    }

    const trends = Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
    trends.forEach((t) => (t.avgPrice = t.count > 0 ? Math.round((t.totalPrice / t.count) * 100) / 100 : 0));

    res.json({ period, data: trends });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[trends]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPriceSpikes = async (req, res) => {
  try {
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];

    const priceHistory = devices
      .filter((d) => d.price != null)
      .map((d) => ({
        date: dayjs(d.createdAt || d.updatedAt || new Date()).format('YYYY-MM-DD'),
        price: d.price,
        name: d.name,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const spikes = detectPriceSpikes(priceHistory);
    res.json({ count: spikes.length, spikes });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[price-spikes]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSummary = async (req, res) => {
  try {
    const data = await centralApiGet('/api/data/products');
    const devices = Array.isArray(data) ? data : data.devices || data.data || [];

    const prices = devices.map((d) => d.price || 0).filter((p) => p > 0);
    const total = prices.reduce((s, p) => s + p, 0);
    const sorted = [...prices].sort((a, b) => a - b);
    const median =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : 0;

    const categories = {};
    for (const d of devices) {
      const cat = d.type || d.category || 'unknown';
      if (!categories[cat]) categories[cat] = { count: 0, totalPrice: 0 };
      categories[cat].count++;
      categories[cat].totalPrice += d.price || 0;
    }

    const statuses = {};
    for (const d of devices) {
      const s = d.status || 'unknown';
      statuses[s] = (statuses[s] || 0) + 1;
    }

    res.json({
      totalDevices: devices.length,
      priceStats: {
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        avg: prices.length > 0 ? Math.round((total / prices.length) * 100) / 100 : 0,
        median: Math.round(median * 100) / 100,
        total: Math.round(total * 100) / 100,
      },
      categories,
      statuses,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json(err.body);
    console.error('[summary]', err.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
