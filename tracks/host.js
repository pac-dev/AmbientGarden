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

/**
 * Each track is played by a host. It could be a web player, another track,
 * or a command line player.
 *
 * @typedef { Object } Host
 */

/**
 * Get the cached contents of a file relative to the currently running main.js.
 * Can only be called after initialization.
 *
 * @async
 * @function
 * @name Host#getMainRelative
 * @param {String} path
 * @returns {Promise<string>}
 */

/**
 * Fetch the contents of a file relative to the currently running main.js.
 * Can only be called after initialization.
 *
 * @async
 * @function
 * @name Host#fetchMainRelative
 * @param {String} path
 * @returns {Promise<string>}
 */

/**
 * Compile Faust code to Wasm.
 * Can only be called after initialization.
 *
 * @async
 * @function
 * @name Host#compileFaust
 * @param {String} code
 * @param {Boolean} internalMemory
 * @returns {Promise<Object>}
 */

/**
 * Normal track init.
 *
 * @async
 * @function
 * @name Host#init
 */

/**
 * Host-controlled parameters. Example:
 * this.params['pitch'] = {
 *  setFn(val) { doSomethingWith(val); },
 *  def: 0, min: 0, max: 1
 * };
 *
 * @name Host#events
 * @type { EventTarget }
 */

/**
 * Host-controlled parameters. Example:
 * this.params['pitch'] = {
 *  setFn(val) { doSomethingWith(val); },
 *  def: 0, min: 0, max: 1
 * };
 *
 * @name Host#params
 * @type { Object }
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

/** @type { Host } */
export const mainHost = {
	events: new EventTarget(),
	async fetchMainRelative(path) {
		if (!this.initialized) {
			throw new Error(`Couldn't request ${path}, mainHost not initialized!`);
		}
		return '';
	},
	async getMainRelative(path) {
		if (!(path in fileCache)) fileCache[path] = await this.fetchMainRelative(path);
		return fileCache[path];
	},
	async compileFaust(code, internalMemory) {
		if (!this.initialized) {
			throw new Error(`Couldn't compile Faust, mainHost not initialized!`);
		}
		return {};
	},
	async init() {
		await this.events.trigger('got host');
		await this.events.trigger('can read files');
		await this.events.trigger('can init faust');
		await this.events.trigger('done faust init');
		await this.events.trigger('can deduce channels');
		await this.events.trigger('can make processors');
		await this.events.trigger('can play');
	},
	params: {},
	sampleRate: 44100,
};
