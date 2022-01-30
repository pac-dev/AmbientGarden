import { TeaNode } from './teanode.js';

/** Gets created by TeaNode::addParam */
export class NodeParam {
	/**
	 * @param {TeaNode} owner
	 * @param {Number} value
	 */
	constructor(owner, value) {
		this.owner = owner;
		this.value = value;
		/** @type {TeaNode} */
		this.source;
	}
	describe() {
		return 'parameter of ' + this.owner;
	}
}
