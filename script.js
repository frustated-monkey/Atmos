// ============================================================
// CONFIG — put your keys here
// ============================================================
const OPENWEATHER_KEY = "444d8c931be54c1eda5dfac12cf82efa"; // your existing key
const NEWSDATA_KEY = "pub_fe67064ef00040b783b37c1efdcd265f"; // your newsdata.io key
// NOTE: this key is now visible in this chat transcript. If this repo or
// deploy is ever public, rotate it from your newsdata.io dashboard first.

const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const AQI_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
const NEWS_URL = "https://newsdata.io/api/1/latest";

// ============================================================
// DOM SHORTCUTS
// ============================================================
const el = (id) => document.getElementById(id);

const cityInput = el("cityInput");
const searchForm = el("searchForm");
const locateBtn = el("locateBtn");
const statusLine = el("statusLine");
const themeToggle = el("themeToggle");
const themeIcon = el("themeIcon");

// ============================================================
// THEME
// ============================================================
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem("atmos-theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("atmos-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
  if (lastDailyData) renderTrendChart(lastDailyData);
});

// ============================================================
// STATUS HELPER
// ============================================================
function setStatus(message) {
  statusLine.textContent = message || "";
}

// ============================================================
// WEATHER
// ============================================================
async function getWeatherByCity(city) {
  if (!city || !city.trim()) {
    setStatus("Please enter a city name.");
    return;
  }
  setStatus(`Searching for "${city}"...`);
  try {
    const res = await fetch(
      `${WEATHER_URL}?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`
    );
    const data = await res.json();

    if (String(data.cod) === "404") {
      setStatus("City not found — check the spelling and try again.");
      return;
    }
    if (String(data.cod) !== "200") {
      setStatus(data.message || "Something went wrong fetching weather.");
      return;
    }

    handleWeatherData(data);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't reach the weather service. Check your connection.");
  }
}

async function getWeatherByCoords(lat, lon) {
  setStatus("Getting weather for your location...");
  try {
    const res = await fetch(
      `${WEATHER_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`
    );
    const data = await res.json();
    handleWeatherData(data);
  } catch (err) {
    console.error(err);
    setStatus("Couldn't fetch weather for your location.");
  }
}

function handleWeatherData(data) {
  setStatus("");
  updateWeatherUI(data);
  updateBackgroundForCondition(data.weather[0].main);
  fetchAirQuality(data.coord.lat, data.coord.lon);
  fetchLocalNews(data.name);
  fetchWeeklyOutlook(data.coord.lat, data.coord.lon);
}

