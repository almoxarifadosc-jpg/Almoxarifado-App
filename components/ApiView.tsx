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
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <header className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Dashboard Operacional</h1>
          <p className="text-slate-500 font-medium italic">Dados integrados para controle industrial</p>
        </div>
        <button 
          id="refresh-api"
          onClick={fetchData} 
          disabled={loading}
          className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin text-blue-600' : 'text-slate-400'} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Cloud size={200} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-md">
              <MapPin size={16} />
              <span className="text-sm font-bold uppercase tracking-widest">Palhoça, SC</span>
            </div>

            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="text-8xl font-black tracking-tighter leading-none">
                  {weather?.current.temp.toFixed(0)}°
                </span>
                <p className="text-xl font-medium opacity-80 mt-2">{weather?.current.condition}</p>
              </div>
              <div className="bg-white/20 p-6 rounded-[2rem] backdrop-blur-xl">
                {weather && <WeatherIcon code={weather.current.code} size={80} />}
              </div>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
              {weather?.daily.slice(0, 7).map((day, i) => (
                <div key={i} className="flex flex-col items-center p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] uppercase font-black opacity-60 mb-2">{day.day}</span>
                  <WeatherIcon code={day.code} size={20} />
                  <span className="mt-2 text-xs font-bold">{day.max}°</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-4 rounded-[1.5rem] text-emerald-600">
                <DollarSign size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Cotação do Dólar</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">USD / BRL</p>
              </div>
            </div>
            
            {dollar && (
              <div className={`flex items-center gap-1 font-black text-sm px-3 py-1 rounded-full ${
                parseFloat(dollar.pctChange) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {parseFloat(dollar.pctChange) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {parseFloat(dollar.pctChange).toFixed(2)}%
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center items-center py-8">
            <span className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Cotação Atual</span>
            <span className="text-7xl font-black text-slate-900 tracking-tighter">
              R$ {dollar ? parseFloat(dollar.bid).toFixed(2) : '---'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Máxima</span>
              <span className="text-xl font-black text-slate-800">R$ {dollar?.high || '---'}</span>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Mínima</span>
              <span className="text-xl font-black text-slate-800">R$ {dollar?.low || '---'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
