/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import Markdown from 'react-markdown';
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  ExternalLink, 
  RefreshCw, 
  Database, 
  Filter,
  ChevronRight,
  ChevronDown,
  Palette,
  Info,
  LayoutGrid,
  List,
  ArrowUpDown,
  BarChart2,
  PieChart as PieChartIcon,
  Swords,
  Globe,
  Zap,
  Target,
  Layers,
  MapPin,
  Clock,
  Maximize2,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  COMPANIES, 
  TimeRange, 
  CompanyData, 
  GlobalEvent,
  LinkedInPost,
  fetchCompanyComparison, 
  fetchCompetitiveDuel, 
  fetchMarketForecast,
  fetchGlobalEvents,
  fetchTopLinkedInPosts
} from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// World Map Component
const WorldMap = ({ companies, theme, themeMode }: { companies: any[], theme: string, themeMode: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 400;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3.geoNaturalEarth1()
      .scale(150)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Fetch world map data
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((data: any) => {
      const countries = (topojson as any).feature(data, data.objects.countries);

      svg.append("g")
        .selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path as any)
        .attr("fill", "var(--line)")
        .attr("stroke", "var(--ink)")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.3);

      // Add markers for companies
      companies.forEach((company) => {
        if (company.coordinates) {
          const [lat, lng] = company.coordinates;
          const coords = projection([lng, lat]);
          if (coords) {
            const g = svg.append("g")
              .attr("transform", `translate(${coords[0]}, ${coords[1]})`);

            g.append("circle")
              .attr("r", 4)
              .attr("fill", "var(--accent)")
              .attr("stroke", "var(--bg)")
              .attr("stroke-width", 1)
              .style("cursor", "pointer")
              .append("title")
              .text(`${company.name}\n${company.headquarters}`);

            g.append("text")
              .attr("dy", -8)
              .attr("text-anchor", "middle")
              .attr("font-size", "7px")
              .attr("font-weight", "bold")
              .attr("fill", "var(--ink)")
              .text(company.name);
          }
        }
      });
    });
  }, [companies, theme, themeMode]);

  return (
    <div className="relative w-full overflow-hidden flex justify-center bg-current/5 rounded-sm p-4">
      <svg ref={svgRef} width="800" height="400" viewBox="0 0 800 400" className="max-w-full h-auto" />
    </div>
  );
};

