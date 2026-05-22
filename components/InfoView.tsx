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
  Thermometer,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// Helper for weather icons
const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="w-10 h-10 text-amber-500 animate-[spin_20s_linear_infinite]" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-10 h-10 text-sky-400 dark:text-sky-300" />;
  if (code >= 45 && code <= 48) return <Wind className="w-10 h-10 text-slate-400 dark:text-slate-300" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-10 h-10 text-blue-400 dark:text-blue-300" />;
  if (code >= 71 && code <= 77) return <Cloud className="w-10 h-10 text-slate-300 dark:text-slate-400" />;
  if (code >= 80 && code <= 86) return <CloudRain className="w-10 h-10 text-blue-500 dark:text-blue-400" />;
  if (code >= 95) return <CloudLightning className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />;
  return <CloudSun className="w-10 h-10 text-sky-400 dark:text-sky-300" />;
};

const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
};

const getWeatherDescription = (code: number) => {
  if (code === 0) return 'Céu Limpo';
  if (code >= 1 && code <= 3) return 'Parcialmente Nublado';
  if (code >= 45 && code <= 48) return 'Nevoeiro / Vento';
  if (code >= 51 && code <= 67) return 'Chuva Leve';
  if (code >= 71 && code <= 77) return 'Nublado';
  if (code >= 80 && code <= 86) return 'Pancadas de Chuva';
  if (code >= 95) return 'Tempestades';
  return 'Tempo Instável';
};

