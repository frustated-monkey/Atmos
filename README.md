# 🌦️ Atmos — Weather, Air Quality & Local News

A glassmorphic weather dashboard that goes beyond temperature: real-time conditions, actual EPA-standard air quality, a 7-day trend graph with an upcoming forecast, and local news headlines for whatever city you search — all in one clean, theme-aware interface.

No frameworks, no build step. Open it and it works.

---

## ✨ Features

**Live weather**
- Search any city, or auto-detect your location on load
- Temperature, feels-like, humidity, wind, pressure, and visibility
- Background ambiance shifts to match the actual weather condition (clear, rain, snow, storm, mist)

**Real Air Quality Index**
- Computes the actual US EPA AQI (0–500 scale) from raw PM2.5/PM10 data — not the generic 1–5 index most weather APIs stop at
- Color-coded dial with the standard Good → Hazardous bands
- Full pollutant breakdown: PM2.5, PM10, NO₂, O₃

**7-day trend + upcoming outlook**
- Line graph of the past week's highs and lows, flowing into a dashed forecast line for what's coming
- Daily outlook cards with a rain-chance percentage or a sunny/cloudy call for the next several days

**Local news**
- Pulls recent headlines matching the searched city, so a search for "Delhi" surfaces Delhi-relevant news, not just the weather

**Design**
- Glassmorphism throughout — frosted, blurred cards over soft ambient color
- Dark/light theme toggle, remembers your preference
- Fully responsive, keyboard-accessible, respects reduced-motion preferences

---

## 🧱 Tech stack

Plain HTML, CSS, and vanilla JavaScript — no build tools, no dependencies to install. The only external library is [Chart.js](https://www.chartjs.org/), loaded via CDN for the trend graph.

| File | Role |
|---|---|
| `index.html` | Structure and layout |
| `style.css` | Glassmorphism, theming, responsive layout |
| `script.js` | API calls, AQI math, chart rendering, all interactivity |

---

## 🔌 APIs used

| Service | What it powers | Key needed? |
|---|---|---|
| [OpenWeatherMap](https://openweathermap.org/api) — Current Weather | Temperature, humidity, wind, etc. | Yes (free tier) |
| [OpenWeatherMap](https://openweathermap.org/api/air-pollution) — Air Pollution | Raw pollutant concentrations, converted to real AQI | Same key as above |
| [Open-Meteo](https://open-meteo.com/) | Past 7 days + upcoming forecast for the trend chart | No — free, keyless |
| [newsdata.io](https://newsdata.io/) | Local news headlines by city | Yes (free tier) |

---

## ⚙️ Setup

1. Download or clone the three files into one folder.
2. Open `script.js` and drop in your own keys at the top:
   ```js
   const OPENWEATHER_KEY = "your_openweathermap_key";
   const NEWSDATA_KEY = "your_newsdata_io_key";
   ```
3. **Serve it — don't just double-click it.** Browsers block location access on `file://` pages. Use any of:
   - VS Code → *Live Server* extension → right-click `index.html` → "Open with Live Server"
   - `python -m http.server 8000` from the folder, then visit `http://localhost:8000`
   - Deploy it to Netlify, Vercel, or GitHub Pages for a real HTTPS URL

---

## ⚠️ Known limitations

- **News on live deployments**: newsdata.io's free tier works from any domain (unlike some competitors that only allow `localhost`), but free-tier rate limits are modest — expect to eventually need a paid plan under real traffic.
- **Location permission**: only prompts on HTTPS or `localhost`, per browser security rules — see Setup above.
- **Historical weather**: true multi-year historical data isn't free anywhere; the 7-day "past" view uses Open-Meteo's rolling recent-history window, which is accurate but not archived long-term.

---

## 🚀 Possible next steps

- Hourly forecast view alongside the daily one
- Saved/favorite cities list
- Unit toggle (°C / °F)
- A tiny serverless proxy to keep API keys off the client entirely

---

Built by *Frustated Monkey*
