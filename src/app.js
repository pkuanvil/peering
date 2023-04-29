import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
	console.log(`Server listening at port ${port}`);
});

app.use(express.static(path.join('.', '../public')));

const connectedUsers = new Map();

io.on('connection', (socket) => {
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
});

