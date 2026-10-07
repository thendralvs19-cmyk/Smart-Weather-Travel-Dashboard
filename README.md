# Smart Weather & Travel Dashboard

A frontend-only dashboard that shows live weather for any city, a 5-day forecast, and travel advice that changes with the weather. Built with plain HTML, CSS and vanilla JavaScript. No frameworks, no backend, no build step.

## Features

- **City search** with input validation, a loading indicator and clear error messages (invalid city, bad API key, network failure, rate limit)
- **Current weather**: city and country, temperature, condition, feels-like, humidity, wind speed, pressure, visibility, sunrise and sunset (in the city's local time)
- **5-day forecast** cards with date, icon, temperature, condition, and minimum / maximum temperature
- **Dynamic icons and colours**: Clear, Clouds, Rain, Drizzle, Thunderstorm, Snow and Mist/Fog, with day and night variants. The page colour theme changes with the weather
- **Travel suggestions** based on condition, temperature and wind (sunny, rainy, cloudy, very hot, cold, thunderstorm and more)
- **°C / °F switch** that converts instantly without a new API call
- **Quick-pick cities** and the last searched city is remembered
- **Responsive design** for desktop, tablet and mobile (CSS Grid and Flexbox)
- **Accessible**: semantic HTML, labelled form controls, skip link, keyboard focus styles, live status messages, reduced-motion support

## Technologies Used

- HTML5 (semantic elements)
- CSS3 (custom properties, Grid, Flexbox, transitions, media queries)
- Vanilla JavaScript (ES6+): `let` / `const`, arrow functions, template literals, destructuring, spread and rest, `map()` / `filter()` / `forEach()` / `reduce()`, `async` / `await`, `fetch()`, `Promise.all`, `try` / `catch` / `finally`, DOM manipulation, event listeners and event delegation
- [OpenWeatherMap API](https://openweathermap.org/api): Current Weather and 5 Day / 3 Hour Forecast

## Project Structure

```
smart-weather-travel-dashboard/
├── index.html   # page structure
├── style.css    # styling and weather themes
├── script.js    # logic, API calls and rendering
└── README.md
```

## How to Run the Project

1. Download or clone this repository and open the folder.
2. [Add your API key](#how-to-add-the-api-key) in `script.js`.
3. Open `index.html` in any modern browser (double-click it), **or** use the VS Code **Live Server** extension: right-click `index.html` and choose **Open with Live Server**.

No installation is needed.

## How to Add the API Key

1. Create a free account at <https://openweathermap.org/api> and copy your key from **My API keys**.
2. Open `script.js` and find this line near the top:

   ```js
   const API_KEY = "YOUR_API_KEY_HERE";
   ```

3. Replace `YOUR_API_KEY_HERE` with your key and save the file.

**Notes**

- A new key can take up to a couple of hours to activate. Until then the dashboard shows an "API key was rejected" message.
- Because this is a frontend-only project, any key in `script.js` is visible to anyone who opens the site. Do not commit your real key to a public repository. Keep the placeholder in the code you push, or use a free-tier key you are happy to rotate.

## GitHub Deployment Instructions

### 1. Upload the project

```bash
cd smart-weather-travel-dashboard
git init
git add .
git commit -m "Add Smart Weather & Travel Dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/smart-weather-travel-dashboard.git
git push -u origin main
```

Create the empty repository on GitHub first (**New repository**, no README, no .gitignore).

### 2. Publish with GitHub Pages

1. Open the repository on GitHub and go to **Settings** then **Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then click **Save**.
4. After a minute or two your site is live at:
   `https://<your-username>.github.io/smart-weather-travel-dashboard/`

The live site only works if `script.js` contains a valid API key (see the note above about key visibility).

## Screenshots

Add your screenshots to a `screenshots/` folder and link them here.

| Desktop | Mobile |
| --- | --- |
| ![Desktop view](screenshots/desktop.png) | ![Mobile view](screenshots/mobile.png) |

## License

Free to use for learning and personal projects.
