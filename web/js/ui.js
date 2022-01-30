import { runMode, toggleAutopilot } from './runMode.js';
const modalKeyListener = e => {
	if (e.key === 'Enter') onModalOK();
};

// startMonolith().then(() => {
export const initUI = () => {
	window.document.addEventListener('keydown', modalKeyListener);
	ok.disabled = false;
	ok.innerText = 'Begin';
	ok.addEventListener('click', onModalOK);
	autoOn.disabled = false;
	autoOn.addEventListener('click', onSwitchAuto(true));
	autoOff.addEventListener('click', onSwitchAuto(false));
};

/** @type {HTMLButtonElement} */
const ok = document.getElementById('welcome_ok');

export const closeModal = () => {
	const domEle = document.getElementById('welcome_modal');
	if (!domEle) return;
	domEle.remove();
	window.document.removeEventListener('keydown', modalKeyListener);
};

const onModalOK = () => {
	closeModal();
	runMode.enable();
};

/** @type {HTMLButtonElement} */
const autoOn = document.getElementById('autopilot_on');
/** @type {HTMLButtonElement} */
const autoOff = document.getElementById('autopilot_off');
/** @type {HTMLSpanElement} */
const autoStatus = document.getElementById('autopilot_status');
export const setAutopilotUi = on => {
	autoStatus.innerText = on ? 'On' : 'Off';
	autoOn.classList.toggle('hidden', on);
	autoOff.classList.toggle('hidden', !on);
};
const onSwitchAuto = on => () => {
	toggleAutopilot(on);
	setAutopilotUi(on);
};
