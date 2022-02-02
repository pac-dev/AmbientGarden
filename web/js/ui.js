import { runMode, toggleAutopilot } from './runMode.js';

/** @type {HTMLButtonElement} */
const ok = document.getElementById('welcome_ok');

/** @type {HTMLInputElement} */
const autoBox = document.getElementById('autopilot');

const modalKeyListener = e => {
	if (e.key === 'Enter') onModalOK();
};

export const initUI = () => {
	window.document.addEventListener('keydown', modalKeyListener);
	ok.disabled = false;
	ok.innerText = 'Begin';
	ok.addEventListener('click', onModalOK);
	autoBox.disabled = false;
	autoBox.onchange = () => toggleAutopilot(autoBox.checked);
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
};

export const setAutopilotUi = on => {
	autoBox.checked = on;
};
