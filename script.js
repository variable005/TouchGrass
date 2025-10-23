// --- API Endpoints (Open-Meteo, no key needed!) ---
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

// --- State Variables ---
let isUnhingedMode = false;
let lastWeatherData = null;
let lastAqiData = null;

// --- DOM Elements ---
const body = document.body;
// const contentWrapper = document.querySelector('.content-wrapper'); // <-- REMOVED
const loaderContainer = document.getElementById('loaderContainer');
const loaderText = document.getElementById('loaderText');

const headerContent = document.getElementById('headerContent');
const mainContent = document.getElementById('mainContent');
const footerContent = document.getElementById('footerContent');

const iconContainer = document.getElementById('iconContainer');
const weatherText = document.getElementById('weatherText');
const weatherTime = document.getElementById('weatherTime');
const cityInput = document.getElementById('cityInput');

const weatherQuote = document.getElementById('weatherQuote');
const detailFeelsLike = document.getElementById('detailFeelsLike');
const detailHumidity = document.getElementById('detailHumidity');
const detailWind = document.getElementById('detailWind');
const detailPrecip = document.getElementById('detailPrecip');
const detailAqi = document.getElementById('detailAqi');
const detailUv = document.getElementById('detailUv');
const detailSuggestion = document.getElementById('detailSuggestion');
const suggestionLabel = document.getElementById('suggestionLabel');
const footerSubtext = document.getElementById('footerSubtext');

const modeToggle = document.getElementById('modeToggle');

// --- NEW --- Forecast DOM Elements
const hourlyContainer = document.getElementById('hourlyContainer');
const dailyContainer = document.getElementById('dailyContainer');
const hourlyLabel = document.getElementById('hourlyLabel');
const dailyLabel = document.getElementById('dailyLabel');


// --- Event Listeners ---
window.addEventListener('load', initializeApp); // --- MODIFIED ---
cityInput.addEventListener('keyup', handleSearch);
modeToggle.addEventListener('change', handleModeToggle);

// --- 1. --- MODIFIED --- Initialization ---
function initializeApp() {
    loadPreferences();
    getInitialWeather();
}

// --- NEW --- Load preferences from localStorage
function loadPreferences() {
    const savedMode = localStorage.getItem('unhingedMode');
    if (savedMode === 'true') {
        isUnhingedMode = true;
        modeToggle.checked = true;
    }
}

function handleSearch(event) {
    if (event.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            loaderContainer.classList.remove('hidden');
            loaderText.textContent = isUnhingedMode ? 'Finding that fucking place...' : 'Finding that freaking place...';
            // Hide content for new search
            headerContent.classList.add('hidden');
            mainContent.classList.add('hidden');
            footerContent.classList.add('hidden');
            getWeatherForCity(city);
        }
    }
}

// --- Toggle Handler ---
function handleModeToggle() {
    isUnhingedMode = modeToggle.checked;
    localStorage.setItem('unhingedMode', isUnhingedMode); // --- NEW --- Save preference

    // If we have data, just re-render the UI with the new text
    if (lastWeatherData && lastAqiData) {
        updateUI(lastWeatherData, lastAqiData);
    }

    // Update loader text for the *next* load
    updateLoaderText();
}

// --- Loader Text Updater ---
function updateLoaderText() {
    loaderText.innerHTML = isUnhingedMode ? 'Getting the<br>fucking<br>location...' : 'Getting the<br>freaking<br>location...';
}


// --- 2. Get Weather on Load (Geolocation or localStorage) --- MODIFIED ---
function getInitialWeather() {
    updateLoaderText(); // Set initial loader text based on default mode

    const savedLocation = localStorage.getItem('lastLocation'); // --- NEW ---
    if (savedLocation) {
        loaderText.innerHTML = isUnhingedMode ? "Found your<br>last fucking<br>spot..." : "Found your<br>last spot...";
        const { latitude, longitude } = JSON.parse(savedLocation);
        fetchAndDisplayWeather(latitude, longitude);
    } else {
        navigator.geolocation.getCurrentPosition(positionSuccess, positionError);
    }
}

