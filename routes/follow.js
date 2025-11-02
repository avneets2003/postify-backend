const crypto = require("crypto");
const express = require("express");

// Models
const Follow = require("../models/follow");
const Actor = require("../models/actor");

// Utilities
const createSignatureHeader = require("../utils/createSignatureHeader");

const router = express.Router();

const PAGE_SIZE = 10;

router.get("/users/:username/followers", async (req, res) => {
	const actorId = `${process.env.DOMAIN}/users/${req.params.username}`;
	const page = parseInt(req.query.page);

	const total = await Follow.countDocuments({
		following: actorId,
		status: "accepted",
	});

	res.setHeader("Content-Type", "application/activity+json");

	if (!page) {
		// Return OrderedCollection
		res.json({
			"@context": "https://www.w3.org/ns/activitystreams",
			id: `${actorId}/followers`,
			type: "OrderedCollection",
			totalItems: total,
			first: `${actorId}/followers?page=1`,
		});
	} else {
		// Return OrderedCollectionPage
		const skip = (page - 1) * PAGE_SIZE;
		const followers = await Follow.find({
			following: actorId,
			status: "accepted",
		})
			.skip(skip)
			.limit(PAGE_SIZE);

		const items = [...new Set(followers.map((f) => f.follower))];

		res.json({
			"@context": "https://www.w3.org/ns/activitystreams",
			id: `${actorId}/followers?page=${page}`,
			type: "OrderedCollectionPage",
			partOf: `${actorId}/followers`,
			totalItems: total,
			orderedItems: items,
			next:
				page * PAGE_SIZE < total
					? `${actorId}/followers?page=${page + 1}`
					: undefined,
		});
	}
});

router.get("/users/:username/following", async (req, res) => {
	const actorId = `${process.env.DOMAIN}/users/${req.params.username}`;
	const page = parseInt(req.query.page);

	const total = await Follow.countDocuments({
		follower: actorId,
		status: "accepted",
	});

	res.setHeader("Content-Type", "application/activity+json");

	if (!page) {
		// Return OrderedCollection metadata
		res.json({
			"@context": "https://www.w3.org/ns/activitystreams",
			id: `${actorId}/following`,
			type: "OrderedCollection",
			totalItems: total,
			first: `${actorId}/following?page=1`,
		});
	} else {
		// Return OrderedCollectionPage
		const skip = (page - 1) * PAGE_SIZE;
		const following = await Follow.find({
			follower: actorId,
			status: "accepted",
		})
			.skip(skip)
			.limit(PAGE_SIZE);

		const items = [...new Set(following.map((f) => f.following))];

		res.json({
			"@context": "https://www.w3.org/ns/activitystreams",
			id: `${actorId}/following?page=${page}`,
			type: "OrderedCollectionPage",
			partOf: `${actorId}/following`,
			totalItems: total,
			orderedItems: items,
			next:
				page * PAGE_SIZE < total
					? `${actorId}/following?page=${page + 1}`
					: undefined,
		});
	}
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

	await Activity.create({
		id: followId,
		type: "Follow",
		actor: actor.id,
		object: targetActorUrl,
		published: new Date().toISOString(),
	});

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