export function InfoView() {
  const [weather, setWeather] = useState<any>(null);
  const [dollar, setDollar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async () => {
    try {
      setRefreshing(true);
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

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('Failed to fetch info data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15 * 60 * 1000); // 15 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto min-h-screen">
      {/* Header com Design Bento Limpo e botão de reload */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter dark:text-white">
            Informações Úteis
          </h2>
          <p className="text-on-surface-variant dark:text-neutral-400 font-medium mt-1">
            Clima regional de Palhoça e indicadores de câmbio comercial.
          </p>
        </div>
        
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest dark:bg-neutral-800 dark:hover:bg-neutral-700 active:scale-95 transition-all text-on-surface dark:text-neutral-200 border border-outline-variant/10 text-sm font-bold shadow-sm cursor-pointer"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-primary")} />
          {refreshing ? 'Atualizando...' : 'Recarregar Dados'}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-32 gap-4">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-3xl flex items-center justify-center text-primary animate-pulse">
            <CloudSun className="w-8 h-8" />
          </div>
          <p className="text-on-surface-variant dark:text-neutral-400 font-bold flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            Buscando dados em tempo real...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Bento Card 1: CLIMA PALHOÇA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-surface-container-low dark:bg-neutral-900 rounded-[40px] border border-outline-variant/10 dark:border-neutral-800/60 shadow-lg overflow-hidden flex flex-col justify-between"
          >
            {/* Clima Header & Info */}
            <div className="p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10 pb-6 border-b border-outline-variant/10 dark:border-neutral-800/60">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-sky-50 dark:bg-sky-950/40 rounded-3xl flex items-center justify-center text-sky-500 shrink-0 shadow-inner">
                    <CloudSun className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">Previsão do Tempo</span>
                    <h3 className="text-3xl font-headline font-black text-slate-800 dark:text-neutral-100">Palhoça, SC</h3>
                    <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                      {weather?.current_weather ? getWeatherDescription(weather.current_weather.weathercode) : ''}
                    </p>
                  </div>
                </div>
                
                <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end gap-2 leading-none whitespace-nowrap">
                  <span className="text-5xl font-headline font-black text-slate-800 dark:text-white">
                    {weather?.current_weather?.temperature ? Math.round(weather.current_weather.temperature) : '--'}°C
                  </span>
                  <div className="flex flex-col sm:items-end">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">Sensação Térmica</span>
                    <span className="text-[11px] font-bold text-sky-600 dark:text-sky-300">
                      {weather?.current_weather?.temperature ? Math.round(weather.current_weather.temperature - 1) : '--'}°C
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de 7 dias com Design Bento Adaptativo */}
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-7 gap-3 sm:gap-2">
                {weather?.daily?.time.map((day: any, i: number) => {
                  const isToday = i === 0;
                  return (
                    <motion.div 
                      key={day} 
                      whileHover={{ scale: 1.05 }}
                      className={cn(
                        "flex flex-col items-center gap-2.5 p-3.5 sm:p-2.5 rounded-2xl transition-all border",
                        isToday 
                          ? "bg-sky-500/10 dark:bg-sky-500/15 border-sky-400/20 shadow-md" 
                          : "bg-surface-container border-outline-variant/5 dark:bg-neutral-800/40 dark:border-neutral-800"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter",
                        isToday ? "text-sky-600 dark:text-sky-300" : "text-slate-500 dark:text-neutral-400"
                      )}>
                        {isToday ? 'Hoje' : getDayName(day)}
                      </span>
                      
                      <div className="my-1 flex items-center justify-center p-1 rounded-full">
                        {getWeatherIcon(weather.daily.weathercode[i])}
                      </div>
                      
                      <div className="flex items-center gap-1.5 justify-center mt-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-neutral-200">
                          {Math.round(weather.daily.temperature_2m_max[i])}°
                        </span>
                        <span className="text-[10px] font-black text-sky-400 dark:text-sky-400/80 opacity-60">
                          {Math.round(weather.daily.temperature_2m_min[i])}°
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            
            {/* Rodapé do Clima com Detalhes */}
            <div className="px-8 py-5 bg-surface-container dark:bg-neutral-800/40 border-t border-outline-variant/10 dark:border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 dark:text-neutral-400">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Ventos: {weather?.current_weather?.windspeed || '--'} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Humidade: 72%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>Atualizado às {lastUpdated}</span>
              </div>
            </div>
          </motion.div>

          {/* Bento Card 2: DÓLAR COMERCIAL */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-surface-container-low dark:bg-neutral-900 rounded-[40px] border border-outline-variant/10 dark:border-neutral-800/60 shadow-lg overflow-hidden flex flex-col justify-between"
          >
            {/* Dólar Header & Rates */}
            <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-4 mb-10 pb-6 border-b border-outline-variant/10 dark:border-neutral-800/60">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl flex items-center justify-center text-emerald-500 shrink-0 shadow-inner">
                      <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Mercado Financeiro</span>
                      <h3 className="text-3xl font-headline font-black text-slate-800 dark:text-neutral-100">Dólar Comercial</h3>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Ao Vivo</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-10">
                  <span className="text-6xl font-headline font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                    R$ {dollar?.bid ? Number(dollar.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '--'}
                  </span>
                  
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs self-start sm:self-auto",
                    Number(dollar?.pctChange) >= 0 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" 
                      : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                  )}>
                    {Number(dollar?.pctChange) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {dollar?.pctChange || '0'}%
                  </div>
                </div>

                {/* Grid Diário Mínimo/Máximo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-surface-container dark:bg-neutral-800/40 rounded-3xl border border-outline-variant/10 dark:border-neutral-800 flex items-center gap-4 hover:border-emerald-500/20 dark:hover:border-emerald-500/20 transition-all">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-500">Máxima do Dia</span>
                      <p className="text-xl font-headline font-black text-slate-800 dark:text-white mt-0.5">R$ {dollar?.high || '--'}</p>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-surface-container dark:bg-neutral-800/40 rounded-3xl border border-outline-variant/10 dark:border-neutral-800 flex items-center gap-4 hover:border-red-500/20 dark:hover:border-red-500/20 transition-all">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-neutral-500">Mínima do Dia</span>
                      <p className="text-xl font-headline font-black text-slate-800 dark:text-white mt-0.5">R$ {dollar?.low || '--'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé do Dólar */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-8 mt-8 border-t border-outline-variant/10 dark:border-neutral-800/60 gap-3 text-slate-500 dark:text-neutral-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center sm:text-right">
                  Câmbio atualizado via AwesomeAPI
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