function positionSuccess(pos) {
    const { latitude, longitude } = pos.coords;
    // --- NEW --- Save location
    localStorage.setItem('lastLocation', JSON.stringify({ latitude, longitude }));
    fetchAndDisplayWeather(latitude, longitude);
}

function positionError() {
    loaderText.textContent = isUnhingedMode ? "Fucking location is off. Type a city." : "Freaking location is off. Type a city.";
    // Hide loader so the user can see the search bar
    loaderContainer.classList.add('hidden');
    headerContent.classList.remove('hidden'); // Show header
}

// --- 3. Get Weather from Search ---
async function getWeatherForCity(city) {
    try {
        const response = await fetch(`${GEOCODING_API}?name=${city}&count=1`);
        if (!response.ok) throw new Error('Could not find city');

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            throw new Error(isUnhingedMode ? 'No fucking clue where that is.' : 'No idea where that is.');
        }

        const { latitude, longitude } = data.results[0];
        // --- NEW --- Save location
        localStorage.setItem('lastLocation', JSON.stringify({ latitude, longitude }));
        fetchAndDisplayWeather(latitude, longitude);

    } catch (error) {
        loaderText.textContent = error.message;
        // Hide loader so user can try again
        setTimeout(() => {
            loaderContainer.classList.add('hidden');
            headerContent.classList.remove('hidden'); // Show header
        }, 2000);
    }
}

// --- 4. SCALABLE FETCHING --- MODIFIED ---
async function fetchWeatherData(latitude, longitude) {
    // --- MODIFIED --- Added hourly and daily params
    const params = `?latitude=${latitude}&longitude=${longitude}
&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,uv_index
&hourly=temperature_2m,weather_code&forecast_days=1
&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7
&timezone=auto`;

    const response = await fetch(`${WEATHER_API}${params.replace(/\s/g, '')}`); // Remove whitespace from params
    if (!response.ok) throw new Error('Failed to fetch weather');
    return response.json();
}

