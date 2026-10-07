/* =========================================================
   Smart Weather & Travel Dashboard - script.js
   Sections:
   1. Configuration (API key goes here)
   2. DOM references and app state
   3. Small helper functions
   4. Formatting helpers
   5. Icons and themes
   6. API calls
   7. Turning API data into simple objects
   8. Travel advice
   9. Rendering (updating the page)
   10. Search flow and event listeners
   ========================================================= */
"use strict";

/* ---------------------------------------------------------
   1. CONFIGURATION
   --------------------------------------------------------- */

// ==========================================================
// >>> PASTE YOUR OPENWEATHERMAP API KEY BETWEEN THE QUOTES <<<
// Get a free key at https://openweathermap.org/api
// Do NOT upload your real key to a public GitHub repository.
// ==========================================================
const API_KEY = "YOUR_API_KEY_HERE";

const API_BASE_URL = "https://api.openweathermap.org/data/2.5";
const STORAGE_KEY = "weatherDashboard:lastCity";
const FORECAST_DAYS = 5;
const MIN_LOADING_MS = 400; // keeps the loader visible long enough to avoid a flicker

/* ---------------------------------------------------------
   2. DOM REFERENCES AND APP STATE
   --------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

const els = {
  form: $("search-form"),
  input: $("city-input"),
  searchBtn: $("search-btn"),
  quickPicks: $("quick-picks"),
  status: $("status"),
  welcome: $("welcome"),
  dashboard: $("dashboard"),
  unitButtons: document.querySelectorAll(".unit-btn"),
  cityName: $("city-name"),
  localTime: $("local-time"),
  currentIcon: $("current-icon"),
  currentTemp: $("current-temp"),
  currentCondition: $("current-condition"),
  currentRange: $("current-range"),
  detailsGrid: $("details-grid"),
  forecastGrid: $("forecast-grid"),
  travelCard: $("travel-card"),
  travelBadge: $("travel-badge"),
  travelHeadline: $("travel-headline"),
  travelTips: $("travel-tips"),
};

// The app's memory: which unit is selected and the latest weather we fetched.
// Data is always fetched in Celsius and converted when displayed,
// so switching units never needs another API call.
const state = {
  unit: "metric", // "metric" (°C, km/h) or "imperial" (°F, mph)
  weather: null,
};

/* ---------------------------------------------------------
   3. SMALL HELPER FUNCTIONS
   --------------------------------------------------------- */

// A Promise that resolves after "ms" milliseconds
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Makes text safe to place inside innerHTML
const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Rest parameter: collects any number of arguments into an array
const average = (...numbers) => numbers.reduce((sum, n) => sum + n, 0) / numbers.length;

// The API gives times as UNIX seconds in UTC plus the city's offset from UTC.
// Adding the offset and reading the result as UTC gives the city's local time.
const shiftToCityTime = (unixSeconds, offsetSeconds) => new Date((unixSeconds + offsetSeconds) * 1000);

// "2026-10-07" style key, used to group forecast entries by local day
const localDateKey = (unix, offset) => shiftToCityTime(unix, offset).toISOString().slice(0, 10);

/* ---------------------------------------------------------
   4. FORMATTING HELPERS
   --------------------------------------------------------- */
const toFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

const formatTemp = (celsius, withUnit = true) => {
  const isMetric = state.unit === "metric";
  const value = Math.round(isMetric ? celsius : toFahrenheit(celsius));
  return `${value}°${withUnit ? (isMetric ? "C" : "F") : ""}`;
};

// The API returns wind in metres per second
const formatWind = (metersPerSecond) =>
  state.unit === "metric"
    ? `${Math.round(metersPerSecond * 3.6)} km/h`
    : `${Math.round(metersPerSecond * 2.237)} mph`;

// The API returns visibility in metres (it can be missing)
const formatVisibility = (meters) => {
  if (meters === null) return "Not available";
  return state.unit === "metric"
    ? `${(meters / 1000).toFixed(1)} km`
    : `${(meters / 1609.34).toFixed(1)} mi`;
};

