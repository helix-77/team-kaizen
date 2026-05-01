import axios from 'axios';

const CENTRAL_API_BASE = process.env.CENTRAL_API_URL || 'https://technocracy.brittoo.xyz';

async function groundWithDeviceData(query) {
  try {
    const response = await axios.get(`${CENTRAL_API_BASE}/api/data/products`, {
      headers: { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` },
      timeout: 8000,
    });
    const products = Array.isArray(response.data) ? response.data : response.data?.products || response.data?.data || [];

    // Simple relevance filter
    const lower = query.toLowerCase();
    const relevant = products.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(lower)) ||
        (d.category && d.category.toLowerCase().includes(lower)) ||
        (d.description && d.description.toLowerCase().includes(lower))
    );

    const subset = relevant.length > 0 ? relevant.slice(0, 5) : products.slice(0, 5);

    return {
      context: `RentPi products:\n${subset
        .map((d) => `- ${d.name || d.id}: ${d.category || 'N/A'}, $${d.pricePerDay || d.price || 'N/A'}/day`)
        .join('\n')}`,
      deviceCount: products.length,
    };
  } catch (err) {
    console.error('[grounding] Failed to fetch products:', err.message);
    return { context: 'Product data temporarily unavailable.', deviceCount: 0 };
  }
}

export { groundWithDeviceData };
