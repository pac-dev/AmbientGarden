import { aboutContent } from './about.js';
import { events } from './events.js';
import { runMode, toggleAutopilot, goTo } from './runMode.js';
import { clock } from './world.js';

/** @type {HTMLDivElement} */
const modal = document.getElementById('modal');

/** @type {HTMLButtonElement} */
const ok = document.getElementById('modal_ok');

/** @type {HTMLButtonElement} */
const pauseButton = document.getElementById('pause');

/** @type {HTMLInputElement} */
const autoBox = document.getElementById('autopilot');

const modalKeyListener = e => {
	if (e.key === 'Enter') onModalOK();
};

export const closeModal = () => {
	modal.style.display = 'none';
	window.document.removeEventListener('keydown', modalKeyListener);
	pauseButton.disabled = false;
	events.trigger('doneWelcome');
};

const onModalOK = () => {
	closeModal();
	if (!runMode.enabled) {
		runMode.enable();
		toggleAutopilot(autoBox.checked, true);
	}
};

const showAbout = () => {
	if (modal.style.display === 'none') {
		modal.style.display = 'block';
		window.document.addEventListener('keydown', modalKeyListener);
		ok.innerText = 'Close';
	}
	document.getElementById('modal_content').innerHTML = aboutContent;
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
	document.getElementById('question').onclick = showAbout;
	document.body.addEventListener('mousedown', () => {
		if (detailEle) detailEle.remove();
	});
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
