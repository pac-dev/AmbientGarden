import { Seq } from './seq.js';
import { Graph } from './graph.js';

/**
 * Function to use a monospaced table-like string as a sequence.
 * @param {Seq} seq
 * @param {Graph} graph
 * @param {String} table
 * @param {Object} tableVars
 */
export const playTable = ({ seq, graph, table, tableVars }) => {
	const getVar = varName => {
		if (!(varName in tableVars)) {
			throw new Error('Table seq could not find var: ' + varName);
		}
		return tableVars[varName];
	};
	const rows = table
		.split('\n')
		.map(line => [...line.matchAll(/([^\s|_~]+)/g)].map(match => ({ str: match[0], col: match.index, line })))
		.filter(tokens => tokens.length > 1 && tokens[0].str[0] !== '-');
	for (let row of rows) {
		row.head = row[0].str;
		row.bodyTokens = row.slice(1);
	}
	const events = [];
	const parseStepRow = row => {
		let stepDur = 1;
		const stepName = row.head.split(':')[1];
		if (stepName) stepDur = getVar(stepName);
		const colTimes = {};
		let timeStepper = 0,
			prevInterval = 0;
		for (let token of row.bodyTokens) {
			colTimes[token.col] = timeStepper * stepDur;
			if (isNaN(Number(token.str))) {
				throw new Error('Could not parse time row of seq table at column ' + token.col);
			}
			events.push({
				time: timeStepper * stepDur,
				prevInterval: prevInterval * stepDur,
				col: token.col,
				actions: [],
			});
			prevInterval = Number(token.str);
			timeStepper += prevInterval;
		}
		for (let updateRow of rows) {
			for (let token of updateRow.bodyTokens) {
				const time = colTimes[token.col];
				if (time === undefined) {
					throw new Error(`Row ${updateRow.head}, col ${token.col}: no time reference`);
				}
				token.time = time;
				token.event = events.find(e => e.time === time);
			}
		}
	};
	const parseMarkersRow = row => {
		for (let token of row.bodyTokens) {
			token.event.actions.push(() => graph.setMarker(token.str));
		}
	};
	const parseAutoRow = row => {
		// for example: (0-1):vib-bouncy -> ['0', '1', 'vib', 'bouncy']
		const match = row.head.match(/\((.+)-(.+)\):([^-]+)-?(.+)?/);
		if (!match) throw new Error('Invalid seq table row header: ' + row.head);
		const min = Number(match[1]),
			max = Number(match[2]);
		const name1 = match[3],
			name2 = match[4];
		let param;
		if (name2) param = graph.getConnection(getVar(name1), getVar(name2)).gain;
		else param = getVar(name1);
		const convertToken = token => {
			const val = token.str === 'A' ? 10 : Number(token.str);
			if (isNaN(val)) throw new Error(`invalid value ${token.str} in ` + row.head);
			return 0.1 * val * (max - min) + min;
		};
		let lastValue = param.value;
		for (let [i, token] of row.bodyTokens.entries()) {
			const tokenVal = convertToken(token);
			const prevConn = token.line[token.col - 1].trim();
			const nextToken = row.bodyTokens[i + 1];
			const nextConn = nextToken?.line[nextToken.col - 1].trim();
			if (!prevConn && token.time === 0) {
				param.value = tokenVal;
				lastValue = tokenVal;
			} else if (!prevConn) {
				token.event.actions.push(() => {
					param.value = tokenVal;
				});
				lastValue = tokenVal;
			}
			if (!nextToken || !nextConn) continue;
			const endVal = convertToken(nextToken);
			if (endVal === lastValue) continue;
			const dur = nextToken.time - token.time;
			const type = { ['~']: 'cos', ['_']: 'lin' }[nextConn];
			token.event.actions.push(() => seq.ctrlSlide({ param, endVal, dur, type }));
			lastValue = endVal;
		}
	};
	const parseFnRow = row => {
		const fnName = row.head.split(':')[1];
		if (!fnName) throw new Error('Invalid seq table row header: ' + row.head);
		const fn = getVar(fnName);
		for (let token of row.bodyTokens) {
			if (token.str === 'x') {
				token.event.actions.push(fn);
			} else {
				token.event.actions.push(fn[token.str]);
			}
		}
	};
	const rowSignatures = [
		['step', parseStepRow],
		['markers', parseMarkersRow],
		['(', parseAutoRow],
		['fn', parseFnRow],
	];
	for (let row of rows) {
		const sig = rowSignatures.find(s => row[0].str.startsWith(s[0]));
		if (!sig) throw new Error('Unknown seq table row type: ' + row[0].str);
		sig[1](row);
	}
	seq.schedule(async () => {
		for (let event of events) {
			if (event.prevInterval) await seq.play(event.prevInterval);
			console.log(`running ${event.actions.length} actions`);
			for (let action of event.actions) action();
		}
	});
};
