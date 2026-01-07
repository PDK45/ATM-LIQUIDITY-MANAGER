'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Truck, Database, Settings, AlertTriangle, Zap,
  History, TrendingUp, Activity, X, Wallet, ShieldCheck, HeartPulse,
  TrendingDown, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// Groww-inspired Color Palette
const COLORS = {
  primary: '#00d09c', // Groww Green
  secondary: '#5367ff', // Groww Blue
  background: '#0b0d10',
  surface: '#12151a',
  surfaceLight: '#1c222b',
  text: '#ffffff',
  textMuted: '#8b949e',
  danger: '#eb5b5b',
  warning: '#ffb33e',
  accent_1: '#00d09c',
  accent_2: '#5367ff',
  accent_3: '#ffb33e'
};

const PIE_COLORS = ['#00d09c', '#5367ff', '#ffb33e'];

// Types
interface Config {
  risk_tolerance: string;
}

interface NetworkStatus {
  date: string;
  total_cash_flow: number;
  network_status: string;
  atms_online: number;
  chart_data: { date: string; net_flow: number }[];
  config: Config;
}

interface ATMDetail {
  atm_id: number;
  location_type: string;
  status: string;
  health: number;
  current_net_flow: number;
  avg_daily_flow: number;
  total_30d_volume: number;
  total_revenue: number;
  total_cost: number;
  roi: number;
  denom_mix: { name: string; value: number }[];
  transaction_history: any[];
  financial_history: any[];
  refill_history: any[];
}

