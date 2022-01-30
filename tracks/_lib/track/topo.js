import { TeaNode } from '../nodes/teanode.js';

/**
 * @param {TeaNode} node
 * @param {Array.<TeaNode>} unsorted
 * @param {Array.<TeaNode>} sorted
 */
const topologicalSortHelper = (node, unsorted, sorted) => {
	node.topoCycle = true;
	const paramInputNodes = node.params.filter(p => p.source).map(p => p.source);
	const allInputNodes = new Set([...node.inNodes, ...paramInputNodes]);
	for (let inNode of allInputNodes) {
		if (inNode.topoCycle) throw new Error('Cyclic dependency detected.');
		if (!inNode.topoDone) topologicalSortHelper(inNode, unsorted, sorted);
	}
	node.topoCycle = false;
	node.topoDone = true;
	sorted.push(node);
};

/**
 * @param {Array.<TeaNode>} unsorted
 * @returns {Array.<TeaNode>}
 */
export const topologicalSort = unsorted => {
	const sorted = [];
	for (let node of unsorted) {
		if (!node.topoDone && !node.topoCycle) topologicalSortHelper(node, unsorted, sorted);
	}
	return sorted;
};
