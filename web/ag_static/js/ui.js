import { events } from './events.js';
import { runMode, toggleAutopilot, goTo } from './runMode.js';
import { clock } from './world.js';

/** @type {HTMLButtonElement} */
const ok = document.getElementById('welcome_ok');

/** @type {HTMLButtonElement} */
const pauseButton = document.getElementById('pause');

/** @type {HTMLInputElement} */
const autoBox = document.getElementById('autopilot');

const modalKeyListener = e => {
	if (e.key === 'Enter') onModalOK();
};

export const initUI = () => {
	window.document.addEventListener('keydown', modalKeyListener);
	ok.disabled = false;
	ok.innerText = 'Start';
	ok.addEventListener('click', onModalOK);
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
};

export const closeModal = () => {
	const domEle = document.getElementById('welcome_modal');
	if (!domEle) return;
	domEle.remove();
	window.document.removeEventListener('keydown', modalKeyListener);
};

const onModalOK = () => {
	closeModal();
	runMode.enable();
	toggleAutopilot(autoBox.checked, true);
	pauseButton.disabled = false;
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
