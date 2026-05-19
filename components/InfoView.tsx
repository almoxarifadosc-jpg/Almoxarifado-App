'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloudSun, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar,
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Thermometer
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

// Helper for weather icons
const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="w-8 h-8 text-amber-500" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-8 h-8 text-sky-400" />;
  if (code >= 45 && code <= 48) return <Wind className="w-8 h-8 text-slate-400" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />;
  if (code >= 71 && code <= 77) return <Cloud className="w-8 h-8 text-slate-300" />;
  if (code >= 80 && code <= 86) return <CloudRain className="w-8 h-8 text-blue-500" />;
  if (code >= 95) return <CloudLightning className="w-8 h-8 text-indigo-500" />;
  return <CloudSun className="w-8 h-8 text-sky-400" />;
};

const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
};

export function InfoView() {
  const [weather, setWeather] = useState<any>(null);
  const [dollar, setDollar] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Palhoça Weather (Current + 7 days)
      const wRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.64&longitude=-48.67&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America%2FSao_Paulo');
      const wData = await wRes.json();
      setWeather(wData);

      // Dollar Rate
      const dRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      const dData = await dRes.json();
      if (dData.USDBRL) {
        setDollar(dData.USDBRL);
      }
    } catch (e) {
      console.error('Failed to fetch info data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000); // 15 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-bold animate-pulse">Sincronizando informações externas...</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-[1400px] mx-auto min-h-screen space-y-12">
      <header className="space-y-2">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Dados Atualizados
        </motion.div>
        <h2 className="text-4xl md:text-5xl font-headline font-black text-on-surface tracking-tight">Hub de Informações</h2>
        <p className="text-on-surface-variant font-medium text-lg">Monitore indicadores externos que impactam nossa operação.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Card 1: Weather (Takes more space) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-8 group"
        >
          <div className="bg-surface-container-low rounded-[48px] border border-outline-variant/10 shadow-2xl overflow-hidden h-full flex flex-col relative transition-all duration-500 hover:shadow-primary/5">
            {/* Header / Current Status */}
            <div className="p-8 md:p-12 space-y-12 flex-1">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-sky-500/10 dark:bg-sky-500/20 rounded-[32px] flex items-center justify-center text-sky-500 scale-110">
                    {weather && getWeatherIcon(weather.current_weather.weathercode)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-500 mb-1">Unidade Industrial</p>
                    <h3 className="text-3xl md:text-4xl font-headline font-black text-on-surface">Palhoça, SC</h3>
                    <div className="flex items-center gap-2 text-on-surface-variant mt-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-highest/50 backdrop-blur-md rounded-[40px] p-8 min-w-[200px] border border-white/10 flex flex-col items-center">
                  <span className="text-6xl md:text-7xl font-headline font-black text-on-surface tracking-tighter">
                    {weather?.current_weather?.temperature ? Math.round(weather.current_weather.temperature) : '--'}°
                  </span>
                  <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mt-2">Sensação Térmica</p>
                </div>
              </div>

              {/* Weekly Forecast */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                {weather?.daily?.time.map((day: any, i: number) => (
                  <motion.div 
                    key={day}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex flex-col items-center gap-4 p-5 rounded-[32px] transition-all duration-300",
                      i === 0 
                        ? "bg-surface-container-highest shadow-xl ring-1 ring-sky-500/20" 
                        : "bg-surface-container-low hover:bg-surface-container-high"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter",
                      i === 0 ? "text-sky-500" : "text-on-surface-variant opacity-60"
                    )}>
                      {i === 0 ? 'Hoje' : getDayName(day)}
                    </span>
                    <div className="scale-75 md:scale-100">
                      {getWeatherIcon(weather.daily.weathercode[i])}
                    </div>
                    <div className="flex flex-col items-center font-headline font-black">
                      <span className="text-lg text-on-surface">{Math.round(weather.daily.temperature_2m_max[i])}°</span>
                      <span className="text-xs text-on-surface-variant/40">{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Footer Details */}
            <div className="px-12 py-8 bg-surface-container-high/50 border-t border-outline-variant/5 flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-on-surface-variant/40">Vento</p>
                    <p className="text-sm font-black text-on-surface">{weather?.current_weather?.windspeed || '--'} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-on-surface-variant/40">Geral</p>
                    <p className="text-sm font-black text-on-surface">{weather?.daily?.temperature_2m_max[0]}° / {weather?.daily?.temperature_2m_min[0]}°</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant/30">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Tempo Real Open-Meteo</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Dollar Rate (Vertical / Side) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-4"
        >
          <div className="bg-surface-container-low rounded-[48px] border border-outline-variant/10 shadow-2xl overflow-hidden h-full flex flex-col transition-all duration-500 hover:shadow-emerald-500/5">
            <div className="p-10 border-b border-outline-variant/5 bg-emerald-500/5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-16">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-[28px] flex items-center justify-center text-emerald-500">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Mercado</p>
                    <h3 className="text-2xl font-headline font-black text-on-surface">Dólar (USD)</h3>
                  </div>
                </div>
                <div className="px-5 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant leading-none ml-2">Cotação Atual (Venda)</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-6xl md:text-7xl font-headline font-black text-on-surface tracking-tighter">
                    {dollar?.bid ? Number(dollar.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-[13px] shadow-lg shadow-black/5",
                    Number(dollar?.pctChange) >= 0 ? "bg-emerald-500 text-white" : "bg-error text-white"
                  )}>
                    {Number(dollar?.pctChange) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {dollar?.pctChange || '0'}%
                  </div>
                </div>
                <p className="text-on-surface-variant font-bold text-sm ml-2">
                  USD 1,00 = BRL {dollar?.bid || '--'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-12">
                <div className="p-6 bg-surface-container-highest rounded-[32px] border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/50">Máxima</p>
                      <p className="text-lg font-headline font-black text-on-surface">R$ {dollar?.high || '--'}</p>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                </div>
                <div className="p-6 bg-surface-container-highest rounded-[32px] border border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center text-error">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tighter text-on-surface-variant/50">Mínima</p>
                      <p className="text-lg font-headline font-black text-on-surface">R$ {dollar?.low || '--'}</p>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-error/20" />
                </div>
              </div>
            </div>

            <div className="px-10 py-6 bg-surface-container-highest transition-colors flex items-center justify-center">
              <p className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] text-center">
                AwesomeAPI • Atualizado em {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Footer Note */}
      <footer className="text-center opacity-30 select-none pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-on-surface">Ventisol Industrial S.A. Hub</p>
      </footer>
    </div>
  );
}