function updateWeatherUI(data) {
  el("cityName").textContent = `${data.name}, ${data.sys.country}`;
  el("updatedAt").textContent = `Updated ${new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  el("temperature").textContent = `${Math.round(data.main.temp)}°C`;
  el("description").textContent = data.weather[0].description;
  el("feelsLike").textContent = `Feels like ${Math.round(data.main.feels_like)}°C`;
  el("humidity").textContent = `${data.main.humidity}%`;
  el("wind").textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
  el("pressure").textContent = `${data.main.pressure} hPa`;
  el("visibility").textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  el("conditionIcon").textContent = iconForCondition(data.weather[0].main);
}

function iconForCondition(main) {
  const map = {
    Clear: "☀️",
    Clouds: "⛅",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Fog: "🌫️",
    Haze: "🌫️",
  };
  return map[main] || "🌈";
}

function updateBackgroundForCondition(main) {
  const map = {
    Clear: "clear",
    Clouds: "clouds",
    Rain: "rain",
    Drizzle: "rain",
    Thunderstorm: "thunderstorm",
    Snow: "snow",
    Mist: "mist",
    Fog: "mist",
    Haze: "mist",
  };
  document.body.setAttribute("data-condition", map[main] || "clouds");
}

// ============================================================
// AIR QUALITY
// ============================================================
async function fetchAirQuality(lat, lon) {
  try {
    const res = await fetch(`${AQI_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`);
    const data = await res.json();
    const point = data.list && data.list[0];
    if (!point) return;
    updateAqiUI(point);
  } catch (err) {
    console.error(err);
  }
}

// OpenWeatherMap only gives a coarse 1-5 index. We compute the real
// US EPA AQI (0-500 scale, the number people actually recognize) from
// the raw pollutant concentrations it already returns.
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

const PM10_BREAKPOINTS = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
  { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
];

function calcAqiFromBreakpoints(concentration, table) {
  for (const bp of table) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow
      );
    }
  }
  return table[table.length - 1].iHigh; // clamp above table range
}

function aqiCategory(aqi) {
  if (aqi <= 50) return { text: "Good", color: "#5ad46a" };
  if (aqi <= 100) return { text: "Moderate", color: "#f2c14e" };
  if (aqi <= 150) return { text: "Unhealthy for sensitive groups", color: "#f2954e" };
  if (aqi <= 200) return { text: "Unhealthy", color: "#f2504e" };
  if (aqi <= 300) return { text: "Very Unhealthy", color: "#9b5de5" };
  return { text: "Hazardous", color: "#7d1d3f" };
}

function updateAqiUI(point) {
  const c = point.components;
  const pm25Aqi = calcAqiFromBreakpoints(c.pm2_5, PM25_BREAKPOINTS);
  const pm10Aqi = calcAqiFromBreakpoints(c.pm10, PM10_BREAKPOINTS);
  const aqi = Math.max(pm25Aqi, pm10Aqi);
  const info = aqiCategory(aqi);

  el("aqiNumber").textContent = aqi;
  el("aqiLabel").textContent = info.text;
  el("aqiDial").style.setProperty("--aqi-color", info.color);

  el("pm25").textContent = `${c.pm2_5.toFixed(1)} µg/m³`;
  el("pm10").textContent = `${c.pm10.toFixed(1)} µg/m³`;
  el("no2").textContent = `${c.no2.toFixed(1)} µg/m³`;
  el("o3").textContent = `${c.o3.toFixed(1)} µg/m³`;
}

// ============================================================
// LOCAL NEWS
// ============================================================
async function fetchLocalNews(cityName) {
  const list = el("newsList");
  list.innerHTML = `<li class="news-empty">Loading local headlines...</li>`;

  if (!NEWSDATA_KEY || NEWSDATA_KEY === "YOUR_NEWSDATA_KEY") {
    list.innerHTML = `<li class="news-empty">Add a newsdata.io key in script.js to enable local headlines.</li>`;
    return;
  }

  try {
    const res = await fetch(
      `${NEWS_URL}?apikey=${NEWSDATA_KEY}&q=${encodeURIComponent(cityName)}&language=en`
    );
    const data = await res.json();

    if (data.status !== "success" || !data.results || data.results.length === 0) {
      list.innerHTML = `<li class="news-empty">No recent local headlines found.</li>`;
      return;
    }

    list.innerHTML = "";
    data.results.slice(0, 5).forEach((article) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = article.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = article.title;

      const source = document.createElement("span");
      source.className = "news-source";
      source.textContent = article.source_name || article.source_id || "News";

      a.appendChild(source);
      li.appendChild(a);
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = `<li class="news-empty">News unavailable right now — check the key or your network.</li>`;
  }
}

// ============================================================
// 7-DAY TREND + UPCOMING OUTLOOK (Open-Meteo — free, no key needed)
// ============================================================
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

let trendChartInstance = null;
let lastDailyData = null;

async function fetchWeeklyOutlook(lat, lon) {
  try {
    const url =
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&past_days=7&forecast_days=6&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.daily || !data.daily.time) {
      el("outlookRow").innerHTML = `<p class="news-empty">Outlook unavailable right now.</p>`;
      return;
    }

    lastDailyData = data.daily;
    renderTrendChart(data.daily);
    renderOutlook(data.daily);
  } catch (err) {
    console.error(err);
    el("outlookRow").innerHTML = `<p class="news-empty">Outlook unavailable right now.</p>`;
  }
}

function weatherEmoji(code) {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ([51, 53, 55, 56, 57, 80, 81].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function weatherLabel(code) {
  if (code === 0) return "Sunny";
  if (code === 1 || code === 2) return "Mostly sunny";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if ([51, 53, 55, 56, 57, 80, 81].includes(code)) return "Light rain";
  if ([61, 63, 65, 66, 67, 82].includes(code)) return "Rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowy";
  if ([95, 96, 99].includes(code)) return "Storms";
  return "Mixed";
}

function findTodayIndex(timeArray) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const idx = timeArray.findIndex((d) => d >= todayStr);
  return idx === -1 ? timeArray.length - 1 : idx;
}

function renderTrendChart(daily) {
  const canvas = el("trendChart");
  if (!canvas || typeof Chart === "undefined") return;

  const splitIndex = findTodayIndex(daily.time);
  const labels = daily.time.map((d) =>
    new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })
  );

  const pastHigh = daily.temperature_2m_max.map((v, i) => (i <= splitIndex ? v : null));
  const futureHigh = daily.temperature_2m_max.map((v, i) => (i >= splitIndex ? v : null));
  const low = daily.temperature_2m_min;

  const isDark = document.body.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "rgba(238,242,247,0.85)" : "rgba(22,32,46,0.85)";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(22,32,46,0.08)";

  if (trendChartInstance) trendChartInstance.destroy();

  trendChartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "High (past)",
          data: pastHigh,
          borderColor: "#ffb454",
          backgroundColor: "transparent",
          tension: 0.35,
          spanGaps: false,
          pointRadius: 3,
        },
        {
          label: "High (forecast)",
          data: futureHigh,
          borderColor: "#ffb454",
          borderDash: [6, 4],
          backgroundColor: "transparent",
          tension: 0.35,
          spanGaps: false,
          pointRadius: 3,
        },
        {
          label: "Low",
          data: low,
          borderColor: "#6fd3ff",
          backgroundColor: "transparent",
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: textColor, boxWidth: 14, font: { size: 11 } } },
      },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: {
          ticks: { color: textColor, font: { size: 10 }, callback: (v) => `${v}°` },
          grid: { color: gridColor },
        },
      },
    },
  });
}

function renderOutlook(daily) {
  const row = el("outlookRow");
  const todayStr = new Date().toISOString().slice(0, 10);
  const startIdx = daily.time.findIndex((d) => d > todayStr);

  if (startIdx === -1) {
    row.innerHTML = `<p class="news-empty">No upcoming forecast available.</p>`;
    return;
  }

  const endIdx = Math.min(startIdx + 5, daily.time.length);
  row.innerHTML = "";

  for (let i = startIdx; i < endIdx; i++) {
    const dayLabel = new Date(daily.time[i]).toLocaleDateString(undefined, { weekday: "short" });
    const code = daily.weathercode[i];
    const hi = Math.round(daily.temperature_2m_max[i]);
    const lo = Math.round(daily.temperature_2m_min[i]);
    const rain = daily.precipitation_probability_max[i];

    const card = document.createElement("div");
    card.className = "outlook-day";
    card.innerHTML = `
      <span class="day-label">${dayLabel}</span>
      <span class="day-icon">${weatherEmoji(code)}</span>
      <span class="day-temps">${hi}° <span class="lo">${lo}°</span></span>
      <span class="day-rain">${
        rain !== null && rain !== undefined ? `${rain}% rain` : weatherLabel(code)
      }</span>
    `;
    row.appendChild(card);
  }
}

// ============================================================
// LOCATION
// ============================================================
function useMyLocation() {
  if (!window.isSecureContext) {
    setStatus(
      "Location needs HTTPS or localhost to work — you're opening this as a local file:// page. Run it through a local server (e.g. VS Code Live Server) instead."
    );
    return;
  }
  if (!navigator.geolocation) {
    setStatus("Geolocation isn't supported in this browser.");
    return;
  }
  setStatus("Requesting location access...");
  navigator.geolocation.getCurrentPosition(
    (pos) => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        setStatus("Location access denied — allow it in your browser's site settings, or search a city instead.");
      } else if (err.code === err.TIMEOUT) {
        setStatus("Location request timed out — try again or search a city.");
      } else {
        setStatus("Couldn't get your location — try searching a city instead.");
      }
    }
  );
}

// ============================================================
// EVENTS
// ============================================================
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  getWeatherByCity(cityInput.value);
});

locateBtn.addEventListener("click", useMyLocation);

// ============================================================
// INIT
// ============================================================
initTheme();
useMyLocation();