const formatClock = (unix, offset) => {
  const date = shiftToCityTime(unix, offset);
  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
};

const formatLongDate = (unix, offset) =>
  shiftToCityTime(unix, offset).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

const formatShortDate = (dateKey) =>
  new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

/* ---------------------------------------------------------
   5. ICONS AND THEMES
   --------------------------------------------------------- */
const WEATHER_ICONS = {
  Clear:        { day: "☀️", night: "🌙" },
  Clouds:       { day: "☁️", night: "☁️" },
  Rain:         { day: "🌧️", night: "🌧️" },
  Drizzle:      { day: "🌦️", night: "🌧️" },
  Thunderstorm: { day: "⛈️", night: "⛈️" },
  Snow:         { day: "❄️", night: "❄️" },
};

// Mist, fog, haze, smoke and similar all share one icon and theme
const MIST_CONDITIONS = ["Mist", "Smoke", "Haze", "Dust", "Fog", "Sand", "Ash", "Squall"];

// iconCode comes from the API, e.g. "01d" (day) or "01n" (night)
const getWeatherIcon = (condition, iconCode = "") => {
  const isNight = iconCode.endsWith("n");

  if (MIST_CONDITIONS.includes(condition)) return "🌫️";
  if (condition === "Tornado") return "🌪️";
  if (condition === "Clouds" && iconCode.startsWith("02")) return isNight ? "☁️" : "⛅"; // few clouds

  const set = WEATHER_ICONS[condition];
  return set ? (isNight ? set.night : set.day) : "🌡️";
};

// Picks the colour theme (see body[data-weather] in style.css)
const getThemeKey = (condition, iconCode = "") => {
  if (condition === "Thunderstorm") return "thunderstorm";
  if (condition === "Rain" || condition === "Drizzle") return "rain";
  if (condition === "Snow") return "snow";
  if (condition === "Clouds") return "clouds";
  if (MIST_CONDITIONS.includes(condition)) return "mist";
  if (condition === "Clear" && iconCode.endsWith("n")) return "night";
  return "clear";
};

/* ---------------------------------------------------------
   6. API CALLS
   --------------------------------------------------------- */

