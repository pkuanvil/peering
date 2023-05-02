'use strict';

function generateUID() {
	const array = new Uint32Array(2);
	crypto.getRandomValues(array);
	const lower = array[0];
	// eslint-disable-next-line no-bitwise
	const upper = array[1] & ((2 ** 21) - 1);
	return (upper * (2 ** 32)) + lower;
}

let uid_init = localStorage.getItem('uid');
if (!uid_init) {
	uid_init = generateUID();
	localStorage.setItem('uid', uid_init);
}

const target_uid_init = localStorage.getItem('target_uid') || uid_init;
const message_init = localStorage.getItem('message') || `Hello from uid=${uid_init}, target_uid=${target_uid_init}`;

const socket = io({
	auth: {
		uid: uid_init,
	},
});

const messageListEl = document.getElementById('message_list');

function append(data) {
	const newItemEl = document.createElement('li');
	const p = document.createElement('p');
	p.textContent = JSON.stringify(data);
	newItemEl.appendChild(p);
	messageListEl.appendChild(newItemEl);
}

const uidEl = document.getElementById('uid');
uidEl.value = uid_init;
uidEl.addEventListener('change', (event) => {
	const uid = event.target.value;
	try {
		parseInt(uid, 10);
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
target_uidEl.addEventListener('change', (event) => {
	const target_uid = event.target.value;
	try {
		parseInt(target_uid, 10);
	} catch (e) {
		append({
			type: 'error',
			message: `Invalid target_uid: ${target_uid}`,
		});
		return;
	}
	localStorage.setItem('target_uid', target_uid);
});

const messageEl = document.getElementById('message');
messageEl.value = message_init;
messageEl.addEventListener('change', (event) => {
	const message = event.target.value;
	const target_uid = target_uidEl.value;
	localStorage.setItem('message', message);
	socket.timeout(7500).emitWithAck('send_message', {
		target_uid,
		message,
	}).then((response) => {
		if (response.startsWith('ack_server')) {
			append({
				type: 'send_message',
				target_uid,
				message,
			});
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
	append({
		type: 'recv_message',
		...data,
	});
});
