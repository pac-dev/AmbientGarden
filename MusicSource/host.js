/**
 * Module to communicate with the host environment that's running the patches.
 * This module can be loaded both by the host and by the patches. This allows
 * communication and synchronization beyond the basic "process" function
 * exported by patches.
 *
 * In the browser, the host is an AudioWorklet. In the command line, the host is
 * a module loaded by Deno. These can be found in the Teasynth project, under
 * core/worklet.js and cli/render.js.
 */

/**
 * @typedef {
 * 'got host'
 * | 'can read files'
 * | 'can init faust'
 * | 'done faust init'
 * | 'can deduce channels'
 * | 'can make processors'
 * | 'can play'
 * | 'dispose' } HostEventType
 */

export class EventTarget {
	constructor() {
		this.handlers = {};
	}
	/** @param {HostEventType} eventType */
	on(eventType, handler) {
		const handlers = this.handlers[eventType] ?? (this.handlers[eventType] = new Set());
		handlers.add(handler);
	}
	/** @param {HostEventType} eventType */
	off(eventType, handler) {
		let handlers = this.handlers[eventType];
		if (!handlers) throw new Error('Tried removing non-existing handler for ' + eventType);
		handlers.delete(handler);
	}
	/** @param {HostEventType} eventType */
	async trigger(eventType, arg) {
		let handlers = this.handlers[eventType];
		if (!handlers) return;
		for (let handler of handlers) {
			await handler(arg);
		}
	}
}

const fileCache = {};

/**
 * Each patch is played by a host. It could be a web player, another patch,
 * or a command line player.
 */
export class Host {
	constructor() {
		this.events = new EventTarget();
		/**
		 * Host-controlled parameters. Example:
		 * this.params['pitch'] = {
		 *  setFn(val) { doSomethingWith(val); },
		 *  def: 0, min: 0, max: 1
		 * };
		 */
		this.params = {};
		this.sampleRate = 44100;
	}
	/**
	 * Fetch the contents of a file relative to the currently running main.js.
	 * Can only be called after initialization.
	 */
	async fetchMainRelative(path) {
		if (!this.initialized) {
			throw new Error(`Couldn't request ${path}, mainHost not initialized!`);
		}
		return '';
	}
	/**
	 * Get the cached contents of a file relative to the currently running
	 * main.js. Can only be called after initialization.
	 */
	async getMainRelative(path) {
		if (!(path in fileCache)) fileCache[path] = await this.fetchMainRelative(path);
		return fileCache[path];
	}
	/**
	 * Compile Faust code to Wasm.
	 * Can only be called after initialization.
	 *
	 * @param {String} code
	 * @param {Boolean} internalMemory
	 */
	async compileFaust(code, internalMemory) {
		if (!this.initialized) {
			throw new Error(`Couldn't compile Faust, mainHost not initialized!`);
		}
		return {};
	}
	/**
	 * Initialize the patch. Called before playback.
	 */
	async init() {
		await this.events.trigger('got host');
		await this.events.trigger('can read files');
		await this.events.trigger('can init faust');
		await this.events.trigger('done faust init');
		await this.events.trigger('can deduce channels');
		await this.events.trigger('can make processors');
		await this.events.trigger('can play');
	}
};

export const mainHost = new Host();
