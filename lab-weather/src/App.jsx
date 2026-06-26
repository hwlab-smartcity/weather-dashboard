import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Droplets, Thermometer, Clock, AlertTriangle, CloudLightning, Snowflake } from 'lucide-react';

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  // Defaulting to Bangkok Coordinates, change these to your lab's location
  const LATITUDE = 13.7563;
  const LONGITUDE = 100.5018;

  const fetchWeather = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&hourly=precipitation_probability,precipitation&timezone=auto`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setWeatherData(data);
      
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setError(null);
    } catch (err) {
      setError('Failed to load weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchWeather();

    // Set up auto-refresh every 5 minutes (300,000 milliseconds)
    const intervalId = setInterval(fetchWeather, 300000);
    return () => clearInterval(intervalId);
  }, []);

  const getWeatherInterpretation = (code) => {
    // WMO Weather interpretation codes
    if (code === 0) return { text: 'CLEAR SKY', icon: Sun, type: 'clear' };
    if (code >= 1 && code <= 3) return { text: 'PARTLY CLOUDY', icon: Cloud, type: 'clear' };
    if (code === 45 || code === 48) return { text: 'FOGGY', icon: Cloud, type: 'clear' };
    if (code >= 51 && code <= 55) return { text: 'DRIZZLE', icon: CloudRain, type: 'rain' };
    if (code >= 61 && code <= 65) return { text: 'RAINING', icon: CloudRain, type: 'rain' };
    if (code >= 71 && code <= 77) return { text: 'SNOWING', icon: Snowflake, type: 'snow' };
    if (code >= 80 && code <= 82) return { text: 'RAIN SHOWERS', icon: CloudRain, type: 'rain' };
    if (code >= 95 && code <= 99) return { text: 'THUNDERSTORM', icon: CloudLightning, type: 'storm' };
    return { text: 'UNKNOWN', icon: AlertTriangle, type: 'clear' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-500 p-8 text-center">
        <AlertTriangle size={100} className="mb-8" />
        <h1 className="text-6xl font-bold">CONNECTION ERROR</h1>
        <p className="text-3xl mt-4">{error}</p>
        <p className="text-xl mt-8 text-slate-400">Retrying automatically...</p>
      </div>
    );
  }

  const { current, hourly } = weatherData;
  const condition = getWeatherInterpretation(current.weather_code);
  const isRaining = current.precipitation > 0 || ['rain', 'storm'].includes(condition.type);

  // Determine current hour index to fetch upcoming 3 hours
  const currentHourString = current.time.slice(0, 13) + ":00"; // format to match hourly timestamps
  const currentHourIndex = hourly.time.findIndex(t => t.startsWith(currentHourString));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center text-slate-400 text-2xl font-semibold tracking-wider pb-6 border-b border-slate-800">
        <div>LAB WEATHER MONITOR</div>
        <div className="flex items-center gap-2">
          <Clock size={24} />
          <span>UPDATED: {lastUpdated}</span>
        </div>
      </div>

      {/* Main Glanceable Status Panel */}
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <div className={`transition-colors duration-1000 flex flex-col items-center justify-center p-16 rounded-3xl w-full max-w-6xl shadow-2xl ${isRaining ? 'bg-blue-900/40 border-4 border-blue-500/50' : 'bg-emerald-900/20 border-4 border-emerald-500/30'}`}>
          <condition.icon size={180} className={`mb-8 ${isRaining ? 'text-blue-400' : 'text-emerald-400'}`} />
          
          <h1 className={`text-8xl md:text-[140px] font-black tracking-tighter leading-none mb-6 ${isRaining ? 'text-blue-100' : 'text-emerald-100'}`}>
            {condition.text}
          </h1>
          
          {isRaining ? (
            <div className="text-5xl md:text-7xl font-bold text-blue-300 bg-blue-950/50 px-12 py-6 rounded-full mt-4 flex items-center gap-4">
               <Droplets size={60} />
               {current.precipitation} mm/h
            </div>
          ) : (
            <div className="text-5xl md:text-7xl font-bold text-emerald-400/80 bg-emerald-950/50 px-12 py-6 rounded-full mt-4">
              CURRENTLY DRY
            </div>
          )}
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-900 rounded-2xl p-8 flex items-center justify-between border border-slate-800">
          <div>
            <div className="text-slate-400 text-2xl uppercase tracking-widest font-semibold mb-2">Temperature</div>
            <div className="text-6xl font-bold">{current.temperature_2m}°C</div>
          </div>
          <Thermometer size={80} className="text-orange-400 opacity-50" />
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-8 flex items-center justify-between border border-slate-800">
          <div>
            <div className="text-slate-400 text-2xl uppercase tracking-widest font-semibold mb-2">Humidity</div>
            <div className="text-6xl font-bold">{current.relative_humidity_2m}%</div>
          </div>
          <Droplets size={80} className="text-blue-400 opacity-50" />
        </div>
      </div>

      {/* 3-Hour Forecast Footer */}
      <div className="grid grid-cols-3 gap-8">
        {[1, 2, 3].map((offset) => {
          const forecastIdx = currentHourIndex + offset;
          // Protect against out-of-bounds array errors near the end of the 7-day forecast
          if (forecastIdx < 0 || forecastIdx >= hourly.time.length) return null; 
          
          const prob = hourly.precipitation_probability[forecastIdx];
          const amount = hourly.precipitation[forecastIdx];
          
          // Formatting the hour nicely (e.g., "14:00")
          const timeString = new Date(hourly.time[forecastIdx]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={offset} className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="text-slate-400 text-2xl font-bold mb-4">{timeString}</div>
              <div className="flex items-center gap-4 text-4xl font-semibold">
                <span className={prob > 40 ? 'text-blue-400' : 'text-slate-200'}>
                  {prob}% <span className="text-xl text-slate-500 block uppercase tracking-widest mt-1">Rain Risk</span>
                </span>
                <div className="w-px h-16 bg-slate-700"></div>
                <span className={amount > 0 ? 'text-blue-400' : 'text-slate-200'}>
                  {amount} <span className="text-xl text-slate-500 block uppercase tracking-widest mt-1">mm</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}