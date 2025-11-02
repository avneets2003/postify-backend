const mongoose = require("mongoose");

const ActorSchema = new mongoose.Schema({
	id: { type: String, required: true, unique: true },
	type: { type: String, enum: ["Person"], default: "Person" },
	preferredUsername: { type: String, required: true, unique: true },
	inbox: { type: String, required: true },
	outbox: { type: String, required: true },
	followers: { type: String, required: true },
	following: { type: String, required: true },
	publicKey: {
		id: { type: String, required: true },
		owner: { type: String, required: true },
		publicKeyPem: { type: String, required: true },
	},
	privateKeyPem: { type: String, required: true },
});

const Actor = mongoose.model("Actor", ActorSchema);

module.exports = Actor;
