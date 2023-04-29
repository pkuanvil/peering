'use strict';

let uid = localStorage.getItem('uid') || '1';
let target_uid = localStorage.getItem('target_uid') || '2';
let message = localStorage.getItem('message') || `Hello from uid=${uid}, target_uid=${target_uid}`;

const socket = io({
	auth: {
		uid,
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
uidEl.value = uid;
uidEl.addEventListener('change', (event) => {
	uid = event.target.value;
	try {
		parseInt(uid, 10);
	} catch (e) {
		console.log(`Invalid uid: ${uid}`);
		return;
	}
	localStorage.setItem('uid', uid);
	console.log(`uid => ${uid}`);
});

const target_uidEl = document.getElementById('target_uid');
target_uidEl.value = target_uid;
target_uidEl.addEventListener('change', (event) => {
	target_uid = event.target.value;
	try {
		parseInt(uid, 10);
	} catch (e) {
		console.log(`Invalid target_uid: ${target_uid}`);
		return;
	}
	localStorage.setItem('target_uid', target_uid);
});

const messageEl = document.getElementById('message');
messageEl.value = message;
messageEl.addEventListener('change', (event) => {
	message = event.target.value;
	localStorage.setItem('message', message);
	socket.emit('send_message', {
		target_uid,
		message,
	});
	append({
		type: 'send_message',
		target_uid,
		message,
	});
});

socket.on('recv_message', (data) => {
	append({
		type: 'recv_message',
		...data,
	});
});
