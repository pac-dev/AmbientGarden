import { TeaNode } from './teanode.js';

// Externally controlled parameter for patches
export class HostParam extends TeaNode {
	constructor(name, { def = 0, min, max } = {}) {
		super();
		let defStr;
		if ((typeof def) === 'string') {
			defStr = def;
			def = Function(`"use strict"; return parseFloat(${def})`)();
			if (min === undefined) min = Number.MIN_VALUE;
			if (max === undefined) max = Number.MAX_VALUE;
		} else {
			if (min === undefined) min = 0;
			if (max === undefined) max = 1;
		}
		this.value = def;
		this._changed = true;
		const setFn = value => {
			this.value = value;
			this.host.params[name].val = value;
			this._changed = true;
		};
		this.on('got host', () => {
			this.host.params[name] = { setFn, def, defStr, min, max };
		});
	}
	process() {
		return [this.value];
	}
	changed() {
		const ret = this._changed
		this._changed = false;
		return ret;
	}
}