async function fetchAqiData(latitude, longitude) {
    const params = `?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;
    const response = await fetch(`${AIR_QUALITY_API}${params}`);
    if (!response.ok) throw new Error('Failed to fetch air quality');
    return response.json();
}

async function fetchAndDisplayWeather(latitude, longitude) {
    try {
        const [weatherData, aqiData] = await Promise.all([
            fetchWeatherData(latitude, longitude),
            fetchAqiData(latitude, longitude)
        ]);

        // --- Cache the data ---
        lastWeatherData = weatherData;
        lastAqiData = aqiData;

        updateUI(weatherData, aqiData);

    } catch (error) {
        console.error(error);
        loaderText.textContent = isUnhingedMode ? "Couldn't get all the fucking data." : "Couldn't get all the data.";
        setTimeout(() => {
            loaderContainer.classList.add('hidden');
            headerContent.classList.remove('hidden'); // Show header
        }, 2000);
    }
}

// --- 5. Update UI Function --- MODIFIED ---
function updateUI(weatherData, aqiData) {
    const { current, daily, hourly } = weatherData; // --- MODIFIED ---
    const { current: currentAqi } = aqiData;
    const temp = Math.round(current.temperature_2m);

    // --- Pass mode to get text ---
    const brutal = getBrutalInterpretation(current, currentAqi);

    // Update background
    body.style.background = brutal.gradient; // <-- REVERTED

    // Update Main Text
    weatherText.textContent = `${temp}°C & ${brutal.mainText}`;

    // Update Quote
    weatherQuote.textContent = `"${brutal.quote}"`;

    // Update All Details
    detailFeelsLike.textContent = brutal.feelsLike;
    detailHumidity.textContent = brutal.humidity;
    detailWind.textContent = brutal.wind;
    detailPrecip.textContent = brutal.precipitation;
    detailAqi.textContent = brutal.aqi;
    detailUv.textContent = brutal.uv;
    detailSuggestion.textContent = brutal.suggestion;

    // --- Update UI elements with mode-specific text ---
    suggestionLabel.textContent = isUnhingedMode ? "FUCKING SUGGESTION" : "SUGGESTION";
    cityInput.placeholder = isUnhingedMode ? "Or type a fucking city..." : "Or type a city or town...";
    footerSubtext.textContent = isUnhingedMode ? "You can look outside to get more information." : "Looking outside is also an option.";
    // --- NEW ---
    hourlyLabel.textContent = isUnhingedMode ? "THE NEXT 24 FUCKING HOURS" : "FOR THE NEXT 24 HOURS";
    dailyLabel.textContent = isUnhingedMode ? "THE NEXT 7 FUCKING DAYS" : "FOR THE NEXT 7 DAYS";


    // Update time
    weatherTime.textContent = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Show the correct icon
    document.querySelectorAll('.weather-icon svg').forEach(svg => {
        svg.style.display = 'none';
    });
    document.getElementById(brutal.iconId).style.display = 'block'; // --- MODIFIED ---

    // --- NEW --- Update Forecasts
    updateHourlyUI(hourly);
    updateDailyUI(daily);

    // Show content, hide loader
    loaderContainer.classList.add('hidden');
    headerContent.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    footerContent.classList.remove('hidden');
}

// --- 6. THE "USP": Brutal Text & Visuals (NOW MODE-AWARE) --- MODIFIED ---
function getBrutalInterpretation(current, currentAqi) {
    const { weather_code, is_day, temperature_2m, apparent_temperature,
        relative_humidity_2m, wind_speed_10m, precipitation, uv_index } = current;

    const { us_aqi } = currentAqi;
    const temp = Math.round(temperature_2m);

    // --- Text helper ---
    const T = (safe, unhinged) => isUnhingedMode ? unhinged : safe;

    let brutal = {
        mainText: T("freaking... something.", "fucking... something."),
        quote: T("I have no clue what's going on. Look outside.", "I have no fucking clue what's going on. Look outside."),
        suggestion: T("I'm stumped. Good luck out there.", "I'm stumped. Good luck out there."),
        iconId: "icon-cloud",
        gradient: "linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)"
    };

    switch (true) {
        case (weather_code === 0):
            brutal.mainText = T("freaking clear.", "fucking clear.");
            brutal.quote = T(is_day ? "It's nice. Go touch grass or whatever." : "It's night. Go to sleep.", is_day ? "It's nice. Go touch grass or whatever." : "It's night. Go the fuck to sleep.");
            brutal.suggestion = T(is_day ? "Stop staring at this screen and go outside." : "It's dark. Stare at the moon. Or your phone.", is_day ? "Stop staring at this screen and go the fuck outside." : "It's dark. Stare at the moon. Or your phone. Whatever.");
            brutal.iconId = is_day ? "icon-sun" : "icon-moon"; // --- MODIFIED ---
            brutal.gradient = "linear-gradient(to top, #ffecd2 0%, #fcb69f 100%)";
            break;
        case (weather_code >= 1 && weather_code <= 3):
            brutal.mainText = T("just freaking clouds.", "just fucking clouds.");
            brutal.quote = T("Not sunny, not raining. Just a whole lot of 'meh'.", "Not sunny, not raining. Just a whole lot of 'meh'.");
            brutal.suggestion = T("A perfect day for... absolutely nothing. Don't let me stop you.", "A perfect day for... absolutely fucking nothing. Don't let me stop you.");
            brutal.iconId = "icon-cloud";
            brutal.gradient = "linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)";
            break;
        case (weather_code === 45 || weather_code === 48):
            brutal.mainText = T("freaking foggy.", "fucking foggy.");
            brutal.quote = T("Can't see a thing. Good day to walk into a pole.", "Can't see shit. Good day to walk into a pole.");
            brutal.suggestion = T("Wanna look mysterious? Go for a walk. Wanna be smart? Stay inside.", "Wanna look mysterious? Go for a walk. Wanna be smart? Stay the fuck inside.");
            brutal.iconId = "icon-fog"; // --- MODIFIED ---
            brutal.gradient = "linear-gradient(to top, #bdc3c7 0%, #2c3e50 100%)";
            break;
        case (weather_code >= 51 && weather_code <= 67):
            brutal.mainText = T("freaking raining.", "fucking raining.");
            brutal.quote = T("Great. The sky is crying. Again. How original.", "Great. The sky is crying. Again. How original.");
            brutal.suggestion = T("It's wet. Order a pizza, watch a movie, and pretend you have to be productive.", "It's wet. Order a pizza, watch a movie, and pretend you have to be productive.");
            brutal.iconId = "icon-rain";
            brutal.gradient = "linear-gradient(to top, #a1c4fd 0%, #c2e9fb 100%)";
            break;
        case (weather_code >= 71 && weather_code <= 77):
            brutal.mainText = T("freaking snowing.", "fucking snowing.");
            brutal.quote = T("It's cold and wet. But hey, it looks pretty, you magnificent snow gremlin.", "It's cold and wet. But hey, it looks pretty, you fucking child.");
            brutal.suggestion = T("Go make a snowman or throw a ball of ice at your friend.", "Go make a shitty snowman or throw a ball of ice at your idiot friend.");
            brutal.iconId = "icon-snow";
            brutal.gradient = "linear-gradient(to top, #e6e9f0 0%, #eef1f5 100%)";
            break;
        case (weather_code >= 95):
            brutal.mainText = T("freaking storming.", "fucking storming.");
            brutal.quote = T("Sky's having a tantrum. Don't be a hero, stay inside.", "Sky's having a tantrum. Don't be a fucking hero, stay inside.");
            brutal.suggestion = T("The sky is mad. Don't be a hero. Stay inside.", "The sky is pissed. Don't be a hero. Stay the fuck inside.");
            brutal.iconId = "icon-storm";
            brutal.gradient = "linear-gradient(to top, #89f7fe 0%, #66a6ff 100%)";
            break;
    }

    // --- Override suggestion based on temp ---
    if (temp < 5 && is_day) {
        brutal.suggestion = T("It's freezing. Put on a warm coat if you *must* go out.", "It's fucking freezing. Put on a goddamn coat if you *must* go out.")
    } else if (temp > 35) {
        brutal.suggestion = T("It's hotter than a car seat. Stay inside, crank the AC, and melt.", "It's fucking hotter than hell. Stay inside, crank the AC, and melt.")
    }

    // --- Brutalize ALL the other details (now with T()) ---

    // Feels Like
    const feels = Math.round(apparent_temperature);
    if (feels === temp) {
        brutal.feelsLike = `${feels}°C. ${T("No surprise.", "Big fucking surprise.")}`;
    } else if (feels > temp) {
        brutal.feelsLike = `${feels}°C. ${T("Feels hotter. Pesky humidity.", "Feels hotter. Fucking humidity.")}`;
    } else {
        brutal.feelsLike = `${feels}°C. ${T("Feels colder. Pesky wind.", "Feels colder. Fucking wind.")}`;
    }

    // Humidity
    brutal.humidity = `${relative_humidity_2m}%. ${relative_humidity_2m > 70 ? T("Pretty sticky.", "Fucking sticky.") : T("Pretty dry.", "Dry as fuck.")}`;

    // Wind
    brutal.wind = `${wind_speed_10m} km/h. ${wind_speed_10m > 20 ? T("Hold onto your hat.", "Hold onto your fucking hat.") : T("Barely a breeze.", "Barely a fucking breeze.")}`;

    // Precipitation
    brutal.precipitation = `${precipitation} mm. ${precipitation > 0 ? T("It's wet.", "It's fucking wet.") : T("Not raining... yet.", "Not raining. Fucking yet.")}`;

    // AQI (US Index)
    const aqi = Math.round(us_aqi);
    if (aqi <= 50) {
        brutal.aqi = `${aqi}. ${T("Totally breathable.", "Fucking breathable.")}`;
    } else if (aqi <= 100) {
        brutal.aqi = `${aqi}. ${T("Kinda gross.", "Kinda fucking gross.")}`;
    } else if (aqi <= 150) {
        brutal.aqi = `${aqi}. ${T("Pretty wheezy.", "Fucking wheezy.")}`;
    } else if (aqi <= 200) {
        brutal.aqi = `${aqi}. ${T("Pretty nasty.", "Fucking nasty.")}`;
    } else if (aqi <= 300) {
        brutal.aqi = `${aqi}. ${T("SERIOUSLY TOXIC.", "FUCKING TOXIC.")}`;
    } else {
        brutal.aqi = `${aqi}. ${T("SERIOUSLY HAZARDOUS.", "FUCKING HAZARDOUS.")}`;
    }

    // UV Index
    const uv = Math.round(uv_index);
    if (uv <= 2) {
        brutal.uv = `${uv}. ${T("Sun's pretty weak.", "Sun's fucking weak.")}`;
    } else if (uv <= 5) {
        brutal.uv = `${uv}. ${T("Sun's trying.", "Sun's trying.")}`;
    } else if (uv <= 7) {
        brutal.uv = `${uv}. ${T("Pretty toasty.", "Fucking toasty.")}`;
    } else if (uv <= 10) {
        brutal.uv = `${uv}. ${T("You're sizzling.", "You're fucking bacon.")}`;
    } else {
        brutal.uv = `${uv}. ${T("EXTREME. SIZZLING.", "FUCKING VILE. FRYING.")}`;
    }

    return brutal;
}

// --- 7. --- NEW --- Forecast UI Functions ---

function updateHourlyUI(hourly) {
    hourlyContainer.innerHTML = '';
    // The API gives 24 hours from the start of the day.
    // We find the current hour to start our 24-hour forecast.
    const now = new Date();
    const currentHourIndex = hourly.time.findIndex(t => new Date(t).getHours() === now.getHours());

    if (currentHourIndex === -1) return; // Can't find current hour

    for (let i = 0; i < 24; i++) {
        const index = (currentHourIndex + i) % 24; // Loop around if we hit midnight

        const time = new Date(hourly.time[index]);
        const temp = Math.round(hourly.temperature_2m[index]);
        const code = hourly.weather_code[index];

        // Simple day/night check for icon
        const hour = time.getHours();
        const is_day = hour > 6 && hour < 20;
        const timeString = (i === 0) ? "Now" : time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });

        const item = document.createElement('div');
        item.className = 'hourly-item';
        item.innerHTML = `
            <div class="time">${timeString}</div>
            <svg viewBox="0 0 24 24">${getIconContentForWeatherCode(code, is_day)}</svg>
            <div class="temp">${temp}°C</div>
        `;
        hourlyContainer.appendChild(item);
    }
}

function updateDailyUI(daily) {
    dailyContainer.innerHTML = '';
    daily.time.forEach((dateString, index) => {
        const day = formatDay(dateString, index);
        const code = daily.weather_code[index];
        const max = Math.round(daily.temperature_2m_max[index]);
        const min = Math.round(daily.temperature_2m_min[index]);

        const item = document.createElement('div');
        item.className = 'daily-item';
        item.innerHTML = `
            <div class="day">${day}</div>
            <svg viewBox="0 0 24 24">${getIconContentForWeatherCode(code, 1)}</svg> <div class="temps">
                <div class="temp-max">${max}°C</div>
                <div class="temp-min">${min}°C</div>
            </div>
        `;
        dailyContainer.appendChild(item);
    });
}

// --- 8. --- NEW --- Helper Functions ---

function formatDay(dateString, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
}

function getIconContentForWeatherCode(code, is_day = 1) {
    switch (true) {
        case (code === 0):
            return is_day
                ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' // Sun
                : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'; // Moon
        case (code >= 1 && code <= 3):
            return '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>'; // Cloud
        case (code === 45 || code === 48):
            return '<line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line>'; // Fog
        case (code >= 51 && code <= 67):
            return '<path d="M23 12a11.9 11.9 0 0 0-2.07 7.21c0 4.3-3.04 7.9-7.14 9.1A10.13 10.13 0 0 1 3.65 17c0-5.52 4.48-10 10-10a9.96 9.96 0 0 1 7.14 3.25"></path><path d="M16 14.55V16.7s0 .85-.53 .85-.53-.85-.53-.85v-2.15"></path><path d="M12.47 16.7v-2.15s0-.85-.54-.85-.53.85-.53.85v2.15"></path><path d="M8.93 16.7v-2.15s0-.85-.53-.85S7.87 14.55 7.87 14.55v2.15"></path>'; // Rain
        case (code >= 71 && code <= 77):
            return '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="1Which8"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line>'; // Snow
        case (code >= 95):
            return '<path d="M21 16.92A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline>'; // Storm
        default:
            return '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>'; // Default Cloud
    }
}
