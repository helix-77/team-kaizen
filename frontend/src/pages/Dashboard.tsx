import { useState } from 'react';
import { getSystemStatus } from '../lib/api';
import { Activity, Server, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export function Dashboard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getSystemStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">System Overview</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Real-time platform metrics and service health
          </p>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition-all font-medium disabled:opacity-50"
        >
          {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /> : <Activity className="h-4 w-4" />}
          Refresh Metrics
        </button>
      </div>
      </div>

      {loading && !status ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !status ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-card/20 flex flex-col items-center">
          <div className="h-16 w-16 bg-card rounded-full border border-border flex items-center justify-center mb-4">
            <Server className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">No Data Loaded</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">Press the refresh button above to fetch the latest system status.</p>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {/* Main Gateway Status */}
          <motion.div variants={item} className="col-span-full bg-card/40 backdrop-blur-xl border border-border rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Server className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">API Gateway</h3>
                  <p className="text-sm text-muted-foreground">Central Routing Node</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Healthy</span>
              </div>
            </div>
          </motion.div>

          {/* Microservices */}
          {status?.downstream && Object.entries(status.downstream).map(([service, state]: [string, any]) => (
            <motion.div key={service} variants={item} className="bg-card/40 backdrop-blur-xl border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium capitalize text-foreground/90">{service.replace('-service', '')} Service</h4>
                {state === 'OK' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                <Clock className="h-4 w-4" />
                <span>Last checked just now</span>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <span className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-md",
                  state === 'OK' ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                )}>
                  {state}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
