import express from 'express';
import { createServer } from 'http';
// eslint-disable-next-line no-unused-vars
import { Server, Socket } from 'socket.io';
import path from 'path';
import nconf from 'nconf';

nconf.file({ file: '../config.json' });

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = nconf.get('PORT') || 3000;

async function main() {
	server.listen(PORT, () => {
		console.log(`Server listening at port ${PORT}`);
	});

	app.use(express.static(path.join('.', '../public')));

	io.on('connection', onConnection);
}

const connectedUsers = new Map();

/**
 * @param {Socket} socket
 * @returns {void}
 */
async function onConnection(socket) {
	let { uid } = socket.handshake.auth;
	try {
		uid = parseInt(uid, 10);
	} catch {
		socket.disconnect();
	}
	connectedUsers.set(uid, socket.id);
	console.log(`Connected User, uid=${uid}`);

	socket.on('send_message', (data) => {
		let { target_uid, message } = data;
		try {
			target_uid = parseInt(target_uid, 10);
		} catch (e) {
			return;
		}
		console.log(`User message: uid=${uid}, target_uid=${target_uid}`);
		console.log(`message: ${message}`);

		const target_sid = connectedUsers.get(target_uid);
		if (!target_sid) {
			console.log(`Target ${target_uid} is offline`);
			console.log(connectedUsers);
			return;
		}
		io.to(target_sid).emit('recv_message', {
			from_uid: uid,
			message,
		});
	});

	socket.on('disconnect', () => {
		connectedUsers.delete(uid);
		console.log(`Disconnected User, uid=${uid}`);
	});
}

main().catch(console.error);

