import moment from 'moment';

type WeatherData = {
  temperature: number;
  description: string;
  icon: string;
  precipitation: number;
  humidity: number;
  windSpeed: number;
};

type Forecast = {
  date: Date;
  weather: WeatherData;
};

export class WeatherService {
  private getWeatherCode(code: number): { description: string; icon: string } {
    const weatherCodes: Record<number, { description: string; icon: string }> = {
      0: { description: "Cielo despejado", icon: "☀️" },
      1: { description: "Mayormente despejado", icon: "🌤️" },
      2: { description: "Parcialmente nublado", icon: "⛅" },
      3: { description: "Nublado", icon: "☁️" },
      45: { description: "Niebla", icon: "🌫️" },
      48: { description: "Niebla con escarcha", icon: "🌫️" },
      51: { description: "Llovizna ligera", icon: "🌦️" },
      53: { description: "Llovizna moderada", icon: "🌧️" },
      55: { description: "Llovizna intensa", icon: "🌧️" },
      61: { description: "Lluvia ligera", icon: "🌦️" },
      63: { description: "Lluvia moderada", icon: "🌧️" },
      65: { description: "Lluvia intensa", icon: "🌧️" },
      71: { description: "Nevada ligera", icon: "🌨️" },
      73: { description: "Nevada moderada", icon: "🌨️" },
      75: { description: "Nevada intensa", icon: "🌨️" },
      77: { description: "Aguanieve", icon: "🌨️" },
      80: { description: "Lluvia ligera", icon: "🌦️" },
      81: { description: "Lluvia moderada", icon: "🌧️" },
      82: { description: "Lluvia intensa", icon: "🌧️" },
      85: { description: "Nevada ligera", icon: "🌨️" },
      86: { description: "Nevada intensa", icon: "🌨️" },
      95: { description: "Tormenta eléctrica", icon: "⛈️" },
      96: { description: "Tormenta con granizo ligero", icon: "⛈️" },
      99: { description: "Tormenta con granizo fuerte", icon: "⛈️" }
    };

    return weatherCodes[code] || { description: "No disponible", icon: "❓" };
  }

  async getCurrentWeather(location: string): Promise<WeatherData | null> {
    try {
      // Primero obtenemos las coordenadas
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );

      if (!geoResponse.ok) {
        throw new Error(`Error obteniendo coordenadas: ${geoResponse.statusText}`);
      }

      const geoData = await geoResponse.json();
      if (!geoData.results?.length) {
        throw new Error('Ubicación no encontrada');
      }

      const { latitude, longitude } = geoData.results[0];

      // Obtenemos el clima actual
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&longitude=${longitude}&` +
        `current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&` +
        `timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error(`Error obteniendo el clima: ${weatherResponse.statusText}`);
      }

      const data = await weatherResponse.json();
      const current = data.current;
      const weatherInfo = this.getWeatherCode(current.weather_code);

      return {
        temperature: Math.round(current.temperature_2m),
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        precipitation: current.precipitation,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m
      };
    } catch (error) {
      console.error('Error en servicio del clima:', error);
      return null;
    }
  }

  async getForecast(location: string, days: number = 5): Promise<Forecast[]> {
    try {
      // Primero obtenemos las coordenadas
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );

      if (!geoResponse.ok) {
        throw new Error(`Error obteniendo coordenadas: ${geoResponse.statusText}`);
      }

      const geoData = await geoResponse.json();
      if (!geoData.results?.length) {
        throw new Error('Ubicación no encontrada');
      }

      const { latitude, longitude } = geoData.results[0];

      // Obtenemos el pronóstico
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&longitude=${longitude}&` +
        `daily=temperature_2m_max,precipitation_sum,weather_code&` +
        `timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error(`Error obteniendo el pronóstico: ${weatherResponse.statusText}`);
      }

      const data = await weatherResponse.json();
      const forecasts: Forecast[] = [];

      for (let i = 0; i < Math.min(days, data.daily.time.length); i++) {
        const weatherInfo = this.getWeatherCode(data.daily.weather_code[i]);
        forecasts.push({
          date: new Date(data.daily.time[i]),
          weather: {
            temperature: Math.round(data.daily.temperature_2m_max[i]),
            description: weatherInfo.description,
            icon: weatherInfo.icon,
            precipitation: data.daily.precipitation_sum[i],
            humidity: 0, // No disponible en el pronóstico diario
            windSpeed: 0 // No disponible en el pronóstico diario
          }
        });
      }

      return forecasts;
    } catch (error) {
      console.error('Error obteniendo pronóstico:', error);
      return [];
    }
  }

  formatWeatherMessage(weather: WeatherData): string {
    return `${weather.icon} El clima actual:\n` +
           `🌡️ Temperatura: ${weather.temperature}°C\n` +
           `💨 Viento: ${weather.windSpeed} km/h\n` +
           `💧 Humedad: ${weather.humidity}%\n` +
           `☔ Precipitación: ${weather.precipitation}mm\n` +
           `📝 ${weather.description}`;
  }

  formatForecastMessage(forecasts: Forecast[]): string {
    return "Pronóstico para los próximos días:\n\n" +
      forecasts.map(f => {
        const date = moment(f.date).format('dddd D');
        return `${date}:\n${f.weather.icon} ${f.weather.temperature}°C - ${f.weather.description}`;
      }).join('\n\n');
  }
}

export const weatherService = new WeatherService();