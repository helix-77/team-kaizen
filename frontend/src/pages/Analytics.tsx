import { useState } from 'react';
import { getRecommendations } from '../lib/api';
import { TrendingUp, Search, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export function Analytics() {
  const [date, setDate] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchRecommendations = async () => {
    if (!date) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await getRecommendations(date);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card/40 backdrop-blur-xl p-8 rounded-2xl border border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <TrendingUp className="w-64 h-64 text-primary" />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">Seasonal Insights</h1>
          <p className="text-muted-foreground mt-2 max-w-md">Discover what products trend during specific times of the year based on historical rental data.</p>
        </div>
        
        <div className="flex items-end gap-3 relative z-10">
          <div className="w-full md:w-48">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Target Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-black/20 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all color-scheme-dark"
              />
            </div>
          </div>
          <button 
            onClick={fetchRecommendations}
            disabled={!date || loading}
            className="bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 h-[42px]"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <>Analyze <Search className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>

      <div className="pt-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-card/40 rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : hasSearched && recommendations.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-card/20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Star className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-medium">No Historical Data</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">We don't have enough rental history around this date to make confident recommendations.</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {recommendations.map((rec, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={rec.productId}
                className="bg-card/40 backdrop-blur-xl p-6 rounded-xl border border-border hover:border-primary/50 transition-colors relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 bg-primary/10 text-primary font-mono text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Score: {rec.score}
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-lg font-bold text-primary border border-primary/20 shadow-inner">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">{rec.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {rec.productId}</p>
                  </div>
                </div>
                
                <div className="inline-flex px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-foreground/80">
                  {rec.category}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