export default function Home() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [optimization, setOptimization] = useState<any | null>(null);
  const [selectedATM, setSelectedATM] = useState<number | null>(null);
  const [atmDetail, setATMDetail] = useState<ATMDetail | null>(null);
  const [modalTab, setModalTab] = useState<'liquidity' | 'financials' | 'health'>('liquidity');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'network'>('overview');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const statusRes = await fetch('http://localhost:8000/network-status');
      if (!statusRes.ok) throw new Error('Backend Offline');
      const statusData = await statusRes.json();
      setStatus(statusData);

      const predictRes = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const predictData = await predictRes.json();
      setOptimization(predictData);
      setError('');
    } catch (err) {
      setError('System Connection Lost');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !processing) {
      interval = setInterval(async () => {
        setProcessing(true);
        await fetch('http://localhost:8000/simulate/advance', { method: 'POST' });
        await fetchData();
        setProcessing(false);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, processing]);

  const openATMDetail = async (id: number) => {
    setSelectedATM(id);
    setLoadingDetail(true);
    setModalTab('liquidity');
    try {
      const res = await fetch(`http://localhost:8000/atm/${id}`);
      const data = await res.json();
      setATMDetail(data);
    } finally { setLoadingDetail(false); }
  };

  const closeATMDetail = () => { setSelectedATM(null); setATMDetail(null); };

  const formatCurrency = (val: number) => `₹${(val / 1000).toFixed(0)}K`;
  const formatLakhs = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#ffffff] font-sans selection:bg-[#00d09c]/30">

      {/* Groww Header */}
      <header className="fixed top-0 w-full z-50 border-b border-[#ffffff10] bg-[#0b0d10]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
              <div className="bg-[#00d09c] h-7 w-7 rounded-md flex items-center justify-center font-black text-[#0b0d10]">C</div>
              <span className="text-xl font-bold tracking-tight">CashCycle</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'overview', label: 'Monitor', icon: <LayoutDashboard size={18} /> },
                { id: 'logistics', label: 'Logistics', icon: <Truck size={18} /> },
                { id: 'network', label: 'Network', icon: <Database size={18} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab.id ? 'text-[#00d09c]' : 'text-[#8b949e] hover:text-white'
                    }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="nav-pill" className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-[#00d09c]" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {status && (
              <div className="hidden lg:flex items-center gap-3 bg-[#12151a] px-3 py-1.5 rounded-full border border-[#ffffff08]">
                <Activity size={14} className="text-[#00d09c]" />
                <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">{status.date}</span>
              </div>
            )}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${isPlaying
                ? 'bg-[#1c222b] text-white'
                : 'bg-[#00d09c] text-[#0b0d10] hover:shadow-[0_0_20px_#00d09c40]'
                }`}
            >
              {isPlaying ? <><span className="w-2 h-2 rounded-full bg-[#00d09c] animate-pulse" /> LIVE</> : 'GO LIVE'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#12151a] p-6 rounded-2xl border border-[#ffffff08] hover:border-[#ffffff15] transition-all">
                  <p className="text-[#8b949e] text-xs font-bold uppercase tracking-widest mb-1">Total Liquidity</p>
                  <div className="flex items-end gap-2">
                    <h2 className="text-2xl font-black">{status ? formatLakhs(status.total_cash_flow) : '---'}</h2>
                    {status && <span className={`text-[10px] font-bold mb-1 ${status.total_cash_flow > 0 ? 'text-[#00d09c]' : 'text-[#eb5b5b]'}`}>
                      {status.total_cash_flow > 0 ? <ArrowUpRight size={14} className="inline" /> : <ArrowDownRight size={14} className="inline" />} 2.4%
                    </span>}
                  </div>
                </div>
                <div className="bg-[#12151a] p-6 rounded-2xl border border-[#ffffff08]">
                  <p className="text-[#8b949e] text-xs font-bold uppercase tracking-widest mb-1">Daily Burn</p>
                  <h2 className="text-2xl font-black text-[#5367ff]">₹4.2L</h2>
                </div>
                <div className="bg-[#12151a] p-6 rounded-2xl border border-[#ffffff08]">
                  <p className="text-[#8b949e] text-xs font-bold uppercase tracking-widest mb-1">Active Units</p>
                  <h2 className="text-2xl font-black text-white">{status?.atms_online || 0} / 5</h2>
                </div>
                <div className="bg-[#12151a] p-6 rounded-2xl border border-[#ffffff08]">
                  <p className="text-[#8b949e] text-xs font-bold uppercase tracking-widest mb-1">System Health</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-[#00d09c]">98.2%</h2>
                    <ShieldCheck size={18} className="text-[#00d09c]" />
                  </div>
                </div>
              </div>

              {/* Main Chart Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#12151a] rounded-[24px] p-8 border border-[#ffffff08] relative overflow-hidden">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-lg font-bold">Cash Flow Intelligence</h3>
                      <p className="text-xs text-[#8b949e]">30-Day performance history of the entire network</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-[#8b949e] bg-[#1c222b] px-3 py-1 rounded-full uppercase tracking-widest">Historical Data</span>
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={status?.chart_data}>
                        <defs>
                          <linearGradient id="glowFlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00d09c" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#00d09c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="0" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1c222b', border: 'none', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#00d09c' }}
                        />
                        <Area type="monotone" dataKey="net_flow" stroke="#00d09c" fill="url(#glowFlow)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#12151a] rounded-[24px] p-6 border border-[#ffffff08]">
                    <h3 className="text-[#8b949e] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Risk Profile</h3>
                    <div className="space-y-2">
                      {['conservative', 'moderate', 'aggressive'].map((l) => (
                        <button
                          key={l}
                          onClick={async () => {
                            setProcessing(true);
                            await fetch('http://localhost:8000/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ risk_tolerance: l })
                            });
                            await fetchData();
                            setProcessing(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border transition-all ${status?.config.risk_tolerance === l ? 'bg-[#00d09c0a] border-[#00d09c40] text-white shadow-[0_0_30px_#00d09c05]' : 'bg-[#0b0d10] border-[#ffffff08] text-[#8b949e]'}`}
                        >
                          <span className="capitalize text-sm font-black">{l}</span>
                          {status?.config.risk_tolerance === l && <div className="h-2 w-2 rounded-full bg-[#00d09c] ring-4 ring-[#00d09c20]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#5367ff10] rounded-[24px] p-6 border border-[#5367ff20]">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#5367ff] p-3 rounded-2xl"><Zap size={20} fill="white" /></div>
                      <div>
                        <h4 className="text-sm font-black">AI Auto-Pilot</h4>
                        <p className="text-[10px] text-[#5367ff] font-bold uppercase tracking-widest mt-1">Optimization Active</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Control Center */}
              <div className="bg-[#12151a] rounded-[32px] p-8 border border-[#ffffff08] relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-black mb-1">Scenario Simulator</h3>
                    <p className="text-sm text-[#8b949e]">Inject real-world stressors into the network to test AI resilience</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { id: 'FESTIVAL', label: 'Festival Surge', icon: <Zap size={18} />, color: '#00d09c', desc: 'Withdrawal spike' },
                    { id: 'STORM', label: 'Natural Storm', icon: <TrendingDown size={18} />, color: '#5367ff', desc: 'Activity drop' },
                    { id: 'SALARY_WEEK', label: 'Salary Week', icon: <Wallet size={18} />, color: '#ffb33e', desc: 'High demand' },
                    { id: 'SYSTEM_FAILURE', label: 'System Crash', icon: <AlertTriangle size={18} />, color: '#eb5b5b', desc: 'Mechanical failure' },
                    { id: 'UNREST', label: 'Social Unrest', icon: <ShieldCheck size={18} />, color: '#8b949e', desc: 'Network freeze' }
                  ].map((evt) => (
                    <button
                      key={evt.id}
                      onClick={async () => {
                        await fetch('http://localhost:8000/simulate/event', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: evt.id })
                        });
                        alert(`Scenario queued: ${evt.label}`);
                      }}
                      className="group bg-[#1c222b] border border-[#ffffff08] hover:border-[#ffffff15] rounded-2xl p-5 text-left transition-all hover:translate-y-[-4px]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div style={{ color: evt.color }} className="bg-[#ffffff05] p-2 rounded-xl group-hover:scale-110 transition-transform">{evt.icon}</div>
                        <div className="h-1.5 w-1.5 rounded-full bg-[#ffffff10]" />
                      </div>
                      <p className="text-sm font-black text-white mb-1">{evt.label}</p>
                      <p className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider">{evt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logistics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-[#12151a] rounded-[32px] border border-[#ffffff08] overflow-hidden shadow-2xl">
                <div className="px-10 py-8 border-b border-[#ffffff08] flex justify-between items-center bg-[#ffffff02]">
                  <div>
                    <h3 className="text-xl font-black mb-1">Logistics & Rebalancing</h3>
                    <p className="text-xs text-[#8b949e]">Recommended actions to prevent stockouts and minimize costs</p>
                  </div>
                  <button onClick={fetchData} className="p-3 bg-[#1c222b] hover:bg-[#252c38] rounded-2xl transition-all"><History size={20} /></button>
                </div>

                {!optimization?.rebalancing_schedule.length ? (
                  <div className="py-24 text-center">
                    <ShieldCheck size={64} className="mx-auto text-[#00d09c20] mb-4" />
                    <p className="text-lg font-bold">Network Perfectly Balanced</p>
                    <p className="text-[#8b949e] text-sm mt-1">AI optimization predicts zero risk for the next 24 hours</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-[#8b949e] font-black uppercase text-[10px] tracking-[0.2em] bg-[#ffffff02]">
                        <tr>
                          <th className="px-10 py-5 text-left font-black">Operation</th>
                          <th className="px-10 py-5 text-left font-black">From Source</th>
                          <th className="px-10 py-5 text-left font-black">Target Destination</th>
                          <th className="px-10 py-5 text-right font-black text-[#00d09c]">Allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ffffff04]">
                        {optimization.rebalancing_schedule.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-[#ffffff02] transition-colors group">
                            <td className="px-10 py-6">
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${r.action.includes('REFILL')
                                ? 'bg-[#ffb33e15] text-[#ffb33e] border border-[#ffb33e20]'
                                : 'bg-[#5367ff15] text-[#5367ff] border border-[#5367ff20]'
                                }`}>
                                {r.action.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-10 py-6 font-bold text-[#e1e4e8]">
                              {r.source === 'CENTRAL_VAULT' ? 'Central Reserve' : `Unit #${r.source}`}
                            </td>
                            <td className="px-10 py-6 font-bold text-[#e1e4e8]">Terminal #{r.destination}</td>
                            <td className="px-10 py-6 text-right font-black text-white text-lg">
                              ₹{(r.amount / 1000).toFixed(0)}<span className="text-[#8b949e] ml-0.5">K</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'network' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="network" className="space-y-6">
              <div className="bg-[#12151a] rounded-[32px] p-10 border border-[#ffffff08]">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <h3 className="text-2xl font-black mb-1">Terminal Network</h3>
                    <p className="text-sm text-[#8b949e]">Real-time status of individual ATM units</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#00d09c]" /> <span className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest">Stable</span></div>
                    <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#ffb33e]" /> <span className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest">Caution</span></div>
                    <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#eb5b5b]" /> <span className="text-[10px] font-black text-[#8b949e] uppercase tracking-widest">Critical</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {optimization?.network_status.map((atm: any) => (
                    <motion.button
                      key={atm.atm_id}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openATMDetail(atm.atm_id)}
                      className="bg-[#1c222b] border border-[#ffffff08] hover:border-[#00d09c50] rounded-[24px] p-6 text-left transition-all shadow-xl group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Database size={40} /></div>
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.2em]">UNIT_{atm.atm_id}</span>
                        <div className={`h-2.5 w-2.5 rounded-full ${atm.status === 'OK' ? 'bg-[#00d09c] shadow-[0_0_15px_#00d09c60]' : 'bg-[#ffb33e] shadow-[0_0_15px_#ffb33e60]'}`} />
                      </div>
                      <p className="text-2xl font-black text-white mb-1">{formatCurrency(atm.net_flow)}</p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-[#8b949e] font-black uppercase">Analyze</span>
                        <div className="bg-[#00d09c15] p-1.5 rounded-lg text-[#00d09c] group-hover:px-4 transition-all"><ArrowUpRight size={14} /></div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Groww-style Fullscreen Modal */}
        <AnimatePresence>
          {selectedATM !== null && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0b0d10]/95 backdrop-blur-xl" onClick={closeATMDetail} />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                className="relative bg-[#0b0d10] border border-[#ffffff08] rounded-[40px] shadow-2xl max-w-6xl w-full max-h-full overflow-hidden flex flex-col"
              >
                {loadingDetail ? (
                  <div className="p-40 text-center">
                    <div className="w-12 h-12 border-4 border-[#00d09c] border-t-transparent rounded-full animate-spin mx-auto mb-8" />
                    <p className="text-[#8b949e] font-black uppercase tracking-[0.3em]">Synching Quantum Data...</p>
                  </div>
                ) : atmDetail && (
                  <>
                    {/* Modal Header */}
                    <div className="p-10 border-b border-[#ffffff08] flex justify-between items-end">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-[#00d09c15] text-[#00d09c] text-[10px] font-black px-3 py-1 rounded-full border border-[#00d09c20] tracking-[0.2em]">{atmDetail.status.toUpperCase()}</span>
                          <span className="bg-[#5367ff15] text-[#5367ff] text-[10px] font-black px-3 py-1 rounded-full border border-[#5367ff20] tracking-[0.2em]">{atmDetail.location_type.toUpperCase()}</span>
                        </div>
                        <h2 className="text-4xl font-black">Terminal Hub #{atmDetail.atm_id}</h2>
                      </div>
                      <button onClick={closeATMDetail} className="p-4 bg-[#1c222b] hover:bg-[#eb5b5b20] hover:text-[#eb5b5b] rounded-2xl transition-all"><X size={28} /></button>
                    </div>

                    {/* Tabs inside Modal */}
                    <div className="px-10 mt-6 flex gap-8">
                      {[
                        { id: 'liquidity', label: 'Liquidity & Mix', icon: <Wallet size={16} /> },
                        { id: 'financials', label: 'Yield & ROI', icon: <TrendingUp size={16} /> },
                        { id: 'health', label: 'Core Diagnostics', icon: <HeartPulse size={16} /> }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setModalTab(t.id as any)}
                          className={`flex items-center gap-2 pb-4 text-sm font-black transition-all border-b-2 ${modalTab === t.id ? 'border-[#00d09c] text-white' : 'border-transparent text-[#8b949e] hover:text-white'
                            }`}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                      <AnimatePresence mode="wait">
                        {modalTab === 'liquidity' && (
                          <motion.div key="liq" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10">
                            {/* Liquidity Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-[#12151a] p-8 rounded-[32px] border border-[#ffffff08]">
                                <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-widest mb-2">Net Flow</p>
                                <p className="text-3xl font-black">{formatCurrency(atmDetail.current_net_flow)}</p>
                              </div>
                              <div className="bg-[#12151a] p-8 rounded-[32px] border border-[#ffffff08]">
                                <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-widest mb-2">Avg Daily</p>
                                <p className="text-3xl font-black">{formatCurrency(atmDetail.avg_daily_flow)}</p>
                              </div>
                              <div className="bg-[#12151a] p-8 rounded-[32px] border border-[#ffffff08]">
                                <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-widest mb-2">30D Volume</p>
                                <p className="text-3xl font-black">{formatLakhs(atmDetail.total_30d_volume)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                              <div className="lg:col-span-3">
                                <h4 className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><TrendingUp size={14} /> Transaction Trajectory</h4>
                                <div className="h-72 bg-[#12151a] rounded-[32px] p-8 border border-[#ffffff08]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={atmDetail.transaction_history}>
                                      <CartesianGrid strokeDasharray="0" stroke="#ffffff05" vertical={false} />
                                      <XAxis dataKey="date" hide />
                                      <YAxis hide />
                                      <Tooltip contentStyle={{ backgroundColor: '#1c222b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                                      <Line type="monotone" dataKey="withdrawals" stroke="#eb5b5b" strokeWidth={4} dot={false} />
                                      <Line type="monotone" dataKey="deposits" stroke="#00d09c" strokeWidth={4} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                              <div className="lg:col-span-2">
                                <h4 className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Info size={14} /> Denomination Mix</h4>
                                <div className="h-72 bg-[#12151a] rounded-[32px] p-6 border border-[#ffffff08] flex items-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie data={atmDetail.denom_mix} innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value">
                                        {atmDetail.denom_mix.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                                        ))}
                                      </Pie>
                                      <Tooltip contentStyle={{ backgroundColor: '#1c222b', border: 'none', borderRadius: '12px' }} />
                                      <Legend verticalAlign="bottom" iconType="circle" />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {modalTab === 'financials' && (
                          <motion.div key="fin" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-[#12151a] p-8 rounded-[32px] border border-[#ffffff08]">
                                <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-widest mb-2">Total Yield</p>
                                <p className="text-3xl font-black text-[#00d09c]">{formatCurrency(atmDetail.total_revenue)}</p>
                              </div>
                              <div className="bg-[#12151a] p-8 rounded-[32px] border border-[#ffffff08]">
                                <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-widest mb-2">OPEX Efficiency</p>
                                <p className="text-3xl font-black text-[#eb5b5b]">{formatCurrency(atmDetail.total_cost)}</p>
                              </div>
                              <div className="bg-[#00d09c10] p-8 rounded-[32px] border border-[#00d09c20]">
                                <p className="text-[#00d09c] text-[10px] font-black uppercase tracking-widest mb-2">Return on Asset</p>
                                <p className="text-3xl font-black text-white">{atmDetail.roi}%</p>
                              </div>
                            </div>

                            <div className="bg-[#12151a] rounded-[32px] p-8 border border-[#ffffff08]">
                              <h4 className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.2em] mb-8">Yield vs Maintenance (30D)</h4>
                              <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={atmDetail.financial_history}>
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#1c222b', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                                    <Bar dataKey="revenue" fill="#00d09c" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" fill="#eb5b5b40" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {modalTab === 'health' && (
                          <motion.div key="health" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10">
                            <div className="flex items-center gap-10">
                              <div className="relative h-40 w-40 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-8 border-[#ffffff05]" />
                                <div className="absolute inset-0 rounded-full border-8 border-[#00d09c] border-t-transparent animate-[spin_3s_linear_infinite]" />
                                <div className="text-center">
                                  <p className="text-4xl font-black">{atmDetail.health}%</p>
                                  <p className="text-[8px] font-black text-[#8b949e] uppercase tracking-widest mt-1">CORE HEALTH</p>
                                </div>
                              </div>
                              <div className="flex-1 space-y-6">
                                <div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2"><span className="text-[#8b949e]">Dispenser Accuracy</span><span className="text-white">99.8%</span></div>
                                  <div className="h-1.5 w-full bg-[#1c222b] rounded-full overflow-hidden"><div className="h-full bg-[#00d09c] w-[99.8%]" /></div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2"><span className="text-[#8b949e]">Thermal Paper Level</span><span className="text-[#ffb33e]">42%</span></div>
                                  <div className="h-1.5 w-full bg-[#1c222b] rounded-full overflow-hidden"><div className="h-full bg-[#ffb33e] w-[42%]" /></div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2"><span className="text-[#8b949e]">Cooling System</span><span className="text-white">Normal</span></div>
                                  <div className="h-1.5 w-full bg-[#1c222b] rounded-full overflow-hidden"><div className="h-full bg-[#5367ff] w-[85%]" /></div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#ffb33e05] p-8 rounded-[32px] border border-[#ffb33e10]">
                              <div className="flex gap-4 items-start">
                                <AlertTriangle className="text-[#ffb33e] shrink-0" size={24} />
                                <div>
                                  <h5 className="font-bold text-[#ffb33e]">Predictive Maintenance Alert</h5>
                                  <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">Our AI predicts a potential paper jam risk within the next 48 hours based on current dispenser friction patterns. Scheduling proactive inspection for tomorrow's refill cycle.</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1c222b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #252c38; }
        
        [data-recharts-chart] .recharts-cartesian-grid-horizontal line {
           stroke-opacity: 0.1;
        }
      `}</style>
    </div>
  );
}
