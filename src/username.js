import fs from 'fs';

let usernames;

const usernames_promise = fs.promises.readFile('username.txt')
	.then(buf => buf.toString('utf-8').split('\n'))
	.then((result) => { usernames = result; });

async function init() {
	await usernames_promise;
}

function hash(num) {
	let h = 5381;
	for (; num > 0; num = Math.floor(num / 128)) {
		const trail = num % 128;
		// eslint-disable-next-line no-bitwise
		h = ((h << 5) + h + trail) & ((2 ** 31) - 1);
	}
	return h;
}

function getUserColor(index) {
	const COLORS = [
		'#e21400', '#91580f', '#8c661c', '#ab6000',
		'#537818', '#127b00', '#647d42', '#337d6c',
		'#24528f', '#3824aa', '#a700ff', '#c100d4',
	];
	return COLORS[hash(index) % COLORS.length];
}

function getUserName(index) {
	const index_r = hash(index) % usernames.length;
	return `${usernames[index_r]}${index % 100}`;
}

export default {
	init,
	getUserName,
	getUserColor,
};
