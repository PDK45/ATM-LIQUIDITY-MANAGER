'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Truck,
  Database,
  Settings,
  AlertTriangle,
  Zap,
  History,
  TrendingUp,
  Activity,
  X
} from 'lucide-react';

// Types
interface Config {
  risk_tolerance: string;
  min_cash_threshold: number;
  max_cash_threshold: number;
}

interface NetworkStatus {
  date: string;
  total_cash_flow: number;
  network_status: string;
  atms_online: number;
  chart_data: { date: string; net_flow: number }[];
  config: Config;
}

interface RebalancingAction {
  action: string;
  source: string | number;
  destination: string | number;
  amount: number;
  notes: string;
}

interface OptimizationResult {
  network_status: { atm_id: number; net_flow: number; status: string }[];
  rebalancing_schedule: RebalancingAction[];
}

export default function Home() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [selectedATM, setSelectedATM] = useState<number | null>(null);
  const [atmDetail, setATMDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [riskProfile, setRiskProfile] = useState('moderate');
  const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'network'>('overview');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      if (!isPlaying) setLoading(true);
      setError('');
      const statusRes = await fetch('http://localhost:8000/network-status');
      if (!statusRes.ok) throw new Error('Backend Disconnected');
      const statusData = await statusRes.json();
      setStatus(statusData);
      setRiskProfile(statusData.config.risk_tolerance);

      const predictRes = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const predictData = await predictRes.json();
      setOptimization(predictData);
    } catch (err) {
      setError('System Offline. Run `start_app.ps1` to launch.');
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !processing) {
      interval = setInterval(async () => { await handleAdvance(); }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, processing]);

  const updateConfig = async (newRisk: string) => {
    setProcessing(true);
    setRiskProfile(newRisk);
    try {
      await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk_tolerance: newRisk })
      });
      await fetchData();
    } finally { setProcessing(false); }
  };

  const injectEvent = async (type: string) => {
    const wasPlaying = isPlaying;
    setIsPlaying(false);
    setProcessing(true);
    try {
      await fetch('http://localhost:8000/simulate/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
    } finally {
      setProcessing(false);
      if (wasPlaying) setIsPlaying(true);
    }
  };

  const handleAdvance = async () => {
    setProcessing(true);
    try {
      await fetch('http://localhost:8000/simulate/advance', { method: 'POST' });
      await fetchData();
    } finally { setProcessing(false); }
  };

  const handleReset = async () => {
    setIsPlaying(false);
    if (!confirm("Reset Simulation?")) return;
    setProcessing(true);
    await fetch('http://localhost:8000/simulate/reset', { method: 'POST' });
    await fetchData();
    setProcessing(false);
  };

  const openATMDetail = async (id: number) => {
    setSelectedATM(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`http://localhost:8000/atm/${id}`);
      const data = await res.json();
      setATMDetail(data);
    } finally { setLoadingDetail(false); }
  };

  const closeATMDetail = () => { setSelectedATM(null); setATMDetail(null); };

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">C</div>
              <h1 className="font-semibold text-lg hidden sm:block">CashCycle</h1>
            </div>
            <nav className="flex items-center gap-1 bg-neutral-800/50 p-1 rounded-xl border border-neutral-700/50">
              {[
                { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} /> },
                { id: 'logistics', label: 'Logistics', icon: <Truck size={14} /> },
                { id: 'network', label: 'Network', icon: <Database size={14} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {status && <div className="hidden lg:block text-right border-r border-neutral-700 pr-4">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Live Date</p>
              <p className="text-sm font-mono text-white">{status.date}</p>
            </div>}
            <div className="flex items-center gap-2 bg-neutral-800/30 p-1 rounded-xl border border-neutral-700/30">
              <button onClick={handleReset} className="p-1.5 text-neutral-400 hover:text-red-400"><History size={18} /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className={`h-8 px-4 rounded-lg text-xs font-bold uppercase transition-all ${isPlaying ? 'bg-neutral-700' : 'bg-green-600 shadow-lg shadow-green-900/20'}`}>
                {isPlaying ? 'Pause' : 'Go Live'}
              </button>
              <button onClick={handleAdvance} disabled={isPlaying} className="bg-blue-600 hover:bg-blue-500 px-4 h-8 rounded-lg text-xs font-bold uppercase disabled:opacity-30">Next Day</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                    <h3 className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-4">Risk Profile</h3>
                    <div className="space-y-2">
                      {['conservative', 'moderate', 'aggressive'].map((l) => (
                        <button key={l} onClick={() => updateConfig(l)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${riskProfile === l ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-neutral-900/50 border-neutral-700 hover:border-neutral-600'}`}>
                          <div className="flex justify-between items-center"><span className="capitalize text-sm font-bold">{l}</span>{riskProfile === l && <Zap size={10} className="text-blue-500 fill-blue-500" />}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                    <h3 className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-4">Network Events</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => injectEvent('FESTIVAL')} className="p-3 bg-neutral-900/50 border border-neutral-700 rounded-xl hover:border-purple-500 group transition-all text-center">
                        <span className="text-2xl block group-hover:scale-110 transition-transform">🎉</span>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 mt-1">Festival</span>
                      </button>
                      <button onClick={() => injectEvent('STORM')} className="p-3 bg-neutral-900/50 border border-neutral-700 rounded-xl hover:border-teal-500 group transition-all text-center">
                        <span className="text-2xl block group-hover:scale-110 transition-transform">⛈️</span>
                        <span className="text-[10px] font-bold uppercase text-neutral-400 mt-1">Storm</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-6 h-80 shadow-xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={120} /></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                      <h3 className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Liquidity Analysis (30D)</h3>
                      {status && <div className="text-right">
                        <p className="text-2xl font-black text-white">₹{(status.total_cash_flow / 100000).toFixed(1)}L</p>
                        <p className="text-[10px] text-blue-400 font-bold uppercase">Net Position</p>
                      </div>}
                    </div>
                    {status?.chart_data && <ResponsiveContainer width="100%" height="70%">
                      <AreaChart data={status.chart_data}>
                        <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} minTickGap={30} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }} />
                        <Area type="monotone" dataKey="net_flow" stroke="#3b82f6" fill="url(#cf)" strokeWidth={3} animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logistics' && (
            <motion.div key="logistics" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
                <div className="px-8 py-6 border-b border-neutral-700/50 flex justify-between items-center bg-neutral-800/30">
                  <div className="flex items-center gap-3">
                    <Truck className="text-blue-500" size={20} />
                    <h3 className="text-lg font-bold">AI Recommended Logistics</h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 tracking-widest">Live Optimization</span>
                </div>
                {!optimization?.rebalancing_schedule.length ? (
                  <div className="p-20 text-center"><Activity className="mx-auto text-neutral-700 mb-4" size={48} /><p className="text-neutral-500 font-medium">Network stable. No rebalancing needed.</p></div>
                ) : (
                  <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-neutral-900/30 text-neutral-500 font-bold uppercase text-[10px] tracking-widest"><tr><th className="px-8 py-4 text-left">Operation</th><th className="px-8 py-4 text-left">Source</th><th className="px-8 py-4 text-left">Destination</th><th className="px-8 py-4 text-right">Allocation</th></tr></thead><tbody className="divide-y divide-neutral-700/30">{optimization.rebalancing_schedule.map((r, i) => (
                    <tr key={i} className="hover:bg-neutral-700/20 group transition-colors"><td className="px-8 py-5"><span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${r.action.includes('REFILL') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>{r.action.replace('_', ' ')}</span></td><td className="px-8 py-5 font-medium text-neutral-300">{r.source === 'CENTRAL_VAULT' ? 'Main Vault' : `ATM #${r.source}`}</td><td className="px-8 py-5 font-medium text-neutral-300">ATM #{r.destination}</td><td className="px-8 py-5 text-right font-mono text-white font-bold">₹{r.amount.toLocaleString()}</td></tr>
                  ))}</tbody></table></div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'network' && (
            <motion.div key="network" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-8 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-8">
                  <Database className="text-blue-500" size={20} />
                  <h3 className="text-lg font-bold">ATM Network Topography</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {optimization?.network_status.map((atm) => (
                    <motion.button key={atm.atm_id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => openATMDetail(atm.atm_id)} className="bg-neutral-900/50 border border-neutral-700/50 hover:border-blue-500/50 rounded-2xl p-5 text-left transition-all shadow-lg group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-10 transition-opacity"><Activity size={40} /></div>
                      <div className="flex justify-between items-start mb-4 relative z-10"><span className="text-xs font-black text-neutral-400 uppercase tracking-tighter">Unit #{atm.atm_id}</span><div className={`h-2 w-2 rounded-full ${atm.status === 'OK' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} /></div>
                      <p className="text-xl font-black text-white mb-1 relative z-10">₹{(atm.net_flow / 1000).toFixed(0)}K</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">Analyze Status →</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedATM !== null && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md" onClick={closeATMDetail} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-neutral-900 border border-neutral-700/50 rounded-[32px] shadow-2xl max-w-5xl w-full max-h-full overflow-hidden flex flex-col">
                {loadingDetail ? (
                  <div className="p-20 text-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-neutral-500 animate-pulse">Synchronizing Data...</p></div>
                ) : atmDetail && (
                  <>
                    <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
                      <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">ATM Intelligence Report</p>
                        <h2 className="text-3xl font-black text-white">Unit #{atmDetail.atm_id} <span className="text-neutral-600 px-2">|</span> <span className="text-neutral-400 text-lg font-bold">{atmDetail.location_type}</span></h2>
                      </div>
                      <button onClick={closeATMDetail} className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl transition-colors"><X size={24} /></button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        {[
                          { l: 'Daily Net flow', v: `₹${(atmDetail.current_net_flow / 1000).toFixed(1)}K`, c: 'text-blue-400' },
                          { l: '30D Burn Rate', v: `₹${(atmDetail.avg_daily_flow / 1000).toFixed(1)}K`, c: 'text-purple-400' },
                          { l: 'Monthly Volume', v: `₹${(atmDetail.total_30d_volume / 100000).toFixed(1)}L`, c: 'text-emerald-400' }
                        ].map((s, i) => (
                          <div key={i} className="bg-neutral-800/30 border border-neutral-700/50 p-6 rounded-[24px]">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">{s.l}</p>
                            <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-3">
                          <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-6">30-Day Cash Trajectory</h4>
                          <div className="h-64 bg-neutral-950/30 border border-neutral-800 rounded-[24px] p-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={atmDetail.transaction_history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }} minTickGap={50} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#444' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                                <Line type="monotone" dataKey="withdrawals" stroke="#ef4444" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="deposits" stroke="#10b981" strokeWidth={3} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="lg:col-span-2">
                          <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-6">Recent Log Events</h4>
                          <div className="space-y-3">
                            {atmDetail.refill_history.map((e: any, i: number) => (
                              <div key={i} className="bg-neutral-800/30 p-4 rounded-2xl flex justify-between items-center border border-neutral-700/10 hover:border-neutral-700/50 transition-colors">
                                <div><p className="text-white font-bold text-sm">₹{e.amount.toLocaleString()}</p><p className="text-[10px] text-neutral-500 font-bold uppercase">{e.date}</p></div>
                                <span className="text-[9px] font-black uppercase px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">{e.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </div>
  );
}
