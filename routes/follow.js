const crypto = require("crypto");
const express = require("express");

// Models
const Follow = require("../models/follow");
const Actor = require("../models/actor");

// Utilities
const createSignatureHeader = require("../utils/createSignatureHeader");

const router = express.Router();

router.get("/users/:username/followers", async (req, res) => {
	const actorId = `${process.env.DOMAIN}/users/${req.params.username}`;
	const followers = await Follow.find({
		following: actorId,
		status: "accepted",
	});

	res.setHeader("Content-Type", "application/activity+json");
	res.json({
		"@context": "https://www.w3.org/ns/activitystreams",
		id: `${actorId}/followers`,
		type: "OrderedCollection",
		totalItems: followers.length,
		orderedItems: [...new Set(followers.map((f) => f.follower))],
	});
});

router.get("/users/:username/following", async (req, res) => {
	const actorId = `${process.env.DOMAIN}/users/${req.params.username}`;
	const following = await Follow.find({
		follower: actorId,
		status: "accepted",
	});

	res.setHeader("Content-Type", "application/activity+json");
	res.json({
		"@context": "https://www.w3.org/ns/activitystreams",
		id: `${actorId}/following`,
		type: "OrderedCollection",
		totalItems: following.length,
		orderedItems: [...new Set(following.map((f) => f.following))],
	});
});

router.post("/users/:username/follow", async (req, res) => {
	const { targetActorUrl } = req.body;
	const username = req.params.username;

	if (!targetActorUrl) {
		return res.status(400).send("Missing target actor URL");
	}

	const actor = await Actor.findOne({ preferredUsername: username });
	if (!actor || !actor.privateKeyPem) {
		return res.status(404).send("Local actor not found or missing private key");
	}

	let targetActor;
	try {
		const response = await fetch(targetActorUrl, {
			headers: { Accept: "application/activity+json" },
		});
		targetActor = await response.json();
	} catch (err) {
		console.error("Failed to fetch target actor:", err);
		return res.status(400).send("Invalid target actor URL");
	}

	const inbox = targetActor?.inbox;
	if (!inbox) {
		return res.status(400).send("Target actor has no inbox");
	}

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

		if (inboxResponse.status === 202) {
			try {
				await Follow.create({
					follower: actor.id,
					following: targetActor.id,
					status: "pending",
				});
			} catch (err) {
				if (err.code === 11000) {
					console.log("Follow already exists");
				} else {
					throw err;
				}
			}

			return res.status(200).json({ followActivity });
		} else {
			const error = await inboxResponse.text();
			console.warn("Remote inbox error:", error);
			return res.status(502).send("Remote server rejected follow request");
		}
	} catch (err) {
		console.error("Follow error:", err);
		res.status(500).send("Failed to send follow");
	}
});

module.exports = router;
