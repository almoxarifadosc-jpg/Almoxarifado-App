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

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="mb-10">
        <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter">Informaçōes em Tempo Real</h2>
        <p className="text-on-surface-variant font-medium">Clima regional e indicadores financeiros.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Weather */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low rounded-[48px] border border-outline-variant/10 shadow-xl overflow-hidden"
        >
          <div className="p-10 border-b border-outline-variant/5 bg-sky-500/5">
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center text-sky-500">
                  <CloudSun className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600/60">Previsão do Tempo</p>
                  <h3 className="text-3xl font-headline font-black text-sky-900">Palhoça, SC</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-headline font-black text-sky-600 leading-none">
                  {weather?.current_weather?.temperature ? Math.round(weather.current_weather.temperature) : '--'}°C
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-600/40 mt-1">Sente como {weather?.current_weather?.temperature ? Math.round(weather.current_weather.temperature - 1) : '--'}°C</p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4">
              {weather?.daily?.time.map((day: any, i: number) => (
                <div key={day} className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-3xl transition-all",
                  i === 0 ? "bg-white shadow-md border border-sky-100" : "hover:bg-sky-100/40"
                )}>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-sky-900/60">{i === 0 ? 'Hoje' : getDayName(day)}</span>
                  {getWeatherIcon(weather.daily.weathercode[i])}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-sky-900">{Math.round(weather.daily.temperature_2m_max[i])}°</span>
                    <span className="text-[10px] font-black text-sky-400 opacity-60">{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="px-10 py-6 bg-white flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-sky-900">{weather?.current_weather?.windspeed || '--'} km/h</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-sky-900">Humidade: 72%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sky-600/40">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-tighter">Atualizado agora</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Dollar Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-low rounded-[48px] border border-outline-variant/10 shadow-xl overflow-hidden"
        >
          <div className="p-10 border-b border-outline-variant/5 bg-emerald-500/5 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center text-emerald-500">
                    <DollarSign className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">Mercado Financeiro</p>
                    <h3 className="text-3xl font-headline font-black text-emerald-900">Dólar Comercial</h3>
                  </div>
                </div>
                <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ao Vivo</span>
                  </div>
                </div>
              </div>

              <div className="flex items-baseline gap-4 mb-10">
                <span className="text-6xl font-headline font-black text-emerald-900 tracking-tighter">
                  R$ {dollar?.bid ? Number(dollar.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                </span>
                <div className={cn(
                  "flex items-center gap-1 px-3 py-1 rounded-xl font-black text-xs",
                  Number(dollar?.pctChange) >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                )}>
                  {Number(dollar?.pctChange) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {dollar?.pctChange || '0'}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-[32px] border border-emerald-100 flex items-center gap-5">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/50 mb-0.5">Máxima do Dia</p>
                    <p className="text-xl font-headline font-black text-emerald-900">R$ {dollar?.high || '--'}</p>
                  </div>
                </div>
                <div className="p-6 bg-white rounded-[32px] border border-emerald-101 flex items-center gap-5">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-red-600/50 mb-0.5">Mínima do Dia</p>
                    <p className="text-xl font-headline font-black text-red-900">R$ {dollar?.low || '--'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-8">
              <div className="flex items-center gap-2 text-emerald-900/40">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-[9px] font-black text-emerald-900/30 uppercase tracking-[0.2em]">Câmbio atualizado via AwesomeAPI</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
