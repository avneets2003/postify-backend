const crypto = require("crypto");
const express = require("express");

// Models
const Actor = require("../models/actor");

const router = express.Router();

router.get("/users/:username", async (req, res) => {
	const { username } = req.params;
	const actor = await Actor.findOne({ preferredUsername: username });
	if (!actor) return res.status(404).send("Actor not found");

	res.set("Content-Type", "application/activity+json");
	res.json({
		"@context": "https://www.w3.org/ns/activitystreams",
		id: actor.id,
		type: "Person",
		preferredUsername: actor.preferredUsername,
		inbox: actor.inbox,
		outbox: actor.outbox,
		publicKey: actor.publicKey,
	});
});

router.post("/users", async (req, res) => {
	const { username } = req.body;
	if (!username) return res.status(400).send("Missing username");

	const actorId = `${process.env.DOMAIN}/users/${username}`;
	const inbox = `${actorId}/inbox`;
	const outbox = `${actorId}/outbox`;

	const keyPair = crypto.generateKeyPairSync("rsa", {
		modulusLength: 2048,
		publicKeyEncoding: { type: "spki", format: "pem" },
		privateKeyEncoding: { type: "pkcs8", format: "pem" },
	});

	const actor = new Actor({
		preferredUsername: username,
		id: actorId,
		type: "Person",
		inbox,
		outbox,
		publicKey: {
			id: `${actorId}#main-key`,
			owner: actorId,
			publicKeyPem: keyPair.publicKey,
		},
		privateKeyPem: keyPair.privateKey,
	});

	await actor.save();

	res.set("Content-Type", "application/activity+json");
	res.json({
		"@context": "https://www.w3.org/ns/activitystreams",
		id: actor.id,
		type: actor.type,
		preferredUsername: actor.preferredUsername,
		inbox: actor.inbox,
		outbox: actor.outbox,
		publicKey: {
			id: actor.publicKey.id,
			owner: actor.publicKey.owner,
			publicKeyPem: actor.publicKey.publicKeyPem,
		},
	});
});

module.exports = router;
