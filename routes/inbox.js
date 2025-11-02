const crypto = require("crypto");
const express = require("express");

const router = express.Router();

// Models
const Activity = require("../models/activity");
const Follow = require("../models/follow");
const Actor = require("../models/actor");

// Utilities
const createSignatureHeader = require("../utils/createSignatureHeader");
const verifySignatureHeader = require("../utils/verifySignatureHeader");

router.post("/users/:username/inbox", async (req, res) => {
	try {
		const actor = await verifySignatureHeader(req);
		const activity = req.body;
		console.log(
			"Incoming ActivityPub request:",
			JSON.stringify(activity, null, 2),
		);

		const actorId = activity?.actor;
		const objectId =
			typeof activity?.object === "string"
				? activity.object
				: activity?.object?.id;
		const published = activity?.published || new Date().toISOString();
		const recipientId = `https://${process.env.DOMAIN}/users/${req.params.username}`;

		await Activity.create({
			id:
				activity.id ||
				`${process.env.DOMAIN}/activities/${crypto.randomUUID()}`,
			type: activity.type,
			actor: actorId,
			object: objectId,
			published,
		});

		// Handle Follow
		if (activity.type === "Follow") {
			await Follow.create({
				username: req.params.username,
				follower: actorId,
			});

			const acceptActivity = {
				"@context": "https://www.w3.org/ns/activitystreams",
				id: `${process.env.DOMAIN}/activities/${crypto.randomUUID()}`,
				type: "Accept",
				actor: recipientId,
				object: activity,
			};

			const inbox = actor?.inbox;
			if (inbox) {
				const body = JSON.stringify(acceptActivity);
				const digest =
					"SHA-256=" +
					crypto.createHash("sha256").update(body).digest("base64");
				const date = new Date().toUTCString();
				const host = new URL(inbox).host;
				const requestTarget = `post ${new URL(inbox).pathname}`;

				const localActor = await Actor.findOne({
					preferredUsername: req.params.username,
				});
				if (!localActor || !localActor.privateKeyPem)
					throw new Error("Actor or private key missing");

				const signatureHeader = createSignatureHeader({
					actorId: localActor.id,
					privateKeyPem: localActor.privateKeyPem,
					requestTarget,
					host,
					date,
					digest,
				});

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

				console.log("Inbox response status:", inboxResponse.status);
				const responseText = await inboxResponse.text();
				console.log("Inbox response body:", responseText);
			}
		}

		// Handle Undo Follow
		if (activity.type === "Undo" && activity.object?.type === "Follow") {
			await Follow.deleteOne({
				username: req.params.username,
				follower: activity.actor,
			});
		}

		// Reject Delete activities
		if (activity.type === "Delete") {
			return res.status(403).send("Delete activities are not supported");
		}

		res.status(202).send("Accepted");
	} catch (err) {
		console.error("Inbox error:", err);
		res.status(403).send(err.message || "Forbidden");
	}
});

module.exports = router;
