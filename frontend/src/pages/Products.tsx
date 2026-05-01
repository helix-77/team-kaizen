import { useState } from 'react';
import { getProducts, checkAvailability } from '../lib/api';
import { Search, Filter, Calendar, Check, X, ArrowRight, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ["ELECTRONICS", "FURNITURE", "VEHICLES", "TOOLS", "OUTDOOR", "SPORTS", "MUSIC"];

export function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Availability Check State
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [availability, setAvailability] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  // Removed auto-fetch useEffect to minimize API calls
  // Only fetch when the user explicitly clicks the Load button

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts(category, page);
      setProducts(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!selectedProduct || !from || !to) return;
    setChecking(true);
    try {
      const data = await checkAvailability(selectedProduct.id, from, to);
      setAvailability(data);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products Inventory</h1>
          <p className="text-muted-foreground mt-2">Browse and check availability for rentals</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-card/50 backdrop-blur-md p-2 rounded-xl border border-border">
            <Filter className="h-5 w-5 text-muted-foreground ml-2" />
            <select 
              value={category} 
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer outline-none text-foreground py-1 pr-8"
            >
              <option value="" className="bg-background">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-background">{c}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium disabled:opacity-50 h-[44px]"
          >
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground" /> : <Search className="h-4 w-4" />}
            Sync Inventory
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 glass rounded-2xl border-dashed">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 glass rounded-2xl border-dashed">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium">No Products Loaded</h3>
              <p className="text-muted-foreground mt-2 max-w-xs text-center">Click the "Sync Inventory" button to fetch the latest product list from the server.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map(product => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setAvailability(null);
                  }}
                  className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedProduct?.id === product.id 
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                      : 'border-border bg-card/40 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full mt-2 inline-block">
                        {product.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-foreground">${product.pricePerDay}</span>
                      <p className="text-xs text-muted-foreground">/day</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-border">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-card border border-border disabled:opacity-50 hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg bg-card border border-border hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>

        {/* Availability Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-card/40 backdrop-blur-xl border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Availability Check
            </h3>
            
            {selectedProduct ? (
              <div className="space-y-6">
                <div className="p-4 bg-black/20 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Selected Product</p>
                  <p className="font-medium text-foreground">{selectedProduct.name}</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">From</label>
                    <input 
                      type="date" 
                      value={from}
                      onChange={e => setFrom(e.target.value)}
                      className="w-full bg-black/20 border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground color-scheme-dark"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">To</label>
                    <input 
                      type="date" 
                      value={to}
                      onChange={e => setTo(e.target.value)}
                      className="w-full bg-black/20 border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-foreground color-scheme-dark"
                    />
                  </div>
                  
                  <button
                    onClick={handleCheck}
                    disabled={!from || !to || checking}
                    className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checking ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : (
                      <>Check Dates <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {availability && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-6 border-t border-border mt-6 overflow-hidden"
                    >
                      <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                        availability.available 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-destructive/10 border-destructive/20 text-destructive'
                      }`}>
                        {availability.available ? (
                          <Check className="h-5 w-5 mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-5 w-5 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold">
                            {availability.available ? 'Available' : 'Not Available'}
                          </p>
                          <p className="text-sm opacity-90 mt-1">
                            {availability.available 
                              ? 'This item is free for the selected dates.'
                              : 'This item is booked during part of your selected dates.'}
                          </p>
                        </div>
                      </div>
                      
                      {!availability.available && availability.freeWindows?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2 text-foreground/80">Alternative Free Dates:</p>
                          <div className="space-y-2">
                            {availability.freeWindows.map((w: any, i: number) => (
                              <div key={i} className="text-xs bg-black/20 p-2 rounded border border-border/50 text-muted-foreground text-center">
                                {w.start} to {w.end}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                <div className="h-16 w-16 bg-card rounded-full border border-border flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Select a product from the inventory to check its availability dates.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
