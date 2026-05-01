import centralApi from '../centralApiClient.js';

export const getStatus = (req, res) => {
  res.json({ service: 'analytics-service', status: 'OK' });
};

// P11: The Seven-Day Rush (Sliding Window Optimization)
export const getPeakWindow = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });

    const startDate = new Date(from + '-01');
    const endDate = new Date(to + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of 'to' month

    const dailyData = [];
    let current = new Date(startDate);
    
    // Fetch stats and fill all dates
    while (current <= endDate) {
      const monthStr = current.toISOString().slice(0, 7);
      const stats = await centralApi.get('/api/data/rentals/stats', { group_by: 'date', month: monthStr });
      
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const statsMap = Object.fromEntries(stats.data.map(d => [d.date, d.count]));

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
        const d = new Date(dateStr);
        if (d >= startDate && d <= endDate) {
          dailyData.push({ date: dateStr, count: statsMap[dateStr] || 0 });
        }
      }
      current.setMonth(current.getMonth() + 1);
    }

    if (dailyData.length < 7) return res.status(400).json({ error: 'Range too short' });

    // Sliding Window
    let currentSum = 0;
    for (let i = 0; i < 7; i++) currentSum += dailyData[i].count;

    let maxSum = currentSum;
    let peakStartIdx = 0;

    for (let i = 7; i < dailyData.length; i++) {
      currentSum = currentSum - dailyData[i - 7].count + dailyData[i].count;
      if (currentSum > maxSum) {
        maxSum = currentSum;
        peakStartIdx = i - 6;
      }
    }

    res.json({
      from, to,
      peakWindow: {
        from: dailyData[peakStartIdx].date,
        to: dailyData[peakStartIdx + 6].date,
        totalRentals: maxSum
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// P13: Chasing the Surge (Monotonic Stack Optimization)
export const getSurgeDays = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month required' });

    const stats = await centralApi.get('/api/data/rentals/stats', { group_by: 'date', month });
    const statsMap = Object.fromEntries(stats.data.map(d => [d.date, d.count]));

    const year = parseInt(month.split('-')[0]);
    const monthIdx = parseInt(month.split('-')[1]) - 1;
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      data.push({ date: dateStr, count: statsMap[dateStr] || 0, nextSurgeDate: null, daysUntil: null });
    }

    // Monotonic Stack
    const stack = []; // indices
    for (let i = 0; i < data.length; i++) {
      while (stack.length > 0 && data[i].count > data[stack[stack.length - 1]].count) {
        const idx = stack.pop();
        data[idx].nextSurgeDate = data[i].date;
        data[idx].daysUntil = i - idx;
      }
      stack.push(i);
    }

    res.json({ month, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// P14: What's In Season?
export const getRecommendations = async (req, res) => {
  try {
    const { date, limit = 10 } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    const limitInt = Math.min(50, parseInt(limit));

    const refDate = new Date(date);
    const productCounts = {};

    for (let y = 1; y <= 2; y++) {
      const year = refDate.getFullYear() - y;
      const windowStart = new Date(year, refDate.getMonth(), refDate.getDate() - 7);
      const windowEnd = new Date(year, refDate.getMonth(), refDate.getDate() + 7);

      const rentals = await centralApi.get('/api/data/rentals', {
        from: windowStart.toISOString().split('T')[0],
        to: windowEnd.toISOString().split('T')[0],
        limit: 100
      });

      for (const r of rentals.data) {
        productCounts[r.productId] = (productCounts[r.productId] || 0) + 1;
      }
    }

    const topIds = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitInt);

    if (topIds.length === 0) return res.json({ date, recommendations: [] });

    // Enrich
    const enriched = await Promise.all(topIds.map(async ([id, score]) => {
      try {
        const p = await centralApi.get(`/api/data/products/${id}`);
        return { productId: parseInt(id), name: p.name, category: p.category, score };
      } catch {
        return { productId: parseInt(id), name: 'Unknown Product', category: 'UNKNOWN', score };
      }
    }));

    res.json({ date, recommendations: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
