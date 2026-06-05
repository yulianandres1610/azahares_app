// Clima por ubicación del dispositivo (Open-Meteo, gratis, sin API key).
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { IconName } from '../components/Icon';

export interface WeatherHour {
  label: string; // "Now" o "14:00"
  temp: number;
  code: number;
}
export interface WeatherData {
  tempC: number;
  feels: number;
  humidity: number;
  windKmh: number;
  uv: number;
  code: number;
  city: string;
  hours: WeatherHour[];
}

// WMO weather_code → ícono de la app.
export function weatherIcon(code: number): IconName {
  if (code === 0) return 'sun';
  if (code <= 3) return 'cloudSun';
  if (code >= 45 && code <= 48) return 'cloud';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if (code >= 71 && code <= 77) return 'cloud';
  return 'cloud';
}

// Etiqueta de condición localizada.
export function weatherCondition(code: number, es: boolean): string {
  if (code === 0) return es ? 'Despejado' : 'Clear';
  if (code <= 3) return es ? 'Parcialmente nublado' : 'Partly cloudy';
  if (code >= 45 && code <= 48) return es ? 'Niebla' : 'Fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return es ? 'Lluvia' : 'Rain';
  if (code >= 71 && code <= 77) return es ? 'Nieve' : 'Snow';
  if (code >= 95) return es ? 'Tormenta' : 'Thunderstorm';
  return es ? 'Nublado' : 'Cloudy';
}

function fmtHour(iso: string, nowLabel: string, isNow: boolean): string {
  if (isNow) return nowLabel;
  // iso = "2026-06-05T14:00"
  const hh = iso.slice(11, 16);
  return hh;
}

export function useWeather(nowLabel = 'Now') {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          if (mounted) setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const { latitude, longitude } = pos.coords;

        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
          `&hourly=temperature_2m,weather_code&forecast_hours=12&timezone=auto&wind_speed_unit=kmh`;
        const res = await fetch(url);
        const json: any = await res.json();

        // ciudad por geocodificación inversa
        let city = '';
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          city = places[0]?.city || places[0]?.subregion || places[0]?.region || '';
        } catch {}

        const cur = json.current || {};
        const hTimes: string[] = json.hourly?.time || [];
        const hTemps: number[] = json.hourly?.temperature_2m || [];
        const hCodes: number[] = json.hourly?.weather_code || [];
        // índice de la hora actual
        const nowTime = (cur.time as string) || '';
        let startIdx = hTimes.findIndex((tm) => tm >= nowTime.slice(0, 13));
        if (startIdx < 0) startIdx = 0;
        const hours: WeatherHour[] = [];
        for (let i = startIdx; i < Math.min(startIdx + 6, hTimes.length); i++) {
          hours.push({ label: fmtHour(hTimes[i], nowLabel, i === startIdx), temp: Math.round(hTemps[i]), code: hCodes[i] });
        }

        if (mounted) {
          setData({
            tempC: Math.round(cur.temperature_2m ?? 0),
            feels: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
            humidity: Math.round(cur.relative_humidity_2m ?? 0),
            windKmh: Math.round(cur.wind_speed_10m ?? 0),
            uv: Math.round(cur.uv_index ?? 0),
            code: cur.weather_code ?? 0,
            city,
            hours,
          });
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [nowLabel]);

  return { weather: data, loading };
}
