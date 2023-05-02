'use strict';

function generateUID() {
	const array = new Uint32Array(2);
	crypto.getRandomValues(array);
	const lower = array[0];
	// eslint-disable-next-line no-bitwise
	const upper = array[1] & ((2 ** 21) - 1);
	return (upper * (2 ** 32)) + lower;
}

function parseUID(uid) {
	const result = parseInt(uid, 10);
	if (isNaN(result) || String(result) !== String(uid)) {
		throw new Error('Invalid uid');
	}
	return result;
}

let uid_init = localStorage.getItem('uid');
if (!uid_init) {
	uid_init = generateUID();
	localStorage.setItem('uid', uid_init);
}

const target_uid_init = localStorage.getItem('target_uid') || uid_init;
const message_init = localStorage.getItem('message') || `(Please change this)`;

const socket = io({
	auth: {
		uid: uid_init,
	},
});

const messageListEl = document.getElementById('message_list');
const globalMessageListEl = document.getElementById('global_message_list');

function append(data) {
	const newItemEl = document.createElement('li');
	const p = document.createElement('p');
	p.textContent = JSON.stringify(data);
	newItemEl.appendChild(p);
	messageListEl.appendChild(newItemEl);
}

function createGlobalMessageItem({ username, message, color }) {
	const newItemEl = document.createElement('li');
	const p = document.createElement('p');
	const usernameEl = document.createElement('span');
	usernameEl.textContent = `${username}:`;
	usernameEl.style.display = 'inline-block';
	usernameEl.style.paddingRight = '0.5rem';
	if (color) {
		usernameEl.style.color = color;
	}
	const messageEl = document.createElement('span');
	messageEl.textContent = message;
	p.appendChild(usernameEl);
	p.appendChild(messageEl);
	newItemEl.appendChild(p);
	return newItemEl;
}

// Placeholders
const GLOBAL_ITEM_PLACEHOLDER_COUNT = 6;
for (let i = 0; i < GLOBAL_ITEM_PLACEHOLDER_COUNT; i++) {
	const item = createGlobalMessageItem({ username: 'a', message: 'a' });
	item.style.visibility = 'hidden';
	globalMessageListEl.appendChild(item);
}

let nextMessageId = 0;
function updateGlobalMessages(payload) {
	const { nextMessageId: nextMessageId_new, messages } = payload;
	if (nextMessageId_new <= nextMessageId) {
		return;
	}
	messages.forEach(({ username, messageId, message, color }) => {
		if (messageId < nextMessageId) {
			return;
		}
		const newItemEl = createGlobalMessageItem({ username, message, color });
		const childs = globalMessageListEl.childNodes;
		globalMessageListEl.insertBefore(newItemEl, childs[childs.length - 1 - GLOBAL_ITEM_PLACEHOLDER_COUNT]);
	});
	console.log(`${nextMessageId} => ${nextMessageId_new}`);
	nextMessageId = nextMessageId_new;
}

let scrolled = false;

function requestGlobalMessages() {
	socket.timeout(7500).emitWithAck('get_global_message', {}).then((response) => {
		console.log(response);
		if (response.success) {
			updateGlobalMessages(response);
			if (!scrolled) {
				// Scroll to the bottom
				globalMessageListEl.scrollTop = globalMessageListEl.scrollHeight;
				// We don't want to do this everytime new message comes (this is interrupting),
				// but only for the first time, usually at page load
				scrolled = true;
			}
		} else {
			// TODO: show error for get_global_message
			console.error(`get_global_message failed: ${response.message}`);
		}
	}).catch((e) => {
		// TODO: show error for get_global_message
		console.error(`get_global_message failed: ${e.toString()}`);
	});
}

const uidEl = document.getElementById('uid');
uidEl.value = uid_init;
uidEl.addEventListener('change', (event) => {
	let uid = event.target.value;
	try {
		uid = parseUID(uid);
	} catch (e) {
		append({
			type: 'error',
			message: `Invalid uid: ${uid}`,
		});
		return;
	}
	localStorage.setItem('uid', uid);
});

const target_uidEl = document.getElementById('target_uid');
target_uidEl.value = target_uid_init;

function switchDisplay(target_uid) {
	if (parseUID(target_uid) === -1) {
		messageListEl.style.display = 'none';
		globalMessageListEl.style.display = '';
		requestGlobalMessages();
	} else {
		messageListEl.style.display = '';
		globalMessageListEl.style.display = 'none';
	}
}
switchDisplay(target_uid_init);

target_uidEl.addEventListener('change', (event) => {
	let target_uid = event.target.value;
	try {
		target_uid = parseUID(target_uid);
	} catch (e) {
		append({
			type: 'error',
			message: `Invalid target_uid: ${target_uid}`,
		});
		return;
	}
	switchDisplay(target_uid);
	localStorage.setItem('target_uid', target_uid);
});

const messageEl = document.getElementById('message');
messageEl.value = message_init;
messageEl.addEventListener('change', (event) => {
	const message = event.target.value;
	const target_uid = target_uidEl.value;
	localStorage.setItem('message', message);
	const payload = {
		target_uid,
		message,
	};
	socket.timeout(7500).emitWithAck('send_message', payload).then((response) => {
		if (response.startsWith('ack_server')) {
			if (target_uid === -1) {
				// Do nothing
			} else {
				append({
					type: 'send_message',
					target_uid,
					message,
				});
			}
		} else {
			append({
				type: 'error',
				target_uid,
				message: response,
			});
		}
	}).catch((e) => {
		append({
			type: 'error',
			target_uid,
			message: e.toString(),
		});
	});
});

socket.on('recv_message', (data, callback) => {
	if (callback) {
		callback('ack_client');
	}
	const { from_uid } = data;
	if (parseUID(from_uid) === -1) {
		requestGlobalMessages();
		return;
	}
	append({
		type: 'recv_message',
		...data,
	});
});
