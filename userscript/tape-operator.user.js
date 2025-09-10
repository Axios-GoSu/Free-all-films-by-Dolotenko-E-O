let initialized = false;

const containerElement = document.getElementById('container');
const playerElement = document.getElementById('player');
const titleElement = document.getElementById('title');
const versionElement = document.getElementById('version');
const contentElement = document.getElementById('content');
const sourcesElement = document.getElementById('sources');
const backgroundElement = document.getElementById('background');

const initializationTimeoutTimer = setTimeout(() => {
	showScriptErrorMessage();
	logger.error('Initialization timeout');
}, 5000);

async function init(data, scriptVersion) {
	if (initialized) return;
	try {
		clearTimeout(initializationTimeoutTimer);
		containerElement.querySelectorAll('.message').forEach((element) => element.remove());
		const movieData = parseMovieData(data);
		logger.info('Initialization started', movieData);
		const key = cacheMovieData(movieData);
		setSearchParam('movie', key);

		let sources = [];
		try {
			sources = await fetchSources(movieData)
		} catch (error) {
			showPlayerText(':(')
			showServerUnavailableMessage();
			logger.error('Error fetching data from server', error);
			return;
		}

		if (sources.length === 0) {
			showPlayerText('Фильм не найден :(');
			return;
		}

		setSources(sources);

		if (movieData?.title) {
			setTitle(movieData.title);
			sendAnalytics(movieData);
		}

		if (typeof scriptVersion === 'string') checkVersion(scriptVersion);
		backgroundElement.classList.add('visible');
		initialized = true;

	} catch (error) {
		showPlayerText(':(')
		logger.error('Error during initialization', error);
		showInitializationErrorMessage();
	}
}

async function fetchSources(movieData) {
	const apiURL = new URL(KINOBOX_API);
	Object.entries(movieData).forEach(([key, value]) => apiURL.searchParams.set(key, value));
	const request = await fetch(apiURL, { method: 'GET' });
	if (!request.ok || request?.status !== 200) throw new Error(`Request failed with status ${request.status}`);
	let response = await request.json();
	if (typeof response !== 'object' || !Array.isArray(response?.data) || response === null) throw new Error(`Invalid response type: "${typeof response}"`);
	let playersData = response.data;
	playersData = playersData.filter((player) => player?.iframeUrl && player?.type);
	const turboIndex = playersData.findIndex((player) => player.type.toLowerCase() === 'turbo');
	if (turboIndex !== -1) playersData.push(playersData.splice(turboIndex, 1)[0]);
	return playersData;
}

function setSources(sourcesData) {
	const preferredSource = localStorage.getItem('preferred-source');
	let preferredSourceIndex = sourcesData.findIndex((source) => source.type === preferredSource);
	if (preferredSourceIndex === -1) preferredSourceIndex = 0;
	sourcesData.forEach((source, index) => {
		const sourceElement = document.createElement('button');
		sourceElement.className = 'source';
		sourceElement.innerText = source?.type;
		if (index === preferredSourceIndex) {
			sourceElement.classList.add('selected');
			selectSource(source);
		}
		sourceElement.style.animationDelay = `${(5 + (sourcesData.length - index)) * 0.05}s`;
		sourceElement.addEventListener('click', () => {
			if (sourceElement.classList.contains('selected')) return;
			sourcesElement.querySelectorAll('.source').forEach((element) => element.classList.remove('selected'));
			sourceElement.classList.add('selected');
			localStorage.setItem('preferred-source', source.type);
			selectSource(source);
		});
		sourcesElement.appendChild(sourceElement);
	});
}

function selectSource(sourceData) {
	const iframe = document.createElement('iframe');
	iframe.src = sourceData?.iframeUrl;
	iframe.allowFullscreen = true;
	contentElement.innerHTML = '';
	contentElement.appendChild(iframe);

	// --- Динамическая тень под плеером ---
	if (sourceData?.dominantColor) {
		applyDynamicShadowToPlayer(sourceData.dominantColor);
	} else {
		extractDominantColorFromIframe(iframe).then(color => applyDynamicShadowToPlayer(color));
	}
}

