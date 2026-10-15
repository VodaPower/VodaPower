const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const latitude = Deno.env.get('WEATHER_LATITUDE');
    const longitude = Deno.env.get('WEATHER_LONGITUDE');
    if (!latitude || !longitude) throw new Error('Weather location is not configured');

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('lat', latitude);
    url.searchParams.set('lon', longitude);
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('timezone', 'auto');

    const response = await fetch(url);
    if (!response.ok) {
      const providerMessage = await response.text();
      throw new Error(`Open-Meteo ${response.status}: ${providerMessage}`);
    }
    const weather = await response.json();
    const weatherCode = weather.current?.weather_code ?? -1;
    const weatherLabels = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy rain showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail' };
    const condition = weatherLabels[weatherCode] ?? 'Weather update';
    const temperature = Math.round(weather.current?.temperature_2m ?? 0);
    const severeWeather = [65, 82, 95, 96, 99].includes(weatherCode);

    return new Response(JSON.stringify({
      alertTitle: severeWeather ? 'Severe weather watch' : 'Weather readiness',
      alertCopy: severeWeather ? 'Rain or storm conditions are currently reported. Keep phones charged and report damaged infrastructure from a safe place.' : 'No severe weather condition is currently indicated. Keep phones charged and stay prepared for local changes.',
      conditionsTitle: `${condition} · ${temperature}°C`,
      conditionsCopy: 'Live conditions loaded from the configured weather location. Save energy during peak heat and keep essential devices powered.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
