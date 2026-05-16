'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CloudSun, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  RefreshCcw,
  Cloud,
  Sun,
  CloudRain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherData {
  current: {
    temp: number;
    condition: string;
    code: number;
  };
  daily: {
    day: string;
    max: number;
    min: number;
    code: number;
  }[];
}

interface DollarData {
  bid: string;
  pctChange: string;
  high: string;
  low: string;
}

export default function ApiView() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [dollar, setDollar] = useState<DollarData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weatherRes = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=-27.64&longitude=-48.67&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America/Sao_Paulo'
      );
      const wData = await weatherRes.json();
      
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const forecast = wData.daily.time.map((t: string, i: number) => ({
        day: days[new Date(t).getDay()],
        max: wData.daily.temperature_2m_max[i],
        min: wData.daily.temperature_2m_min[i],
        code: wData.daily.weathercode[i]
      }));

      setWeather({
        current: {
          temp: wData.current_weather.temperature,
          condition: getWeatherDescription(wData.current_weather.weathercode),
          code: wData.current_weather.weathercode
        },
        daily: forecast
      });

      const dollarRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      const dData = await dollarRes.json();
      setDollar(dData.USDBRL);

    } catch (error) {
      console.error('Erro ao buscar APIs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'Céu Limpo';
    if (code <= 3) return 'Parcialmente Nublado';
    if (code <= 48) return 'Nevoeiro';
    if (code <= 67) return 'Chuva Leve';
    if (code <= 82) return 'Chuva Forte';
    return 'Tempestade';
  };

  const WeatherIcon = ({ code, size = 24 }: { code: number, size?: number }) => {
    if (code === 0) return <Sun size={size} className="text-amber-400" />;
    if (code <= 3) return <CloudSun size={size} className="text-slate-400" />;
    if (code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    return <Cloud size={size} className="text-slate-500" />;
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-10 font-sans italic-no selection:bg-blue-100">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1 w-12 bg-blue-600 rounded-full"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Central de Dados</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-2">
            Conexões <span className="text-slate-400">Externas</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Monitoramento ambiental e financeiro em tempo real</p>
        </div>
        
        <button 
          id="refresh-api"
          onClick={fetchData} 
          disabled={loading}
          className="group relative bg-white px-6 py-3 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-blue-200 transition-all active:scale-95 flex items-center gap-3"
        >
          <div className={cn("p-1 rounded-lg transition-colors", loading ? "bg-blue-50" : "bg-slate-50 group-hover:bg-blue-50")}>
            <RefreshCcw size={18} className={cn("transition-all duration-700", loading ? 'animate-spin text-blue-600' : 'text-slate-400 group-hover:text-blue-600')} />
          </div>
          <span className="font-bold text-sm text-slate-600 group-hover:text-blue-600">Sincronizar Agora</span>
        </button>
      </motion.header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-7 group relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 rounded-[3.5rem] p-8 md:p-12 text-white overflow-hidden shadow-2xl shadow-blue-900/20"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-700">
            <CloudSun size={320} />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10">
                <MapPin size={18} className="text-blue-400" />
                <span className="text-sm font-black uppercase tracking-widest text-white">Palhoça, SC</span>
              </div>
              <div className="hidden md:block">
                <span className="text-xs font-bold opacity-60 uppercase tracking-widest text-white">Previsão Semanal</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-16 text-white">
              <div className="flex items-start gap-4">
                <span className="text-9xl font-black tracking-tighter leading-none bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic-no">
                  {weather?.current.temp.toFixed(0) || '--'}
                  <span className="text-4xl text-blue-400 font-medium align-top mt-4 inline-block tracking-normal ml-1">°C</span>
                </span>
                <div className="mt-4">
                  <p className="text-2xl font-black tracking-tight">{weather?.current.condition}</p>
                  <p className="text-sm font-medium opacity-50">Hoje e próxima semana</p>
                </div>
              </div>
              <div className="bg-white/10 p-8 rounded-[2.5rem] backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/20">
                {weather && <WeatherIcon code={weather.current.code} size={80} />}
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-white/10 overflow-x-auto">
              <div className="flex justify-between items-center min-w-[500px]">
                {weather?.daily.slice(0, 7).map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 group/day cursor-help">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/day:text-blue-400 transition-colors">
                      {day.day}
                    </span>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 group-hover/day:border-blue-500/30 group-hover/day:bg-blue-500/10 transition-all text-white">
                      <WeatherIcon code={day.code} size={24} />
                    </div>
                    <div className="flex flex-col items-center text-white">
                      <span className="text-sm font-black tracking-tight">{day.max}°</span>
                      <span className="text-[10px] font-bold opacity-40">{day.min}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-5 bg-white rounded-[3.5rem] p-8 md:p-12 border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-xl shadow-emerald-200/50">
                  <DollarSign size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1">Dólar Comercial</h3>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Paridade USD / BRL</p>
                </div>
              </div>
              
              {dollar && (
                <div className={cn(
                  "flex items-center gap-1.5 font-black text-sm px-4 py-2 rounded-2xl shadow-sm border",
                  parseFloat(dollar.pctChange) >= 0 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-red-50 text-red-600 border-red-100'
                )}>
                  {parseFloat(dollar.pctChange) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {parseFloat(dollar.pctChange).toFixed(2)}%
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center items-center py-12 relative">
              <div className="absolute inset-y-0 w-px bg-slate-100 left-1/2 -ml-px hidden md:block" />
              <div className="text-center group">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.4em] mb-4 block scale-90 opacity-70 group-hover:scale-100 group-hover:opacity-100 transition-all">Valor de Mercado</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-400 tracking-tighter self-start mt-4 italic-no">R$</span>
                  <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none italic-no">
                    {dollar ? parseFloat(dollar.bid).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-auto">
              <div className="group relative bg-slate-50/80 hover:bg-emerald-50 p-7 rounded-[2.5rem] border border-slate-100 hover:border-emerald-200 transition-all duration-500">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Máxima</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-emerald-600 italic-no">R$</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tight italic-no">{dollar?.high || '0.00'}</span>
                </div>
              </div>

              <div className="group relative bg-slate-50/80 hover:bg-red-50 p-7 rounded-[2.5rem] border border-slate-100 hover:border-red-200 transition-all duration-500">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Mínima</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-red-600 italic-no">R$</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tight italic-no">{dollar?.low || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
