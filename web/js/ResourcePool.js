/**
 * @typedef {Object} Resource
 * @property {Resource} [recycling]
 * @property {boolean} [wanted]
 * @property {number} x
 * @property {number} z
 */

/**
 * @typedef {Object} ResourcePool
 * @property {function(number, number)} generate - cam x, cam z -> yield Resource
 * @property {function(Resource)} add
 * @property {function(Resource)} remove
 * @property {function(Resource, Resource)} compare
 * @property {function(ResourcePool)} [afterUpdate]
 * @property {string} name
 * @property {number} cost
 * @property {Array.<Resource>} loaded
 * @property {Array.<Resource>} dead
 */

/** @type {Set.<ResourcePool>} */
const resourcePools = new Set();

const defaultCompare = (a, b) => a.x === b.x && a.z === b.z;

/** @param {ResourcePool} pool */
export const addResourcePool = pool => {
	pool.loaded = [];
	pool.dead = [];
	pool.compare = pool.compare ?? defaultCompare;
	pool.cost = pool.cost ?? 0;
	resourcePools.add(pool);
	return pool;
};

/** @returns {ResourcePool} */
export const getResourcePool = name => {
	for (let pool of resourcePools) if (pool.name === name) return pool;
};
window.getResourcePool = getResourcePool;

export const removeResourcePool = name => {
	const pool = getResourcePool(name);
	for (let res of pool.loaded) pool.remove(res);
	resourcePools.delete(pool);
};


/** @param {ResourcePool} pool */
export const matchResource = (pool, match) => {
	for (let res of pool.loaded) {
		if (Object.keys(match).some(k => res[k] !== match[k])) {
			continue;
		}
		return res;
	}
};

/**
 * @param {ResourcePool} pool 
 * @param {Resource} newRes 
 */
const mark = (pool, newRes) => {
	for (let oldRes of pool.loaded) {
		if (pool.compare(oldRes, newRes)) {
			oldRes.wanted = true;
			return true;
		}
	}
	return false;
};

/** @param {ResourcePool} pool */
const updatePool = (pool, camX, camZ) => {
	const missing = [];
	for (let have of pool.loaded) {
		have.wanted = false;
	}
	for (let res of pool.generate(camX, camZ)) {
		const marked = mark(pool, res);
		if (!marked) missing.push(res);
	}
	for (let have of pool.loaded) {
		if (!have.wanted) {
			pool.remove(have);
			pool.dead.push(have);
		}
	}
	pool.loaded = pool.loaded.filter(res => res.wanted);
	for (let res of missing) {
		Object.assign(res, {recycling: pool.dead.pop()})
		pool.add(res, camX, camZ);
		pool.loaded.push(res);
	}
	if (pool.afterUpdate) pool.afterUpdate(pool, camX, camZ);
};

export const updateResources = (camX, camZ) => {
	for (let pool of resourcePools) updatePool(pool, camX, camZ);
};