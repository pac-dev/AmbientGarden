/**
 * @typedef {
 * 'pause'
 * | 'resume' } EventType
 */


class EventTarget {
	constructor() {
		this.handlers = {};
	}
	/** @param {EventType} eventType */
	on(eventType, handler) {
		const handlers = this.handlers[eventType] ?? (this.handlers[eventType] = new Set());
		handlers.add(handler);
	}
	/** @param {EventType} eventType */
	off(eventType, handler) {
		let handlers = this.handlers[eventType];
		if (!handlers) throw new Error('Tried removing non-existing handler for ' + eventType);
		handlers.delete(handler);
	}
	/** @param {EventType} eventType */
	async trigger(eventType, arg) {
		let handlers = this.handlers[eventType];
		if (!handlers) return;
		for (let handler of handlers) {
			await handler(arg);
		}
	}
}

export const events = new EventTarget();