// Always request metric units; we convert to °F ourselves if needed
const buildUrl = (endpoint, city) =>
  `${API_BASE_URL}/${endpoint}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

// Fetches JSON and turns every kind of failure into a readable Error
const fetchJson = async (url) => {
  let response;

  try {
    response = await fetch(url);
  } catch {
    // fetch() only rejects when the request could not be made at all
    throw new Error("Network error. Check your internet connection and try again.");
  }

  if (!response.ok) {
    const messages = {
      401: "Your API key was rejected. Check it in script.js. New keys can take up to a couple of hours to activate.",
      404: "City not found. Check the spelling or try adding the country, like \"Paris, FR\".",
      429: "Too many requests right now. Wait a minute and try again.",
    };
    throw new Error(messages[response.status] ?? `The weather service had a problem (error ${response.status}). Try again later.`);
  }

  return response.json();
};

// Current weather and forecast are requested at the same time with Promise.all
const getWeatherData = async (city) => {
  const [current, forecast] = await Promise.all([
    fetchJson(buildUrl("weather", city)),
    fetchJson(buildUrl("forecast", city)),
  ]);
  return { current, forecast };
};

/* ---------------------------------------------------------
   7. TURNING API DATA INTO SIMPLE OBJECTS
   --------------------------------------------------------- */

// The forecast API returns one entry every 3 hours.
// Here we group them by day and pick min, max and a midday representative.
const buildDailyForecast = (forecast, todayKey) => {
  const { list, city: { timezone } } = forecast;

  // Group entries by local date: { "2026-10-08": [entry, entry, ...], ... }
  const groups = list.reduce((acc, entry) => {
    const key = localDateKey(entry.dt, timezone);
    return { ...acc, [key]: [...(acc[key] ?? []), entry] }; // spread operators
  }, {});

  return Object.entries(groups)
    .filter(([dateKey]) => dateKey !== todayKey) // forecast starts tomorrow
    .slice(0, FORECAST_DAYS)
    .map(([dateKey, entries]) => {
      // The entry closest to midday represents the day's icon and condition
      const hourOf = (entry) => shiftToCityTime(entry.dt, timezone).getUTCHours();
      const midday = entries.reduce((best, entry) =>
        Math.abs(hourOf(entry) - 12) < Math.abs(hourOf(best) - 12) ? entry : best);

      const { weather: [{ main: condition, description, icon }] } = midday;

      return {
        dateKey,
        condition,
        description,
        icon,
        temp: average(...entries.map((e) => e.main.temp)),
        min: Math.min(...entries.map((e) => e.main.temp_min)),
        max: Math.max(...entries.map((e) => e.main.temp_max)),
      };
    });
};

// Destructuring pulls the values we need out of the big API response
const processWeather = ({ current, forecast }) => {
  const {
    name, dt, timezone, visibility = null,
    sys: { country = "", sunrise, sunset },
    main: { temp, feels_like: feelsLike, humidity, pressure, temp_min: tempMin, temp_max: tempMax },
    weather: [{ main: condition, description, icon }],
    wind: { speed: windSpeed = 0 },
  } = current;

  const todayKey = localDateKey(dt, timezone);

  // Today's high and low use today's forecast entries as well as the current reading
  const todayTemps = forecast.list
    .filter((entry) => localDateKey(entry.dt, timezone) === todayKey)
    .flatMap((entry) => [entry.main.temp_min, entry.main.temp_max]);

  return {
    name, country, dt, timezone, visibility, sunrise, sunset,
    temp, feelsLike, humidity, pressure, condition, description, icon, windSpeed,
    low: Math.min(tempMin, ...todayTemps),
    high: Math.max(tempMax, ...todayTemps),
    days: buildDailyForecast(forecast, todayKey),
  };
};

/* ---------------------------------------------------------
   8. TRAVEL ADVICE
   --------------------------------------------------------- */

// Main message for each weather type
const CONDITION_ADVICE = {
  Clear:        "Great day for sightseeing and outdoor activities.",
  Clouds:       "Good weather for exploring the city.",
  Rain:         "Carry an umbrella and consider indoor attractions.",
  Drizzle:      "Carry an umbrella and consider indoor attractions.",
  Thunderstorm: "Avoid outdoor travel and stay indoors.",
  Snow:         "Dress warmly, expect slippery streets and allow extra travel time.",
};
const MIST_ADVICE = "Visibility may be low. Keep to main routes and allow extra travel time.";

// Each tip has a test function. Only tips whose test passes are shown.
const TIP_RULES = [
  { test: ({ condition }) => ["Rain", "Drizzle", "Thunderstorm"].includes(condition), text: "Pack a waterproof jacket and water-resistant shoes." },
  { test: ({ condition, tempC }) => condition === "Clear" && tempC >= 18 && tempC <= 32, text: "Comfortable temperatures for walking tours, parks and viewpoints." },
  { test: ({ condition, tempC }) => condition === "Clear" && tempC >= 25, text: "Wear sunscreen and sunglasses." },
  { test: ({ tempC }) => tempC >= 30, text: "Drink water often and rest in the shade or in air-conditioned places." },
  { test: ({ tempC }) => tempC <= 10, text: "Wear layers and bring a warm jacket, hat and gloves." },
  { test: ({ condition, tempC }) => condition === "Snow" || tempC <= 0, text: "Wear shoes with good grip and check road or flight updates." },
  { test: ({ windKmh }) => windKmh >= 40, text: "Strong wind: secure loose items and avoid exposed spots like coasts." },
  { test: ({ condition }) => MIST_CONDITIONS.includes(condition), text: "Use headlights when driving and expect limited views." },
  { test: ({ humidity, tempC }) => humidity >= 80 && tempC >= 24, text: "It will feel humid. Choose light, breathable clothing." },
  { test: ({ condition }) => condition === "Clouds", text: "Cloud cover keeps things cooler, which suits long walks and photography." },
];

// Returns { headline, level, badge, tips } for the current weather
const getTravelAdvice = ({ condition, temp, windSpeed, humidity }) => {
  const context = { condition, tempC: temp, windKmh: windSpeed * 3.6, humidity };

  // The most serious situation wins the main message
  let headline = CONDITION_ADVICE[condition] ?? (MIST_CONDITIONS.includes(condition) ? MIST_ADVICE : "Check local conditions before you head out.");
  let level = "good";

  if (condition === "Thunderstorm") {
    level = "warning";
  } else if (temp >= 35) {
    headline = "Stay hydrated and avoid long outdoor activities.";
    level = "caution";
  } else if (temp <= 5) {
    headline = "Carry warm clothes and plan indoor activities.";
    level = "caution";
  } else if (["Rain", "Drizzle", "Snow", ...MIST_CONDITIONS].includes(condition)) {
    level = "caution";
  }

  const tips = TIP_RULES
    .filter(({ test }) => test(context))
    .map(({ text }) => text);

  const badges = { good: "Good to go", caution: "Plan around the weather", warning: "Stay safe indoors" };

  return {
    headline,
    level,
    badge: badges[level],
    tips: tips.length > 0 ? tips : ["Check the forecast again before you leave."],
  };
};

/* ---------------------------------------------------------
   9. RENDERING
   --------------------------------------------------------- */
const renderCurrent = (weather) => {
  const { name, country, dt, timezone, condition, description, icon, temp, feelsLike, low, high } = weather;

  els.cityName.textContent = country ? `${name}, ${country}` : name;
  els.localTime.textContent = `${formatLongDate(dt, timezone)}, ${formatClock(dt, timezone)} local time`;
  els.currentIcon.textContent = getWeatherIcon(condition, icon);
  els.currentTemp.textContent = formatTemp(temp);
  els.currentCondition.textContent = capitalize(description);
  els.currentRange.textContent = `Feels like ${formatTemp(feelsLike)}. High ${formatTemp(high)}, low ${formatTemp(low)}.`;

  // Re-colour the whole page to match the weather
  document.body.dataset.weather = getThemeKey(condition, icon);
  document.title = `${name} weather | Smart Weather & Travel Dashboard`;
};

const renderDetails = (weather) => {
  const { feelsLike, humidity, windSpeed, pressure, visibility, low, high, sunrise, sunset, timezone } = weather;

  const items = [
    { icon: "🌡️", label: "Feels like", value: formatTemp(feelsLike) },
    { icon: "💧", label: "Humidity", value: `${humidity}%` },
    { icon: "💨", label: "Wind speed", value: formatWind(windSpeed) },
    { icon: "🧭", label: "Pressure", value: `${pressure} hPa` },
    { icon: "👁️", label: "Visibility", value: formatVisibility(visibility) },
    { icon: "📈", label: "Today's range", value: `${formatTemp(low, false)} to ${formatTemp(high)}` },
    { icon: "🌅", label: "Sunrise", value: formatClock(sunrise, timezone) },
    { icon: "🌇", label: "Sunset", value: formatClock(sunset, timezone) },
  ];

  els.detailsGrid.innerHTML = items
    .map(({ icon, label, value }) => `
      <div>
        <dt><span aria-hidden="true">${icon}</span> ${label}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>`)
    .join("");
};

const renderForecast = (days) => {
  els.forecastGrid.innerHTML = days
    .map(({ dateKey, condition, description, icon, temp, min, max }) => `
      <li class="forecast-card">
        <span class="f-date">${formatShortDate(dateKey)}</span>
        <span class="f-icon" aria-hidden="true">${getWeatherIcon(condition, icon)}</span>
        <span class="f-temp">${formatTemp(temp)}</span>
        <span class="f-cond">${escapeHtml(capitalize(description))}</span>
        <span class="f-range">Low ${formatTemp(min, false)} / High ${formatTemp(max)}</span>
      </li>`)
    .join("");
};

const renderTravel = (weather) => {
  const { headline, level, badge, tips } = getTravelAdvice(weather);

  els.travelCard.dataset.level = level;
  els.travelBadge.textContent = badge;
  els.travelHeadline.textContent = headline;
  els.travelTips.innerHTML = tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("");
};

// Draws everything. Called after a search and again when the unit changes.
const renderAll = () => {
  if (!state.weather) return;

  renderCurrent(state.weather);
  renderDetails(state.weather);
  renderForecast(state.weather.days);
  renderTravel(state.weather);

  els.welcome.hidden = true;
  els.dashboard.hidden = false;
};

/* Status messages: "loading", "error" or "info" */
const showStatus = (type, message) => {
  const spinner = type === "loading" ? '<span class="spinner" aria-hidden="true"></span>' : "";
  els.status.className = `status status-${type}`;
  els.status.innerHTML = `${spinner}<span>${escapeHtml(message)}</span>`;
  els.status.hidden = false;
};

const clearStatus = () => {
  els.status.hidden = true;
  els.status.textContent = "";
};

const setLoading = (isLoading) => {
  els.searchBtn.disabled = isLoading;
  els.input.disabled = isLoading;
  isLoading ? showStatus("loading", "Fetching weather data...") : els.input.focus();
};

/* ---------------------------------------------------------
   10. SEARCH FLOW AND EVENT LISTENERS
   --------------------------------------------------------- */
const validateCity = (city) => {
  if (!city) return "Please enter a city name.";
  if (city.length < 2) return "City names need at least 2 characters.";
  if (!/^[\p{L}\s,.'-]+$/u.test(city)) return "Use letters only, for example \"Paris\" or \"Paris, FR\".";
  return null; // null means "no problem"
};

const saveLastCity = (city) => {
  try { localStorage.setItem(STORAGE_KEY, city); } catch { /* storage may be blocked; ignore */ }
};

const loadLastCity = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

const handleSearch = async (rawCity) => {
  const city = rawCity.trim();

  const problem = validateCity(city);
  if (problem) return showStatus("error", problem);

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return showStatus("error", "API key missing. Open script.js and replace YOUR_API_KEY_HERE with your OpenWeatherMap key.");
  }

  setLoading(true);

  try {
    // Wait for the data AND the minimum loading time
    const [data] = await Promise.all([getWeatherData(city), wait(MIN_LOADING_MS)]);

    state.weather = processWeather(data);
    saveLastCity(state.weather.name);
    renderAll();
    clearStatus();
  } catch (error) {
    showStatus("error", error.message);
  } finally {
    setLoading(false); // runs whether the request worked or failed
  }
};

const handleUnitChange = (unit) => {
  state.unit = unit;
  els.unitButtons.forEach((button) => {
    const isActive = button.dataset.unit === unit;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderAll(); // no new API call needed
};

const init = () => {
  // Search form (Enter key and Search button both trigger "submit")
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSearch(els.input.value);
  });

  // One listener handles all quick-pick buttons (event delegation)
  els.quickPicks.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-city]");
    if (!button) return;
    els.input.value = button.dataset.city;
    handleSearch(button.dataset.city);
  });

  // Unit toggle buttons
  els.unitButtons.forEach((button) =>
    button.addEventListener("click", () => handleUnitChange(button.dataset.unit)));

  // Restore the last searched city, or explain the API key step
  const hasKey = API_KEY && API_KEY !== "YOUR_API_KEY_HERE";
  if (!hasKey) {
    showStatus("info", "Add your free OpenWeatherMap API key in script.js to start searching.");
    return;
  }

  const lastCity = loadLastCity();
  if (lastCity) {
    els.input.value = lastCity;
    handleSearch(lastCity);
  }
};

init();
