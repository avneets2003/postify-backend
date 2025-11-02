const crypto = require("crypto");
const express = require("express");

// Models
const Follower = require("../models/follower");
const Actor = require("../models/actor");

// Utilities
const createSignatureHeader = require("../utils/security");

const router = express.Router();

router.get("/users/:username/followers", async (req, res) => {
	const followers = await Follower.find({ username: req.params.username });
	res.json({
		"@context": "https://www.w3.org/ns/activitystreams",
		id: `${process.env.DOMAIN}/users/${req.params.username}/followers`,
		type: "OrderedCollection",
		totalItems: followers.length,
		orderedItems: followers.map((f) => f.follower),
	});
});

router.post("/users/:username/follow", async (req, res) => {
	const { targetActorUrl } = req.body;
	const username = req.params.username;

	if (!targetActorUrl) {
		return res.status(400).send("Missing target actor URL");
	}

	const actor = await Actor.findOne({ preferredUsername: username });
	if (!actor) return res.status(404).send("Actor not found");

	const response = await fetch(targetActorUrl, {
		headers: { Accept: "application/activity+json" },
	});
	const targetActor = await response.json();
	const inbox = targetActor?.inbox;
	if (!inbox) return res.status(400).send("Target actor has no inbox");

	const followId = `${process.env.DOMAIN}/activities/${crypto.randomUUID()}`;
	const followActivity = {
		"@context": "https://www.w3.org/ns/activitystreams",
		id: followId,
		type: "Follow",
		actor: actor.id,
		object: targetActorUrl,
	};

	const body = JSON.stringify(followActivity);
	const digest =
		"SHA-256=" + crypto.createHash("sha256").update(body).digest("base64");
	const date = new Date().toUTCString();
	const host = new URL(inbox).host;
	const requestTarget = `post ${new URL(inbox).pathname}`;

	const signatureHeader = createSignatureHeader({
		actorId: actor.id,
		privateKeyPem: actor.privateKeyPem,
		requestTarget,
		host,
		date,
		digest,
	});

	try {
		const inboxResponse = await fetch(inbox, {
			method: "POST",
			headers: {
				Host: host,
				Date: date,
				Digest: digest,
				Signature: signatureHeader,
				"Content-Type": "application/activity+json",
			},
			body,
		});

		console.log(`Follow response: ${inboxResponse.status}`);
		if (inboxResponse.status !== 202) {
			const error = await inboxResponse.json();
			console.log(error);
		}

		res.status(200).json({ followActivity });
	} catch (err) {
		console.error("Follow error:", err);
		res.status(500).send("Failed to send follow");
	}
});

module.exports = router;
