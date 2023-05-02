import mongoose from 'mongoose';
import UserNameModule from './username.js';

const RoomMeta_Global = mongoose.model('RoomMeta_global', new mongoose.Schema({
	roomId: { type: String, required: true },
	nextMessageId: { type: Number, required: true },
}));
const RoomMessage_Global = mongoose.model('RoomMessages_global', new mongoose.Schema({
	username: { type: String, required: true },
	messageId: { type: Number, required: true, index: true },
	message: { type: String, required: true },
	color: { type: String },
}));

async function init() {
	const count1 = await RoomMeta_Global.find().estimatedDocumentCount();
	if (count1 === 0) {
		await RoomMeta_Global.create({ roomId: 'global', nextMessageId: 0 });
	}
}

// Currently always send to global room
async function sendRoomMessage(data) {
	const { uid, message } = data;
	const username = UserNameModule.getUserName(uid);
	const color = UserNameModule.getUserColor(uid);
	const { nextMessageId } = await RoomMeta_Global.findOneAndUpdate({ roomId: 'global' }, { $inc: { nextMessageId: 1 } });
	await RoomMessage_Global.create({ username, messageId: nextMessageId, message, color });
	return {
		nextMessageId,
		color,
	};
}

// Currently only get global room
async function getRoomMessage() {
	const { nextMessageId } = await RoomMeta_Global.findOne({ roomId: 'global' }).exec();
	const results = await RoomMessage_Global.find({ messageId: { $lt: nextMessageId } }).exec();
	const messages = results.map((result) => {
		const message = {};
		const fields = ['message', 'username', 'messageId', 'color'];
		for (const field of fields) {
			message[field] = result[field];
		}
		return message;
	});
	messages.sort(result => result.messageId);
	return {
		nextMessageId,
		messages,
	};
}

export default {
	init,
	sendRoomMessage,
	getRoomMessage,
};