export default function App() {
  const [timeRange, setTimeRange] = useState<TimeRange>('year');
  const [data, setData] = useState<Record<string, CompanyData>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'matrix' | 'feed' | 'stats' | 'duel' | 'forecast' | 'bento' | 'events'>('matrix');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [globalLastSync, setGlobalLastSync] = useState<number | null>(null);
  
  // Duel State
  const [duelCompanies, setDuelCompanies] = useState<[string, string]>(['Percona', 'EnterpriseDB (EDB)']);
  const [duelAnalysis, setDuelAnalysis] = useState<string | null>(null);
  const [duelLoading, setDuelLoading] = useState(false);

  // Forecast State
  const [marketForecast, setMarketForecast] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeMode, setThemeMode] = useState<'classic' | 'midnight' | 'nordic' | 'cyberpunk' | 'brutalist' | 'forest'>('classic');

  const handleThemeModeChange = (mode: typeof themeMode) => {
    setThemeMode(mode);
    // Lock modes to specific themes
    if (['midnight', 'nordic', 'cyberpunk'].includes(mode)) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', themeMode);
  }, [theme, themeMode]);

  // LocalStorage Caching for initial load
  useEffect(() => {
    const cachedData = localStorage.getItem('radar_data');
    const cachedEvents = localStorage.getItem('radar_events');
    const cachedLinkedIn = localStorage.getItem('radar_linkedin');
    const cachedTheme = localStorage.getItem('radar_theme') as 'light' | 'dark';
    const cachedThemeMode = localStorage.getItem('radar_theme_mode') as typeof themeMode;

    if (cachedData) setData(JSON.parse(cachedData));
    if (cachedEvents) setGlobalEvents(JSON.parse(cachedEvents));
    if (cachedLinkedIn) setTopLinkedInPosts(JSON.parse(cachedLinkedIn));
    if (cachedTheme) setTheme(cachedTheme);
    if (cachedThemeMode) setThemeMode(cachedThemeMode);
  }, []);

  useEffect(() => {
    localStorage.setItem('radar_theme', theme);
    localStorage.setItem('radar_theme_mode', themeMode);
  }, [theme, themeMode]);

  // Events State
  const [globalEvents, setGlobalEvents] = useState<GlobalEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [selectedEventSponsors, setSelectedEventSponsors] = useState<GlobalEvent['sponsors'] | null>(null);

  // LinkedIn State
  const [topLinkedInPosts, setTopLinkedInPosts] = useState<LinkedInPost[]>([]);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);

  // Full Screen Chart State
  const [fullScreenChart, setFullScreenChart] = useState<string | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const fetchEvents = async (force = false) => {
    setIsEventsLoading(true);
    try {
      if (!force) {
        const res = await fetch('/api/events');
        if (res.ok) {
          const cached = await res.json();
          const isFresh = Date.now() - cached.updatedAt < 30 * 24 * 60 * 60 * 1000;
          const hasSponsors = cached.events.some((e: any) => e.sponsors && e.sponsors.length > 0);
          
          if (isFresh && hasSponsors) {
            const sorted = cached.events.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setGlobalEvents(sorted);
            setIsEventsLoading(false);
            return;
          }
        }
      }
      const events = await fetchGlobalEvents();
      const sorted = events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setGlobalEvents(sorted);
      localStorage.setItem('radar_events', JSON.stringify(sorted));
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: sorted })
      });
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsEventsLoading(false);
    }
  };

  const fetchLinkedIn = async (force = false) => {
    setIsLinkedInLoading(true);
    try {
      if (!force) {
        const res = await fetch('/api/linkedin');
        if (res.ok) {
          const cached = await res.json();
          const isFresh = Date.now() - cached.updatedAt < 30 * 24 * 60 * 60 * 1000;
          if (isFresh) {
            setTopLinkedInPosts(cached.posts);
            setIsLinkedInLoading(false);
            return;
          }
        }
      }
      const posts = await fetchTopLinkedInPosts();
      setTopLinkedInPosts(posts);
      localStorage.setItem('radar_linkedin', JSON.stringify(posts));
      await fetch('/api/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts })
      });
    } catch (error) {
      console.error("Error fetching LinkedIn posts:", error);
    } finally {
      setIsLinkedInLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchLinkedIn();
  }, []);

  const svgRef = React.useRef<SVGSVGElement>(null); // For d3 if needed elsewhere

  const CACHE_TTL_30D = 30 * 24 * 60 * 60 * 1000;
  const CACHE_TTL_1Y = 365 * 24 * 60 * 60 * 1000;

  const getTTL = (range: TimeRange) => {
    if (range === '5years') return CACHE_TTL_1Y;
    return CACHE_TTL_30D;
  };

  const fetchAllData = async (forceRefresh = false) => {
    try {
      // 1. Try to get cached data from backend
      const response = await fetch(`/api/companies?range=${timeRange}`);
      const cachedRows = await response.json();
      
      const initialData: Record<string, CompanyData> = {};
      const initialUpdated: Record<string, number> = {};
      
      cachedRows.forEach((row: any) => {
        initialData[row.name] = row.data;
        initialUpdated[row.name] = row.updatedAt;
      });

      setData(initialData);
      setLastUpdated(initialUpdated);

      const currentTTL = getTTL(timeRange);

      // 2. Identify which companies need a refresh
      for (const company of COMPANIES) {
        const isStale = !initialUpdated[company] || (Date.now() - initialUpdated[company] > currentTTL);
        
        if (isStale || forceRefresh) {
          if (loading[company]) continue;
          
          setLoading(prev => ({ ...prev, [company]: true }));
          
          // Add a small delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const result = await fetchCompanyComparison(company, timeRange);
          
          if (result) {
            const companyData = { ...result, name: company } as CompanyData;
            
            // Update local state
            setData(prev => {
              const newData = { ...prev, [company]: companyData };
              localStorage.setItem('radar_data', JSON.stringify(newData));
              return newData;
            });
            setLastUpdated(prev => ({ ...prev, [company]: Date.now() }));

            // Persist to backend
            await fetch('/api/companies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: company,
                range: timeRange,
                data: companyData
              })
            });
          }
          setLoading(prev => ({ ...prev, [company]: false }));
        }
      }
    } catch (error) {
      console.error("Error syncing with cache:", error);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Background refresh every hour to keep data fresh for long-running sessions
    const interval = setInterval(() => {
      console.log("Triggering scheduled background refresh...");
      fetchAllData();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [timeRange]);

  useEffect(() => {
    const latest = Math.max(...Object.values(lastUpdated), 0);
    if (latest > 0) setGlobalLastSync(latest);
  }, [lastUpdated]);

  const filteredCompanies = useMemo(() => {
    return COMPANIES.filter(c => 
      c.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data[c]?.focus?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, data]);

  const globalFeed = useMemo(() => {
    const allNews: (CompanyData['recentNews'][0] & { company: string })[] = [];
    Object.entries(data).forEach(([company, companyData]) => {
      companyData.recentNews?.forEach(news => {
        allNews.push({ ...news, company });
      });
    });
    
    return allNews
      .filter(news => 
        news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.company.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      });
  }, [data, searchQuery]);

  const stats = useMemo(() => {
    const focusCounts: Record<string, number> = {};
    Object.values(data).forEach(d => {
      let focus = d.focus?.split(',')[0] || 'General Support';
      if (focus.toLowerCase() === 'unknown') focus = 'General Support';
      focusCounts[focus] = (focusCounts[focus] || 0) + 1;
    });
    return Object.entries(focusCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [data]);

  const runDuel = async () => {
    if (!data[duelCompanies[0]] || !data[duelCompanies[1]]) return;
    setDuelLoading(true);
    
    try {
      // 1. Check cache first
      const cacheRes = await fetch(`/api/duel?a=${duelCompanies[0]}&b=${duelCompanies[1]}`);
      let cachedData = null;
      if (cacheRes.ok) {
        cachedData = await cacheRes.json();
        const isFresh = Date.now() - cachedData.updatedAt < 30 * 24 * 60 * 60 * 1000;
        if (isFresh) {
          setDuelAnalysis(cachedData.analysis);
          setDuelLoading(false);
          return;
        }
      }

      // 2. Fetch from Gemini
      const analysis = await fetchCompetitiveDuel(
        duelCompanies[0], 
        duelCompanies[1], 
        data[duelCompanies[0]], 
        data[duelCompanies[1]]
      );
      
      if (analysis && analysis !== "Failed to generate analysis.") {
        setDuelAnalysis(analysis);
        // Save to cache
        await fetch('/api/duel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            a: duelCompanies[0],
            b: duelCompanies[1],
            analysis
          })
        });
      } else if (cachedData) {
        // Fallback to stale cache if Gemini fails (e.g. quota exceeded)
        console.warn("Gemini analysis failed, falling back to stale cache.");
        setDuelAnalysis(cachedData.analysis);
      } else {
        setDuelAnalysis(analysis || "Failed to generate analysis.");
      }
    } catch (error) {
      console.error("Duel error:", error);
      setDuelAnalysis("An error occurred during analysis.");
    } finally {
      setDuelLoading(false);
    }
  };

  const runForecast = async () => {
    if (Object.keys(data).length < 5) return;
    setForecastLoading(true);
    try {
      // 1. Check cache first
      const cacheRes = await fetch('/api/forecast');
      let cachedData = null;
      if (cacheRes.ok) {
        cachedData = await cacheRes.json();
        const isFresh = Date.now() - cachedData.updatedAt < CACHE_TTL_30D;
        if (isFresh) {
          setMarketForecast(cachedData.forecast);
          setForecastLoading(false);
          return;
        }
      }

      // 2. Fetch from Gemini
      const forecast = await fetchMarketForecast(data);
      
      if (forecast) {
        setMarketForecast(forecast);
        // Save to cache
        await fetch('/api/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forecast })
        });
      } else if (cachedData) {
        // Fallback to stale cache
        console.warn("Forecast generation failed, falling back to stale cache.");
        setMarketForecast(cachedData.forecast);
      } else {
        setMarketForecast("Failed to generate forecast.");
      }
    } catch (error) {
      console.error("Forecast error:", error);
      setMarketForecast("An error occurred during forecast generation.");
    } finally {
      setForecastLoading(false);
    }
  };

  const bentoGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      "The Cloud Giants": ["Amazon Web Services (RDS/Aurora)", "Google Cloud (AlloyDB/Cloud SQL)", "Microsoft Azure (PostgreSQL)", "Aiven"],
      "The Performance Specialists": ["Percona", "Crunchy Data", "EnterpriseDB (EDB)", "Timescale", "Neon"],
      "The Modern Stack": ["Supabase", "Neon", "Tembo", "Citus Data (Microsoft)"],
      "Enterprise Support": ["Cybertec", "OnGres", "Postgres Professional", "Fujitsu (PostgreSQL)", "NTT DATA (PostgreSQL)", "Instaclustr"]
    };
    return groups;
  }, []);

  const chartData = useMemo(() => {
    const blogCounts = Object.entries(data)
      .map(([name, d]) => ({
        name: name.length > 15 ? name.substring(0, 12) + "..." : name,
        fullName: name,
        count: d.recentNews?.length || 0,
        focus: d.focus?.split(',')[0] || 'General Support'
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const focusDistribution = Object.entries(
      Object.values(data).reduce((acc, d) => {
        d.topics?.forEach(topic => {
          if (topic && topic.toLowerCase() !== 'unknown') {
            acc[topic] = (acc[topic] || 0) + 1;
          }
        });
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

    const regionalData = Object.entries(
      Object.values(data).reduce((acc, d) => {
        d.regions?.forEach(region => {
          acc[region] = (acc[region] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

    const radarData = COMPANIES.slice(0, 5).map(c => ({
      subject: c.length > 10 ? c.substring(0, 8) + "..." : c,
      impact: data[c]?.impactScore || 0,
      content: (data[c]?.recentNews?.length || 0) * 10,
      sentiment: data[c]?.sentiment === 'Positive' ? 90 : (data[c]?.sentiment === 'Neutral' ? 60 : 30),
      full: 100
    }));

    return { blogCounts, focusDistribution, regionalData, radarData };
  }, [data]);

  const getChartColors = () => {
    if (themeMode === 'midnight') {
      return [
        '#D4AF37', // Gold
        '#F27D26', // Orange
        '#C5A028', // Darker Gold
        '#B69119', // Even Darker
        '#A7820A', // Deep Gold
        '#896400', // Brownish Gold
        '#7A5500', // Darker
        '#6B4600', // Darkest
      ];
    }
    if (themeMode === 'nordic') {
      return [
        '#8FBC8F', // Dark Sea Green
        '#5A5A40', // Olive
        '#778899', // Light Slate Grey
        '#B0C4DE', // Light Steel Blue
        '#BC8F8F', // Rosy Brown
        '#D2B48C', // Tan
        '#F4A460', // Sandy Brown
        '#DEB887', // Burly Wood
      ];
    }
    if (theme === 'light') {
      return [
        '#5E81AC', // Deep Blue
        '#81A1C1', // Glacier Blue
        '#88C0D0', // Frost Blue
        '#A3BE8C', // Sage Green
        '#B48EAD', // Muted Purple
        '#D08770', // Soft Orange
        '#EBCB8B', // Soft Yellow
        '#4C566A', // Dark Slate
      ];
    }
    return [
      '#88C0D0', // Frost Blue
      '#A3BE8C', // Sage Green
      '#EBCB8B', // Soft Yellow
      '#D08770', // Soft Orange
      '#B48EAD', // Muted Purple
      '#81A1C1', // Glacier Blue
      '#5E81AC', // Deep Blue
      '#ECEFF4', // Off-white
    ];
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 selection:bg-emerald-500/30",
      themeMode === 'classic' ? "font-sans" : themeMode === 'midnight' ? "font-outfit" : "font-serif",
      "bg-[var(--bg)] text-[var(--ink)]"
    )}>
      {/* Header / Navigation */}
      <header className={cn(
        "border-b sticky top-0 z-50 transition-colors",
        "border-[var(--line)] bg-[var(--bg)]"
      )}>
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 shrink-0">
            <div className={cn(
              "w-10 h-10 flex items-center justify-center rounded-sm transition-colors overflow-hidden",
              "bg-white border border-[var(--line)]"
            )}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg" 
                alt="PostgreSQL Logo" 
                className="w-7 h-7"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-fit">
              <h1 className="font-serif text-xl leading-none whitespace-nowrap">PostgreSQL Ecosystem Radar</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1 whitespace-nowrap">Market Intelligence Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[10px] font-bold tracking-widest uppercase",
                  "border-[var(--line)] hover:bg-[var(--ink)]/5"
                )}
              >
                <Palette className="w-3 h-3" />
                <span>Theme: {themeMode}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isThemeMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isThemeMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsThemeMenuOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute right-0 mt-2 w-56 rounded-xl border shadow-2xl z-50 overflow-hidden py-2",
                        "bg-[var(--bg)] border-[var(--line)]"
                      )}
                    >
                      <div className="px-4 py-2 border-b border-[var(--line)] mb-1">
                        <span className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Visual Themes</span>
                      </div>
                      {(['classic', 'midnight', 'nordic', 'cyberpunk', 'brutalist', 'forest'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            handleThemeModeChange(mode);
                            setIsThemeMenuOpen(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center justify-between",
                            themeMode === mode 
                              ? "bg-[var(--ink)] text-[var(--bg)]" 
                              : "hover:bg-[var(--ink)]/10"
                          )}
                        >
                          {mode}
                          {themeMode === mode && <div className="w-1 h-1 rounded-full bg-current" />}
                        </button>
                      ))}

                      <div className="px-4 py-2 border-t border-b border-[var(--line)] my-1 mt-2">
                        <span className="text-[9px] uppercase tracking-widest opacity-50 font-bold">Color Mode</span>
                      </div>
                      <button
                        onClick={() => {
                          // Allow manual override but warning: some themes might look bad
                          setTheme(theme === 'light' ? 'dark' : 'light');
                          setIsThemeMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-[var(--ink)]/10 flex items-center gap-3"
                      >
                        {theme === 'light' ? (
                          <>
                            <Moon className="w-3 h-3" />
                            <span>Switch to Dark Mode</span>
                          </>
                        ) : (
                          <>
                            <Sun className="w-3 h-3" />
                            <span>Switch to Light Mode</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden xl:flex flex-col items-end mr-4">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full border transition-colors",
                theme === 'light' ? "bg-[#141414]/5 border-[#141414]/10" : "bg-[#E4E3E0]/5 border-[#E4E3E0]/10"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  Object.values(loading).some(Boolean) ? "bg-emerald-500 animate-pulse" : "bg-current opacity-20"
                )} />
                <span className="text-[9px] uppercase tracking-widest opacity-60">
                  {Object.values(loading).some(Boolean) ? "Syncing Market Data" : "Data is Fresh"}
                </span>
              </div>
              {globalLastSync && (
                <span className="text-[8px] uppercase tracking-tighter opacity-30 mt-1">
                  Last Global Sync: {new Date(globalLastSync).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-opacity" />
              <input 
                type="text" 
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "bg-transparent border rounded-full py-2 pl-10 pr-4 text-sm w-48 lg:w-64 focus:outline-none transition-all",
                  theme === 'light' ? "border-[#141414]/20 focus:border-[#141414]" : "border-[#E4E3E0]/20 focus:border-[#E4E3E0]"
                )}
              />
            </div>

            <div className={cn(
              "flex rounded-full p-1 border transition-colors",
              "bg-[var(--ink)]/5 border-[var(--line)]"
            )}>
              {(['month', 'year', '5years'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider transition-all",
                    timeRange === range 
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "hover:bg-current/10 opacity-60 hover:opacity-100"
                  )}
                >
                  {range === '5years' ? '5 Years' : range}
                </button>
              ))}
            </div>

            <button 
              onClick={() => fetchAllData(true)}
              className="p-2 hover:bg-current/5 rounded-full transition-colors"
              title="Force refresh all data"
            >
              <RefreshCw className={cn("w-4 h-4", Object.values(loading).some(Boolean) && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        {/* Market Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className={cn(
            "col-span-1 md:col-span-3 border p-6 flex flex-col justify-between transition-colors relative overflow-hidden",
            "border-[var(--line)] bg-[var(--surface)]"
          )}>
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
              <WorldMap companies={COMPANIES} theme={theme} themeMode={themeMode} />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Market Overview</span>
              <h2 className="font-serif italic text-3xl mb-4">The PostgreSQL Ecosystem is shifting towards AI and Cloud-Native architectures.</h2>
            </div>
            <div className="flex gap-12">
              {stats.map(([focus, count]) => (
                <div key={focus}>
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block">{focus}</span>
                  <span className="text-2xl font-mono">{count} <span className="text-sm opacity-50">Companies</span></span>
                </div>
              ))}
              <div>
                <span className="text-[10px] uppercase tracking-widest opacity-50 block">Active Range</span>
                <span className="text-2xl font-mono uppercase">{timeRange}</span>
              </div>
            </div>
          </div>
          <div className={cn(
            "border p-6 flex flex-col justify-between transition-colors",
            "border-[var(--line)] bg-[var(--ink)] text-[var(--bg)]"
          )}>
            <TrendingUp className="w-8 h-8 opacity-50" />
            <div>
              <p className="text-sm opacity-70 mb-2">Total Companies Tracked</p>
              <p className="text-5xl font-mono">{COMPANIES.length}</p>
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className={cn(
          "flex items-center justify-between mb-6 border-b pb-4 transition-colors",
          "border-[var(--line)]"
        )}>
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('matrix')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'matrix' 
                  ? "border-[var(--ink)] opacity-100" 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Comparison Matrix
            </button>
            <button 
              onClick={() => setActiveTab('feed')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'feed' 
                  ? "border-[var(--ink)] opacity-100" 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Global News Feed
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'stats' 
                  ? (theme === 'light' ? "border-[#141414] opacity-100" : "border-[#E4E3E0] opacity-100") 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Market Analytics
            </button>
            <button 
              onClick={() => setActiveTab('events')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'events' 
                  ? "border-[var(--ink)] opacity-100" 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Conferences & Events
            </button>
            <button 
              onClick={() => setActiveTab('duel')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'duel' 
                  ? "border-[var(--ink)] opacity-100" 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Strategic Duel
            </button>
            <button 
              onClick={() => setActiveTab('forecast')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'forecast' 
                  ? "border-[var(--ink)] opacity-100" 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Market Forecast
            </button>
            <button 
              onClick={() => setActiveTab('bento')}
              className={cn(
                "text-[11px] uppercase tracking-wider font-bold pb-4 -mb-4 border-b-2 transition-all",
                activeTab === 'bento' 
                  ? "border-[var(--ink)] opacity-100" 
                  : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              Focus Matrix
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'matrix' && (
              <div className={cn(
                "flex border rounded-sm overflow-hidden transition-colors",
                theme === 'light' ? "border-[#141414]/20" : "border-[#E4E3E0]/20"
              )}>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 transition-colors", 
                    viewMode === 'grid' 
                      ? (theme === 'light' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]") 
                      : "hover:bg-current/5"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 transition-colors", 
                    viewMode === 'list' 
                      ? (theme === 'light' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]") 
                      : "hover:bg-current/5"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'matrix' ? (
            <motion.div 
              key="matrix"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "grid gap-px bg-[#141414]/10 border border-[#141414]/10",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
              )}
            >
              {filteredCompanies.map((company) => {
                const companyData = data[company];
                const isLoading = loading[company];

                return (
                  <motion.div 
                    layout
                    key={company}
                    className={cn(
                      "p-6 transition-all group cursor-pointer relative overflow-hidden",
                      theme === 'light' 
                        ? "bg-[#E4E3E0] hover:bg-[#141414] hover:text-[#E4E3E0]" 
                        : "bg-[#141414] hover:bg-[#E4E3E0] hover:text-[#141414]"
                    )}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-serif italic text-xl group-hover:translate-x-1 transition-transform">{company}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase tracking-widest opacity-50 group-hover:opacity-100">Focus:</span>
                          <span className="text-[10px] font-mono bg-[#141414]/5 group-hover:bg-[#E4E3E0]/10 px-1.5 py-0.5 rounded-sm">
                            {companyData?.focus || 'Analyzing...'}
                          </span>
                        </div>
                        {companyData?.impactScore && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1 bg-[#141414]/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#141414] group-hover:bg-[#E4E3E0]" 
                                style={{ width: `${companyData.impactScore}%` }} 
                              />
                            </div>
                            <span className="text-[9px] font-mono opacity-50 group-hover:opacity-100">Impact: {companyData.impactScore}</span>
                          </div>
                        )}
                        {lastUpdated[company] && (
                          <div className="text-[8px] uppercase tracking-tighter opacity-30 mt-1 group-hover:opacity-60">
                            Updated: {new Date(lastUpdated[company]).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      {isLoading && <RefreshCw className="w-4 h-4 animate-spin opacity-30" />}
                    </div>

                    <div className="space-y-4">
                      <div className="min-h-[60px]">
                        <p className="text-sm leading-relaxed opacity-70 group-hover:opacity-100 line-clamp-3">
                          {companyData?.summary || 'Gathering latest news and blog updates from official channels...'}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#141414]/10 group-hover:border-[#E4E3E0]/20">
                        <span className="text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-60 block mb-3">Key Developments</span>
                        <div className="space-y-2">
                          {companyData?.recentNews?.slice(0, 3).map((news, idx) => (
                            <a 
                              key={idx} 
                              href={news.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-start gap-2 group/news hover:translate-x-1 transition-transform"
                            >
                              <ChevronRight className="w-3 h-3 mt-1 opacity-30 group-hover/news:opacity-100 transition-all" />
                              <span className="text-[11px] font-mono line-clamp-1 opacity-60 group-hover:opacity-100 group-hover/news:underline decoration-1 underline-offset-2">{news.title}</span>
                            </a>
                          )) || (
                            <div className="h-10 flex items-center gap-2 opacity-20">
                              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                              <div className="w-2 h-2 rounded-full bg-current animate-pulse delay-75" />
                              <div className="w-2 h-2 rounded-full bg-current animate-pulse delay-150" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Info className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : activeTab === 'events' ? (
            <motion.div 
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between border-b border-current/10 pb-4">
                <div>
                  <h3 className="font-serif italic text-2xl">PostgreSQL Global Events</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Conferences, Meetups, and Deadlines</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => fetchEvents(true)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-[10px] font-bold tracking-widest transition-all flex items-center gap-2",
                      theme === 'light' 
                        ? "border-[#141414]/20 hover:bg-[#141414] hover:text-[#E4E3E0]" 
                        : "border-[#E4E3E0]/20 hover:bg-[#E4E3E0] hover:text-[#141414]"
                    )}
                  >
                    <RefreshCw className={cn("w-3 h-3", isEventsLoading && "animate-spin")} />
                    REFRESH EVENTS
                  </button>
                </div>
              </div>

              {isEventsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-48 bg-current/5 animate-pulse rounded-sm border border-current/10" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {globalEvents.map((event, i) => (
                    <div key={i} className={cn(
                      "border p-6 transition-all hover:translate-y-[-4px] flex flex-col",
                      theme === 'light' ? "border-[#141414] bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]" : "border-[#E4E3E0]/20 bg-[#E4E3E0]/5"
                    )}>
                      <div className="flex justify-between items-start mb-4">
                        <span className={cn(
                          "px-2 py-1 text-[8px] font-bold uppercase tracking-widest",
                          event.type === 'Conference' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                        )}>
                          {event.type}
                        </span>
                        <span className="text-[10px] font-mono opacity-50">{event.date}</span>
                      </div>
                      <h4 className="font-serif italic text-lg mb-2">{event.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] opacity-60 mb-4">
                        <MapPin className="w-3 h-3" />
                        <span>{event.location}</span>
                      </div>
                      <p className="text-[11px] opacity-70 mb-6 leading-relaxed flex-1">
                        {event.description}
                      </p>
                      
                      <button 
                        onClick={() => {
                          const sponsors = (event.sponsors && event.sponsors.length > 0) 
                            ? event.sponsors 
                            : [{ name: 'Sponsorship Information', level: 'N/A', description: 'Detailed sponsor list is being updated. Please check the official event website for the latest information.' }];
                          setSelectedEventSponsors(sponsors);
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:underline mb-4 text-left flex items-center gap-1"
                      >
                        Sponsors <ChevronRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-current/5">
                        {event.deadline && (
                          <div className="flex items-center gap-1 text-[9px] text-amber-600 font-bold">
                            <Clock className="w-3 h-3" />
                            <span>CFP: {event.deadline}</span>
                          </div>
                        )}
                        <a 
                          href={event.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline ml-auto"
                        >
                          Details <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'feed' ? (
            <motion.div 
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {globalFeed.length > 0 ? (
                <div className={cn(
                  "border divide-y transition-colors",
                  theme === 'light' ? "border-[#141414]/10 divide-[#141414]/10 bg-white/30" : "border-[#E4E3E0]/10 divide-[#E4E3E0]/10 bg-[#E4E3E0]/5"
                )}>
                  {globalFeed.map((news, i) => (
                    <a 
                      key={i} 
                      href={news.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={cn(
                        "p-6 flex flex-col md:flex-row md:items-center justify-between transition-all group",
                        theme === 'light' ? "hover:bg-[#141414] hover:text-[#E4E3E0]" : "hover:bg-[#E4E3E0] hover:text-[#141414]"
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="w-32 shrink-0">
                          <span className="text-[10px] font-mono opacity-50 group-hover:opacity-100 block mb-1">
                            {news.date}
                          </span>
                          <span className={cn(
                            "text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm transition-colors",
                            theme === 'light' ? "bg-[#141414]/5 group-hover:bg-[#E4E3E0]/10" : "bg-[#E4E3E0]/5 group-hover:bg-[#141414]/10"
                          )}>
                            {news.company}
                          </span>
                        </div>
                        <h3 className="text-lg font-serif italic group-hover:translate-x-1 transition-transform">
                          {news.title}
                        </h3>
                      </div>
                      <div className="mt-4 md:mt-0 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Read Article <ExternalLink className="w-3 h-3" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "py-20 text-center border border-dashed transition-colors",
                  theme === 'light' ? "border-[#141414]/20" : "border-[#E4E3E0]/20"
                )}>
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
                  <p className="text-sm opacity-50 font-mono">Aggregating global news feed from all companies...</p>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'duel' ? (
            <motion.div 
              key="duel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={cn(
                  "border p-8 transition-colors",
                  theme === 'light' ? "border-[#141414] bg-white/50" : "border-[#E4E3E0]/10 bg-[#E4E3E0]/5"
                )}>
                  <h3 className="font-sans font-bold text-xl mb-6 uppercase tracking-tight">Select Competitors</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Primary Company</label>
                      <select 
                        value={duelCompanies[0]}
                        onChange={(e) => setDuelCompanies([e.target.value, duelCompanies[1]])}
                        className={cn(
                          "w-full bg-transparent border p-3 font-sans font-medium text-base focus:outline-none transition-colors",
                          theme === 'light' ? "border-[#141414]/20 focus:border-[#141414]" : "border-[#E4E3E0]/20 focus:border-[#E4E3E0]"
                        )}
                      >
                        {COMPANIES.map(c => <option key={c} value={c} className={theme === 'dark' ? "bg-[#141414] text-[#E4E3E0]" : ""}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-center">
                      <Swords className="w-6 h-6 opacity-20" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Challenger</label>
                      <select 
                        value={duelCompanies[1]}
                        onChange={(e) => setDuelCompanies([duelCompanies[0], e.target.value])}
                        className={cn(
                          "w-full bg-transparent border p-3 font-sans font-medium text-base focus:outline-none transition-colors",
                          theme === 'light' ? "border-[#141414]/20 focus:border-[#141414]" : "border-[#E4E3E0]/20 focus:border-[#E4E3E0]"
                        )}
                      >
                        {COMPANIES.map(c => <option key={c} value={c} className={theme === 'dark' ? "bg-[#141414] text-[#E4E3E0]" : ""}>{c}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={runDuel}
                      disabled={duelLoading}
                      className={cn(
                        "w-full py-4 uppercase tracking-widest text-xs font-bold transition-all flex items-center justify-center gap-2",
                        theme === 'light' ? "bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90" : "bg-[#E4E3E0] text-[#141414] hover:bg-[#E4E3E0]/90"
                      )}
                    >
                      {duelLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Generate Strategic Analysis
                    </button>
                  </div>
                </div>

                <div className={cn(
                  "border p-8 min-h-[400px] transition-colors",
                  theme === 'light' ? "border-[#141414] bg-[#141414] text-[#E4E3E0]" : "border-[#E4E3E0]/10 bg-[#E4E3E0] text-[#141414]"
                )}>
                  <div className="flex items-center gap-2 mb-6 opacity-50">
                    <Target className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-widest font-bold">AI Strategic Duel</span>
                  </div>
                  {duelAnalysis ? (
                    <div className={cn(
                      "prose prose-sm max-w-none font-sans leading-relaxed",
                      theme === 'light' ? "prose-invert" : ""
                    )}>
                      <Markdown>{duelAnalysis}</Markdown>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                      <Swords className="w-12 h-12 mb-4" />
                      <p className="text-sm font-mono">Select two companies to compare their strategic market positioning.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'forecast' ? (
            <motion.div 
              key="forecast"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto"
            >
              <div className={cn(
                "border p-12 relative overflow-hidden transition-colors",
                theme === 'light' ? "border-[#141414] bg-white/50" : "border-[#E4E3E0]/10 bg-[#E4E3E0]/5"
              )}>
                <Globe className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] rotate-12" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <TrendingUp className="w-6 h-6" />
                    <h3 className="font-serif italic text-4xl">PostgreSQL 2026 Outlook</h3>
                  </div>
                  
                  {marketForecast ? (
                    <div className="prose prose-sm max-w-none font-serif italic text-lg leading-relaxed">
                      <Markdown>{marketForecast}</Markdown>
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <p className="text-xl font-serif italic mb-8 opacity-60">Synthesize all tracked market data into a unified industry forecast.</p>
                      <button 
                        onClick={runForecast}
                        disabled={forecastLoading}
                        className={cn(
                          "px-8 py-4 uppercase tracking-widest text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto",
                          theme === 'light' ? "bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90" : "bg-[#E4E3E0] text-[#141414] hover:bg-[#E4E3E0]/90"
                        )}
                      >
                        {forecastLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        Generate Market Forecast
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'bento' ? (
            <motion.div 
              key="bento"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {Object.entries(bentoGroups).map(([groupName, companies], idx) => (
                <div key={groupName} className={cn(
                  "border p-8 flex flex-col justify-between transition-colors",
                  idx === 0 
                    ? (theme === 'light' ? "border-[#141414] bg-[#141414] text-[#E4E3E0]" : "border-[#E4E3E0]/10 bg-[#E4E3E0] text-[#141414]") 
                    : (theme === 'light' ? "border-[#141414] bg-white/50" : "border-[#E4E3E0]/10 bg-[#E4E3E0]/5")
                )}>
                  <div>
                    <div className="flex items-center gap-2 mb-4 opacity-50">
                      <Layers className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest">Market Segment</span>
                    </div>
                    <h3 className="font-serif italic text-3xl mb-8">{groupName}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {companies.map(c => (
                        <div 
                          key={c} 
                          onClick={() => setSelectedCompany(c)}
                          className={cn(
                            "p-4 border transition-all cursor-pointer flex justify-between items-center group/item",
                            idx === 0 
                              ? (theme === 'light' ? "border-[#E4E3E0]/20 hover:bg-[#E4E3E0] hover:text-[#141414]" : "border-[#141414]/20 hover:bg-[#141414] hover:text-[#E4E3E0]") 
                              : (theme === 'light' ? "border-[#141414]/10 hover:bg-[#141414] hover:text-[#E4E3E0]" : "border-[#E4E3E0]/10 hover:bg-[#E4E3E0] hover:text-[#141414]")
                          )}
                        >
                          <span className="font-serif italic">{c}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Blog Post Activity Chart */}
                <div className={cn(
                  "border p-8 transition-colors relative group",
                  theme === 'light' ? "border-[#141414] bg-white/50" : "border-[#E4E3E0]/10 bg-[#E4E3E0]/5"
                )}>
                  <button 
                    onClick={() => setFullScreenChart('velocity')}
                    className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-current/5 rounded-full"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-8">
                    <BarChart2 className="w-5 h-5 opacity-50" />
                    <div>
                      <h3 className="font-serif italic text-xl">Content Velocity</h3>
                      <p className="text-[10px] uppercase tracking-widest opacity-50">Blog posts & news items per company</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.blogCounts} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#141414" : "#E4E3E0"} opacity={0.1} horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={120} 
                          tick={{ fontSize: 9, fontFamily: 'monospace', fill: theme === 'light' ? '#141414' : '#E4E3E0' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: theme === 'light' ? '#141414' : '#E4E3E0', opacity: 0.05 }}
                          contentStyle={{ 
                            backgroundColor: theme === 'light' ? '#E4E3E0' : '#141414', 
                            border: `1px solid ${theme === 'light' ? '#141414' : '#E4E3E0'}`,
                            borderRadius: '0px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: theme === 'light' ? '#141414' : '#E4E3E0'
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                          {chartData.blogCounts.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getChartColors()[index % getChartColors().length]} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Focus Area Distribution */}
                <div className={cn(
                  "border p-8 transition-colors relative group",
                  theme === 'light' ? "border-[#141414] bg-white/50" : "border-[#E4E3E0]/10 bg-[#E4E3E0]/5"
                )}>
                  <button 
                    onClick={() => setFullScreenChart('topics')}
                    className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-current/5 rounded-full"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-3 mb-8">
                    <PieChartIcon className="w-5 h-5 opacity-50" />
                    <div>
                      <h3 className="font-serif italic text-xl">Blog Post Topics</h3>
                      <p className="text-[10px] uppercase tracking-widest opacity-50">Distribution of extracted topics</p>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.focusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.focusDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getChartColors()[index % getChartColors().length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'light' ? '#E4E3E0' : '#141414', 
                            border: `1px solid ${theme === 'light' ? '#141414' : '#E4E3E0'}`,
                            borderRadius: '0px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: theme === 'light' ? '#141414' : '#E4E3E0'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value) => <span className="text-[10px] uppercase tracking-widest font-mono">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Market Sentiment / Impact Summary */}
                <div className={cn(
                  "border p-12 transition-colors flex flex-col justify-center",
                  theme === 'light' ? "border-[#141414] bg-[#141414] text-[#E4E3E0]" : "border-[#E4E3E0]/10 bg-[#E4E3E0] text-[#141414]"
                )}>
                  <div className="space-y-12">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-4">Ecosystem Health</span>
                      <h4 className="text-4xl font-serif italic leading-tight">
                        The market shows a strong <span className="text-emerald-500">Positive</span> sentiment with high focus on Cloud-Native extensions.
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Avg Impact Score</span>
                        <span className="text-5xl font-mono">
                          {(Object.values(data).reduce((acc, d) => acc + (d.impactScore || 0), 0) / Object.keys(data).length || 0).toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Global Reach</span>
                        <span className="text-5xl font-mono">{chartData.regionalData.length}</span>
                        <span className="text-xs ml-2 opacity-50 uppercase">Regions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-[#141414]/10 p-6 bg-[#141414]/5">
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Avg. Posts per Company</span>
                  <span className="text-4xl font-mono">
                    {(chartData.blogCounts.reduce((acc, curr) => acc + curr.count, 0) / chartData.blogCounts.length || 0).toFixed(1)}
                  </span>
                </div>
                <div className="border border-[#141414]/10 p-6 bg-[#141414]/5">
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Most Active Company</span>
                  <span className="text-2xl font-serif italic block truncate">
                    {chartData.blogCounts[0]?.fullName || 'N/A'}
                  </span>
                </div>
                <div className="border border-[#141414]/10 p-6 bg-[#141414]/5">
                  <span className="text-[10px] uppercase tracking-widest opacity-50 block mb-2">Dominant Focus</span>
                  <span className="text-2xl font-serif italic block">
                    {chartData.focusDistribution[0]?.name || 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCompany(null)}
              className={cn(
                "absolute inset-0 backdrop-blur-sm transition-colors",
                theme === 'light' ? "bg-[#141414]/80" : "bg-[#000000]/90"
              )}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-4xl max-h-[90vh] overflow-hidden relative border shadow-2xl flex flex-col transition-colors",
                theme === 'light' ? "bg-[#E4E3E0] border-[#141414]" : "bg-[#141414] border-[#E4E3E0]/20"
              )}
            >
              <div className={cn(
                "p-8 border-b flex justify-between items-start transition-colors",
                theme === 'light' ? "border-[#141414] bg-white/50" : "border-[#E4E3E0]/10 bg-[#E4E3E0]/5"
              )}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      "text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 transition-colors",
                      theme === 'light' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
                    )}>Company Profile</span>
                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">Range: {timeRange}</span>
                  </div>
                  <h2 className="font-serif italic text-5xl">{selectedCompany}</h2>
                </div>
                <button 
                  onClick={() => setSelectedCompany(null)}
                  className="p-2 hover:bg-current/10 rounded-full transition-colors group"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 opacity-50 group-hover:opacity-100" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                <section>
                  <h4 className="text-[11px] uppercase tracking-widest font-bold mb-4 opacity-40">AI Strategic Summary</h4>
                  <p className="text-xl leading-relaxed font-serif italic">
                    {data[selectedCompany]?.summary || 'Analyzing strategic focus...'}
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <section>
                    <h4 className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-40">Primary Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {data[selectedCompany]?.focus?.split(',').map((f, i) => (
                        <span key={i} className={cn(
                          "px-3 py-1 text-[10px] uppercase tracking-wider font-mono transition-colors",
                          theme === 'light' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
                        )}>
                          {f.trim()}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-40">Information Sources</h4>
                    <div className="space-y-2">
                      {data[selectedCompany]?.sources?.map((source, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] font-mono opacity-60">
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate">{source}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <section>
                    <h4 className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-40">Hiring & Funding</h4>
                    <div className="space-y-4">
                      <div className={cn(
                        "p-4 border transition-colors",
                        theme === 'light' ? "bg-[#141414]/5 border-[#141414]/10" : "bg-[#E4E3E0]/5 border-[#E4E3E0]/10"
                      )}>
                        <span className="text-[9px] uppercase tracking-widest opacity-50 block mb-1">Hiring Trends</span>
                        <p className="text-sm italic">{data[selectedCompany]?.hiringTrends || 'No recent hiring data available.'}</p>
                      </div>
                      <div className={cn(
                        "p-4 border transition-colors",
                        theme === 'light' ? "bg-[#141414]/5 border-[#141414]/10" : "bg-[#E4E3E0]/5 border-[#E4E3E0]/10"
                      )}>
                        <span className="text-[9px] uppercase tracking-widest opacity-50 block mb-1">Funding & Financials</span>
                        <p className="text-sm italic">{data[selectedCompany]?.fundingAnnouncements || 'No recent funding news available.'}</p>
                      </div>
                    </div>
                  </section>
                  <section>
                    <h4 className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-40">LinkedIn Activity</h4>
                    <div className="space-y-4">
                      {data[selectedCompany]?.linkedinPosts?.length ? data[selectedCompany]?.linkedinPosts?.map((post, i) => {
                        const getValidUrl = (url?: string) => {
                          if (!url || url === '#' || url.trim() === '' || url.toLowerCase().includes('placeholder')) return null;
                          let targetUrl = url.trim();
                          if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                            targetUrl = 'https://' + targetUrl;
                          }
                          try {
                            const parsed = new URL(targetUrl);
                            if (!parsed.hostname.includes('.')) return null;
                            return targetUrl;
                          } catch {
                            return null;
                          }
                        };
                        const validUrl = getValidUrl(post.url);

                        return (
                          <div key={i} className={cn(
                            "p-4 border transition-colors",
                            theme === 'light' ? "bg-[#141414]/5 border-[#141414]/10" : "bg-[#E4E3E0]/5 border-[#E4E3E0]/10"
                          )}>
                            <p className="text-sm italic mb-3">"{post.content}"</p>
                            <div className="flex justify-between items-center text-[10px] opacity-40 pt-2 border-t border-current/5">
                              <span>{post.date}</span>
                              {validUrl ? (
                                <a href={validUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 font-bold text-[var(--accent)]">
                                  SOURCE <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="italic opacity-50">Link Unavailable</span>
                              )}
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="text-sm opacity-40 italic">No recent LinkedIn posts found.</p>
                      )}
                    </div>
                  </section>
                </div>

                <section>
                  <h4 className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-40">Conference Participation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data[selectedCompany]?.conferences?.length ? data[selectedCompany]?.conferences?.map((conf, i) => (
                      <div key={i} className={cn(
                        "p-4 border flex flex-col justify-between transition-colors",
                        theme === 'light' ? "bg-white border-[#141414]/10" : "bg-[#141414] border-[#E4E3E0]/10"
                      )}>
                        <div>
                          <p className="text-sm font-bold">{conf.name}</p>
                          <p className="text-[10px] uppercase tracking-widest opacity-50">{conf.role}</p>
                        </div>
                        <span className="text-[10px] font-mono opacity-40 mt-4">{conf.date}</span>
                      </div>
                    )) : (
                      <p className="text-sm opacity-40 italic">No recent conference data available.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] uppercase tracking-widest font-bold mb-6 opacity-40">Timeline of Developments</h4>
                  <div className={cn(
                    "border divide-y transition-colors",
                    theme === 'light' ? "border-[#141414]/10 divide-[#141414]/10" : "border-[#E4E3E0]/10 divide-[#E4E3E0]/10"
                  )}>
                    {data[selectedCompany]?.recentNews?.map((news, i) => (
                      <a 
                        key={i} 
                        href={news.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(
                          "p-4 flex items-center justify-between transition-colors group",
                          theme === 'light' ? "hover:bg-white/50" : "hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-mono opacity-40 w-24">{news.date}</span>
                          <span className="text-sm font-medium group-hover:translate-x-1 transition-transform">{news.title}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </section>
              </div>

              <div className={cn(
                "p-4 flex justify-between items-center text-[10px] uppercase tracking-widest transition-colors",
                theme === 'light' ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
              )}>
                <span>Data generated by Gemini 3.1 Flash</span>
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sponsors Modal */}
      <AnimatePresence>
        {selectedEventSponsors && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEventSponsors(null)}
              className="absolute inset-0 bg-[#141414]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "w-full max-w-lg relative border shadow-2xl p-8 transition-colors",
                "bg-[var(--bg)] border-[var(--ink)]"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif italic text-2xl">Event Sponsors</h3>
                <button onClick={() => setSelectedEventSponsors(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {selectedEventSponsors.map((sponsor, i) => (
                  <div key={i} className={cn(
                    "p-4 border transition-colors",
                    "bg-[var(--surface)] border-[var(--line)]"
                  )}>
                    <p className="text-sm font-bold mb-1">{sponsor.name}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">{sponsor.level}</p>
                    <p className="text-[11px] opacity-70">{sponsor.description || `Sponsoring at ${sponsor.level} level.`}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Chart Modal */}
      <AnimatePresence>
        {fullScreenChart && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullScreenChart(null)}
              className="absolute inset-0 bg-[#141414]/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full h-full max-w-6xl max-h-[80vh] relative bg-transparent flex flex-col"
            >
              <div className="flex justify-between items-center mb-8 text-white">
                <div>
                  <h3 className="font-serif italic text-3xl">
                    {fullScreenChart === 'velocity' ? 'Content Velocity Analysis' : 'Blog Post Topic Distribution'}
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Global PostgreSQL Ecosystem Radar</p>
                </div>
                <button 
                  onClick={() => setFullScreenChart(null)}
                  className="p-3 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
              
              <div className="flex-1 min-h-0 bg-white/5 border border-white/10 p-8">
                <ResponsiveContainer width="100%" height="100%">
                  {fullScreenChart === 'velocity' ? (
                    <BarChart data={chartData.blogCounts} layout="vertical" margin={{ left: 40, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={180} 
                        tick={{ fontSize: 12, fontFamily: 'monospace', fill: 'currentColor' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        cursor={{ fill: 'currentColor', opacity: 0.05 }}
                        contentStyle={{ 
                          backgroundColor: 'var(--bg)', 
                          border: '1px solid var(--ink)',
                          borderRadius: '0px',
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          color: 'var(--ink)'
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {chartData.blogCounts.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getChartColors()[index % getChartColors().length]} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData.focusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={120}
                        outerRadius={200}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.focusDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getChartColors()[index % getChartColors().length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg)', 
                          border: '1px solid var(--ink)',
                          borderRadius: '0px',
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          color: 'var(--ink)'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={48}
                        formatter={(value) => <span className="text-xs uppercase tracking-widest font-mono text-white">{value}</span>}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={cn(
        "max-w-[1600px] mx-auto p-6 mt-12 border-t flex flex-col md:flex-row justify-between items-center gap-4 opacity-50 transition-colors",
        theme === 'light' ? "border-[#141414]/10" : "border-[#E4E3E0]/10"
      )}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest">PostgreSQL Support Matrix © 2026</span>
        </div>
        <div className="flex gap-8 text-[10px] uppercase tracking-widest">
          <a href="#" className="hover:underline">Methodology</a>
          <a href="#" className="hover:underline">Data Sources</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