function applyDynamicShadowToPlayer(color) {
	playerElement.style.boxShadow = `0 0 4rem 1rem ${color}80 inset`;
	backgroundElement.style.boxShadow = `inset 0 0 6rem 6rem ${color}50`;
}

async function extractDominantColorFromIframe(iframe) {
	try {
		const videoDocument = iframe.contentDocument || iframe.contentWindow.document;
		const video = videoDocument.querySelector('video');
		if (!video) return 'rgba(255,255,255,0.3)';
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(video, 0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return `rgba(${r},${g},${b},0.3)`;
	} catch {
		return 'rgba(255,255,255,0.3)';
	}
}

// --- Остальные функции остаются без изменений ---
function setTitle(title) {
	document.title = `${title} | Tape Operator`;
	titleElement.innerHTML = title?.replace(/\((.*)/, (match, content) => `<span>(${content}</span>`);
}

function checkVersion(scriptVersion) {
	if (REQUIRED_VERSION !== scriptVersion) {
		try {
			const numericRequiredVersion = parseVersion(REQUIRED_VERSION)
			const numericScriptVersion = parseVersion(scriptVersion);
			if (numericScriptVersion < numericRequiredVersion) {
				showScriptOutdatedMessage(scriptVersion);
				logger.warn(`Requires script version is ${REQUIRED_VERSION} but your version is ${scriptVersion}`);
			}
		} catch (error) {
			logger.error('Error while checking script version', error);
		}
	}
}

function cacheMovieData(movieData) {
	const serialized = JSON.stringify(movieData);
	const key = hashCode(serialized);
	localStorage.setItem(key, serialized);
	return key;
}

function parseMovieData(data) {
	if (typeof data !== 'object' || data === null) throw new Error(`Invalid movie data type: "${typeof data}"`);
	const allowedKeys = ['imdb', 'tmdb', 'kinopoisk', 'title'];
	Object.keys(data).forEach((key) => { if (!allowedKeys.includes(key)) delete data[key]; });
	return data;
}

function showInitializationErrorMessage() {
	const template = document.getElementById('initialization-error-message').content.cloneNode(true);
	containerElement.appendChild(template);
}

function showScriptErrorMessage() {
	const template = document.getElementById('script-error-message').content.cloneNode(true);
	containerElement.appendChild(template);
}

function showScriptOutdatedMessage(scriptVersion) {
	const template = document.getElementById('script-outdated-message').content.cloneNode(true);
	template.querySelector('.script-version').innerText = scriptVersion;
	containerElement.appendChild(template);
}

function showServerUnavailableMessage() {
	const template = document.getElementById('server-unavailable-message').content.cloneNode(true);
	containerElement.appendChild(template);
}

function showPlayerText(messageText) {
	const playerTextElement = document.createElement('span');
	playerTextElement.innerHTML = messageText;
	contentElement.innerHTML = '';
	contentElement.appendChild(playerTextElement);
}

function sendAnalytics(movieData) {
	if (typeof plausible === 'function') {
		try {
			const title = movieData.title?.trim()?.toLowerCase();
			if (!title) return;
			const idType = Object.keys(movieData).find((key) => ['imdb', 'kinopoisk', 'tmdb'].includes(key));
			const preferredSource = localStorage.getItem('preferred-source')?.toLowerCase();
			let props = {};
			if (idType) props['id-type'] = idType;
			if (preferredSource) props['preferred-source'] = preferredSource;
			plausible('pageview', { u: title, props: props });
		} catch (error) {
			logger.error('Analytics error', error);
		}
	}
}

function setup() {
	try {
		logger.info('Setup started');
		const movieKey = getSearchParam('movie');
		if (!movieKey) return;
		const cachedData = localStorage.getItem(movieKey);
		if (!cachedData) {
			logger.error(`Cached data with key "${movieKey}" not found`);
			return;
		}
		const movieData = JSON.parse(cachedData);
		if (typeof movieData !== 'object') return;
		logger.info('Cached data was found:', movieData);
		init(movieData);
	} catch (error) {
		logger.error('Setup error', error);
	}
}

versionElement.innerHTML = `v${REQUIRED_VERSION}`;
document.body.classList.add('visible');
globalThis.init = init;
document.addEventListener('DOMContentLoaded', setup);
