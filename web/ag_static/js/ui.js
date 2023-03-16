import { aboutContent } from './about.js';
import { events } from './events.js';
import { runMode, toggleAutopilot, goTo } from './runMode.js';
import { clock } from './world.js';

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

let welcomeContent;
const uiStack = ['welcome'];

const refreshUi = () => {
	if (!uiStack.length) {
		uiStack.push('world');
		events.trigger('doneWelcome');
		runMode.enable();
		toggleAutopilot(autoBox.checked, true);
	}
	switch(uiStack.at(-1)) {
		case 'welcome':
			content.innerHTML = welcomeContent;
			modal.style.display = 'block';
			window.document.addEventListener('keydown', modalKeyListener);
			ok.innerText = 'Start';
			break;
		case 'about':
			content.innerHTML = aboutContent;
			modal.style.display = 'block';
			window.document.addEventListener('keydown', modalKeyListener);
			ok.innerText = 'Close';
			break;
		case 'world':
			pauseButton.disabled = false;
			break;
	}

};

export const popUi = () => {
	if (uiStack.at(-1) === 'world') return;
	const lastState = uiStack.pop();
	if (lastState === 'welcome' || lastState === 'about') {
		modal.style.display = 'none';
		window.document.removeEventListener('keydown', modalKeyListener);
	}
	refreshUi();
};

const pushUi = (state) => {
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
	events.on('pause', () => { pauseButton.innerText = 'Resume'; });
	events.on('resume', () => { pauseButton.innerText = 'Pause'; });
	pauseButton.addEventListener('click', () => {
		events.trigger(clock.paused ? 'resume' : 'pause')
	});
	document.body.addEventListener('mousedown', () => {
		if (detailEle) detailEle.remove();
	});
	document.getElementById('question').onclick = () => {
		if (uiStack.at(-1) === 'about') popUi();
		else pushUi('about');
	};
	refreshUi();
};

export const setAutopilotUi = on => {
	autoBox.checked = on;
};

/** @type {HTMLDivElement} */
let detailEle;

/** @param {import('./beacons.js').BeaconResource} beacon */
export const showDetail = beacon => {
	if (detailEle) detailEle.remove();
	const rec = beacon.record;
	let desc = rec.trackName.replace(/\-/g, ' ');
	if (rec.trackParams.freq1) {
		desc += ' (' + (Math.round(rec.trackParams.freq1)) + 'Hz';
		if (rec.trackParams.freq2) {
			desc += ', ' + (Math.round(rec.trackParams.freq2)) + 'Hz';
		}
		desc += ')';
	}
	detailEle = document.createElement('div');
	detailEle.className = 'detail';
	detailEle.innerHTML = `
		<div>Selected: ${desc}</div><br><br>
		<a id=detail_goto>Go To</a> | 
		<a href="${rec.sourceUrl}" target="_blank">View Source</a>
		<a id=detail_close>X</a>
	`;
	document.body.appendChild(detailEle);
	document.getElementById('detail_goto').onclick = () => {
		goTo({x: beacon.x, z: beacon.z, spectate: true});
	};
	document.getElementById('detail_close').onclick = () => {
		detailEle.remove();
		detailEle = undefined;
	};
	detailEle.addEventListener('mousedown', event => {
		event.stopPropagation();
	});
};
