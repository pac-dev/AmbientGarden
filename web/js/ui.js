import { runMode } from './runMode.js';

const ok = document.getElementById('welcome_ok');
const modalKeyListener = e => { if (e.key === 'Enter') onModalOK() };

// startMonolith().then(() => {
export const initUI = () => {
	window.document.addEventListener('keydown', modalKeyListener);
	ok.classList.remove('disabled');
	ok.innerText = 'Begin';
	ok.addEventListener('click', onModalOK);
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
};
