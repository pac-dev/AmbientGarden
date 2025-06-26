import { aboutContent } from './about.js';
import { events } from './events.js';
import { runMode, toggleAutopilot } from './runMode.js';
import { clock } from './world.js';

/** @type {HTMLDivElement} */
const modalBack = document.getElementById('modal_back');
/** @type {HTMLDivElement} */
const modal = document.getElementById('modal');
/** @type {HTMLDivElement} */
const content = document.getElementById('modal_content');
/** @type {HTMLButtonElement} */
const ok = document.getElementById('modal_ok');
/** @type {HTMLButtonElement} */
const pauseButton = document.getElementById('pause');
/** @type {HTMLInputElement} */
const autoBox = document.getElementById('autopilot');
/** @type {HTMLInputElement} */
const speedIn = document.getElementById('speedin');

let lastRadiusSetting = 250, lastVolumeSetting = 1;
const getSettingsContent = () => `
<h1 class=center>Settings</h1>
<p class=center>
<label id=volumeout>
	<span>Global Volume:</span>
	<input id=volume type=range min=0 max=1 value=${lastVolumeSetting} step=any>
</label>
</p>
<p class=center>
<label id=radiusout>
	<span>Listening Radius:</span>
	<input id=radius type=range min=50 max=800 value=${lastRadiusSetting} step=any list=radiusmark>
	<datalist id=radiusmark><option value="250"></option></datalist>
</label>
</p>
`;

let welcomeContent;
const uiStack = ['welcome'];
const exclusive = ['about', 'settings'];

const refreshUi = () => {
	if (!uiStack.length) {
		uiStack.push('world');
		events.trigger('doneWelcome');
		runMode.enable();
		toggleAutopilot(autoBox.checked, true);
	}
	switch(uiStack[uiStack.length-1]) {
		case 'welcome':
			content.innerHTML = welcomeContent;
			modal.style.display = 'block';
			window.document.addEventListener('keydown', modalKeyListener);
			ok.innerText = 'Start';
			break;
		case 'about':
			content.innerHTML = aboutContent;
			modal.style.display = 'block';
			modalBack.style.display = 'block';
			window.document.addEventListener('keydown', modalKeyListener);
			ok.innerText = 'Close';
			break;
		case 'settings':
			content.innerHTML = getSettingsContent();
			modal.style.display = 'block';
			modalBack.style.display = 'block';
			window.document.addEventListener('keydown', modalKeyListener);
			ok.innerText = 'Close';
			/** @type {HTMLInputElement} */
			const volIn = document.getElementById('volume');
			/** @type {HTMLInputElement} */
			const radIn = document.getElementById('radius');
			volIn.oninput = () => {
				lastVolumeSetting = parseFloat(volIn.value);
				events.trigger('volumeChanged', lastVolumeSetting);
			};
			radIn.oninput = () => {
				lastRadiusSetting = parseFloat(radIn.value);
				events.trigger('radiusChanged', lastRadiusSetting)
			};
			break;
		case 'world':
			pauseButton.disabled = false;
			break;
	}
};

export const popUi = () => {
	if (uiStack[uiStack.length-1] === 'world') return;
	const lastState = uiStack.pop();
	if (lastState === 'about' || lastState === 'settings') modalBack.style.display = 'none';
	if (lastState === 'welcome' || lastState === 'about' || lastState === 'settings') {
		modal.style.display = 'none';
		window.document.removeEventListener('keydown', modalKeyListener);
	}
	refreshUi();
};

const pushUi = (state) => {
	if (exclusive.includes(state) && exclusive.includes(uiStack[uiStack.length-1])) {
		uiStack.pop();
	}
	uiStack.push(state);
	refreshUi();
};

const modalKeyListener = e => {
	if (e.key === 'Enter') popUi();
};

export const initUI = () => {
	welcomeContent = content.innerHTML;
	ok.addEventListener('click', () => popUi());
	ok.disabled = false;
	autoBox.disabled = false;
	autoBox.onchange = () => toggleAutopilot(autoBox.checked);
	speedIn.oninput = (v) => runMode.speed = parseFloat(speedIn.value);
	events.on('pause', () => { pauseButton.innerText = 'Resume'; });
	events.on('resume', () => { pauseButton.innerText = 'Pause'; });
	pauseButton.addEventListener('click', () => {
		events.trigger(clock.paused ? 'resume' : 'pause')
	});
	document.body.addEventListener('pointerdown', () => {
		if (detailEle) detailEle.remove();
	});
	if (document.getElementById('about')) document.getElementById('about').onclick = () => {
		if (uiStack[uiStack.length-1] === 'about') popUi();
		else pushUi('about');
	};
	if (document.getElementById('settings')) document.getElementById('settings').onclick = () => {
		if (uiStack[uiStack.length-1] === 'settings') popUi();
		else pushUi('settings');
	};
	modalBack.onclick = popUi;
	refreshUi();
};

let flashingMessage;
const flashPilotOff = () => {
	if (detailEle) detailEle.style.display = 'none';
	flashingMessage = document.createElement('div');
	flashingMessage.innerText = 'Autopilot disabled.';
	flashingMessage.className = 'flash_message';
	document.body.appendChild(flashingMessage);
	setTimeout(() => { flashingMessage.classList.add('visible'); }, 50);
	setTimeout(() => { flashingMessage.classList.remove('visible'); }, 2200);
	setTimeout(() => {
		flashingMessage.remove();
		flashingMessage = undefined;
		if (detailEle) detailEle.style.display = 'block';
	}, 2200+1900);
};

export const setAutopilotUi = on => {
	if (autoBox.checked && !on) flashPilotOff();
	autoBox.checked = on;
};

/** @type {HTMLDivElement} */
let detailEle;

/** @param {import('./beacons/beaconPool.js').BeaconResource} beacon */
export const showDetail = beacon => {
	if (detailEle) detailEle.remove();
	const rec = beacon.record;
	let desc = rec.patchName.replace(/\-/g, ' ');
	if (rec.patchParams.freq1) {
		desc += ' (' + (Math.round(rec.patchParams.freq1)) + 'Hz';
		if (rec.patchParams.freq2) {
			desc += ', ' + (Math.round(rec.patchParams.freq2)) + 'Hz';
		}
		desc += ')';
	}
	detailEle = document.createElement('div');
	detailEle.className = 'detail';
	detailEle.innerHTML = `
		<div>Selected: ${desc}</div><br><br>
		<a href="${rec.sourceUrl}" target="_blank">View Source</a>
		<a id=detail_close>X</a>
	`;
	if (flashingMessage) detailEle.style.display = 'none';
	document.body.appendChild(detailEle);
	document.getElementById('detail_close').onclick = () => {
		detailEle.remove();
		detailEle = undefined;
	};
	detailEle.addEventListener('pointerdown', event => {
		event.stopPropagation();
	});
};
