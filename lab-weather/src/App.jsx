import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { Cloud, CloudRain, Sun, Droplets, Thermometer, Clock, AlertTriangle, Snowflake, Moon } from 'lucide-react';

export default function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  // Defaulting to Bangkok Coordinates, change these to your lab's location
  const LATITUDE = 13.7563;
  const LONGITUDE = 100.5018;
  // --- MQTT STATE ---
  const [localRainRate, setLocalRainRate] = useState(null); 
  const [localTemp, setLocalTemp] = useState(null);
  const [localHumid, setLocalHumid] = useState(null);

  const fetchWeather = async () => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,is_day,cloud_cover_low,cloud_cover_mid,cloud_cover_high&hourly=precipitation_probability,precipitation&timezone=auto`;
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
    // 1. Fetch API Weather Immediately & Set Interval
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 300000);

    // 2. Connect to Local MQTT Broker via WebSockets
    // Note: We use port 9001, which we just configured for WebSockets
    const client = mqtt.connect('ws://192.168.88.253:8083/mqtt', {
      username: 'weather_node', 
      password: 'Hw#504_wsn'
    });

    client.on('connect', () => {
      console.log('Connected to Lab MQTT Broker');
      
      // 1. Subscribe to the correct topic
      client.subscribe('raindrop');
    });

    client.on('message', (topic, message) => {
      console.log("MQTT INCOMING:", topic, message.toString());
      if (topic === 'raindrop') {
        try {
          // 2. Parse the incoming JSON string into a usable JavaScript object
          const payload = JSON.parse(message.toString());
          
          // 3. Extract the specific data points
          if (payload.rain_rate !== undefined) setLocalRainRate(payload.rain_rate);
          if (payload.temp !== undefined) setLocalTemp(payload.temp);
          if (payload.humid !== undefined) setLocalHumid(payload.humid);
          
        } catch (e) {
          console.error("Error parsing MQTT JSON:", e);
        }
      }
    });

    // Cleanup when component unmounts
    return () => {
      clearInterval(intervalId);
      client.end();
    };
  }, []);

  const getWeatherInterpretation = (currentData, isCurrentlyRainingLocal) => {
    // Priority 1: If the local MQTT sensor says it's raining, we force the UI to show RAIN
    if (isCurrentlyRainingLocal) return { text: 'RAINING (LIVE)', icon: CloudRain, type: 'rain' };

    // // Priority 2: Fallback to the Open-Meteo API data if MQTT isn't detecting rain
    // if (currentData.snowfall > 0) return { text: 'SNOWING', icon: Snowflake, type: 'snow' };
    // if (currentData.showers > 0) return { text: 'SHOWERS', icon: CloudRain, type: 'rain' };
    // if (currentData.rain > 0) return { text: 'RAINING', icon: CloudRain, type: 'rain' };
    // if (currentData.precipitation > 0) return { text: 'DRIZZLE', icon: CloudRain, type: 'rain' };
    
    // Priority 3: Custom Weighted Cloud Cover for Dry Skies
    const low = currentData.cloud_cover_low || 0;
    const mid = currentData.cloud_cover_mid || 0;
    const high = currentData.cloud_cover_high || 0;

    // Calculate perceived cloudiness (Cap at 100%)
    const perceivedCloudCover = Math.min(100, (low * 1.0) + (mid * 0.5) + (high * 0.1));

    // If it's dry, check the cloud cover percentage
    if (perceivedCloudCover >= 70) return { text: 'CLOUDY', icon: Cloud, type: 'clear' };
    if (perceivedCloudCover >= 30) return { text: 'PARTLY CLOUDY', icon: Cloud, type: 'clear' };
    
    // If it's clear, check if it is day or night
    if (currentData.is_day === 0) return { text: 'CLEAR NIGHT', icon: Moon, type: 'clear' };
    
    return { text: 'CLEAR SKY', icon: Sun, type: 'clear' };
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
  // --- CORE LOGIC: MQTT OVERRIDE ---
  // If localRainRate > 0, we trust the sensor. Otherwise, we trust the API.
  const isRainingLocally = localRainRate !== null && localRainRate > 0;
  
  // We pass the local rain status to the interpretation function so it can override the icon/text
  const condition = getWeatherInterpretation(current, isRainingLocally);
  
  // The final boolean determining the screen color (Blue vs Green)
  const isRaining = isRainingLocally || current.precipitation > 0 ;

  // The final number displayed on screen (prioritize MQTT, fallback to API)
  const displayedRainRate = localRainRate !== null ? localRainRate : current.precipitation;
  const displayTemp = localTemp !== null ? localTemp : current.temperature_2m;
  const displayHumid = localHumid !== null ? localHumid : current.relative_humidity_2m;


  // Determine current hour index to fetch upcoming 3 hours
  const currentHourString = current.time.slice(0, 13) + ":00"; // format to match hourly timestamps
  const currentHourIndex = hourly.time.findIndex(t => t.startsWith(currentHourString));

return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center text-slate-400 text-2xl font-semibold tracking-wider pb-6 border-b border-slate-800">
        <div>LAB WEATHER MONITOR</div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            {localRainRate !== null ? (
              <span className="text-emerald-500 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div> MQTT ACTIVE</span>
            ) : (
              <span className="text-amber-500 flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> WAITING FOR SENSOR</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={24} />
            <span>API UPDATED: {lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Left (7/12 width) and Right (5/12 width) */}
      <div className="flex-1 flex gap-8 pt-8 min-h-0">
        
        {/* ========================================================== */}
        {/* LEFT COLUMN: Main Glanceable Status Panel                  */}
        {/* ========================================================== */}
        <div className={`w-7/12 transition-colors duration-1000 flex flex-col items-center justify-center p-12 rounded-3xl shadow-2xl ${isRaining ? 'bg-blue-900/40 border-4 border-blue-500/50' : 'bg-emerald-900/20 border-4 border-emerald-500/30'}`}>
          <condition.icon size={220} className={`mb-10 ${isRainingLocally ? 'text-blue-400' : 'text-emerald-400'}`} />
          
          <h1 className={`text-7xl xl:text-8xl 2xl:text-[140px] font-black tracking-tighter leading-none mb-8 text-center ${isRaining ? 'text-blue-100' : 'text-emerald-100'}`}>
            {condition.text}
          </h1>
          
          {isRainingLocally ? (
            <div className="text-5xl xl:text-7xl font-bold text-blue-300 bg-blue-950/50 px-12 py-6 rounded-full mt-4 flex items-center gap-4 shadow-inner">
               <Droplets size={70} />
               {displayedRainRate} mm/h
               {isRainingLocally && <span className="text-2xl text-blue-500 ml-4 font-black tracking-widest uppercase">(Live)</span>}
            </div>
          ) : (
            <div className="text-4xl xl:text-6xl font-bold text-emerald-400/80 bg-emerald-950/50 px-12 py-6 rounded-full mt-4 shadow-inner">
              NOT RAINING
            </div>
          )}
        </div>

        {/* ========================================================== */}
        {/* RIGHT COLUMN: Metrics & Forecast                           */}
        {/* ========================================================== */}
        <div className="w-5/12 flex flex-col gap-8">
          
          {/* Top Row: Temp and Humidity side-by-side */}
          <div className="flex-[0.8] grid grid-cols-2 gap-8">
            <div className={`rounded-3xl p-8 flex flex-col justify-center border-2 ${localTemp !== null ? 'bg-blue-950/30 border-blue-800/60 shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className={`text-xl xl:text-2xl uppercase tracking-widest font-bold ${localTemp !== null ? 'text-blue-400' : 'text-slate-400'}`}>
                  Temp {localTemp !== null && <span className="text-sm ml-1 text-blue-500">(Live)</span>}
                </div>
                <Thermometer size={40} className={localTemp !== null ? "text-blue-400" : "text-orange-400 opacity-50"} />
              </div>
              <div className="text-6xl xl:text-[80px] font-black tracking-tighter">{displayTemp.toFixed(1)}°</div>
            </div>
            
            <div className={`rounded-3xl p-8 flex flex-col justify-center border-2 ${localHumid !== null ? 'bg-blue-950/30 border-blue-800/60 shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className={`text-xl xl:text-2xl uppercase tracking-widest font-bold ${localHumid !== null ? 'text-blue-400' : 'text-slate-400'}`}>
                  Humid {localHumid !== null && <span className="text-sm ml-1 text-blue-500">(Live)</span>}
                </div>
                <Droplets size={40} className={localHumid !== null ? "text-blue-400" : "text-blue-400 opacity-50"} />
              </div>
              <div className="text-6xl xl:text-[80px] font-black tracking-tighter">{displayHumid.toFixed(1)}%</div>
            </div>
          </div>

          {/* Bottom Row: 3-Hour Forecast as a vertical list */}
          <div className="flex-[1.2] bg-slate-900/40 rounded-3xl p-8 border border-slate-800 flex flex-col">
            <h2 className="text-slate-400 text-2xl font-bold uppercase tracking-widest mb-6 flex items-center gap-3">
               <Clock size={28} className="text-slate-500" />
               Upcoming Outlook
            </h2>
            <div className="flex-1 flex flex-col gap-4">
              {[1, 2, 3].map((offset) => {
                const forecastIdx = currentHourIndex + offset;
                if (forecastIdx < 0 || forecastIdx >= hourly.time.length) return null; 
                
                const prob = hourly.precipitation_probability[forecastIdx];
                const amount = hourly.precipitation[forecastIdx];
                const timeString = new Date(hourly.time[forecastIdx]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let displayAmount;
                if (amount > 0) {
                  displayAmount = amount.toFixed(1);
                } else if (prob > 10) {
                  // If there is >10% chance of rain, but volume is 0, show as a "Trace" amount
                  displayAmount = "<0.1";
                } else {
                  displayAmount = "0";
                }

                return (
                  <div key={offset} className="flex-1 bg-slate-950/80 rounded-2xl px-8 flex items-center justify-between border border-slate-800/80">
                    <div className="text-slate-300 text-4xl font-bold tracking-wider">{timeString}</div>
                    
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-4 w-36">
                        <CloudRain size={36} className={`shrink-0 ${prob > 40 ? 'text-blue-400' : 'text-slate-700'}`} />
                        <span className={`text-6xl font-semibold ${prob > 40 ? 'text-blue-300' : 'text-slate-500'}`}>{prob}%</span>
                      </div>
                    </div>
                      
                      
                      
                      <div className="flex items-center justify-end gap-2 w-36">
                        <span className={`text-6xl font-semibold ${amount > 0 || prob > 10 ? 'text-blue-300' : 'text-slate-500'}`}>{displayAmount}</span>
                        <span className="text-xl text-slate-600 uppercase font-bold tracking-widest mt-2">mm</span>
                      </div>
                    
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}