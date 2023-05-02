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

/**
 * @type {Map<number, string>}
 */
const connectedUsers = new Map();

// This currently makes event data out of order during retry
async function sendWithTimeout(target_uid, event_name, data) {
	const { try_count = 5, timeout = 1500 } = data;
	const offline_timeout = data.offline_timeout || data.timeout || 500;
	let err;
	for (let i = 0; i < try_count; i++) {
		try {
			let target_sid = connectedUsers.get(target_uid);
			if (!target_sid) {
				// eslint-disable-next-line no-await-in-loop
				await new Promise((r) => { setTimeout(r, offline_timeout); });
				target_sid = connectedUsers.get(target_uid);
				if (!target_sid) {
					throw new Error(`Target ${target_uid} is offline`);
				}
			}
			// eslint-disable-next-line no-await-in-loop
			return await io.timeout(timeout).to(target_sid).emitWithAck(event_name, data);
		} catch (e) {
			err = e;
		}
	}
	throw err;
}

/**
 * @param {Socket} socket
 * @returns {void}
 */
async function onConnection(socket) {
	let { uid } = socket.handshake.auth;
	try {
		uid = parseInt(uid, 10);
		if (isNaN(uid)) {
			throw new Error('Invalid uid');
		}
	} catch {
		return socket.disconnect();
	}
	connectedUsers.set(uid, socket.id);

	socket.on('send_message', (data, callback) => {
		let { target_uid } = data;
		try {
			target_uid = parseInt(target_uid, 10);
			if (isNaN(target_uid)) {
				throw new Error('Invalid target_uid');
			}
		} catch (e) {
			if (callback) {
				callback(e.toString());
			}
			return;
		}
		sendWithTimeout(target_uid, 'recv_message', data).then(() => {
			if (callback) {
				callback('ack_server');
			}
		}).catch((e) => {
			if (callback) {
				callback(e.toString());
			}
		});
	});

	socket.on('disconnect', () => {
		connectedUsers.delete(uid);
	});
}

main().catch(console.error);

