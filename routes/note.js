const crypto = require("crypto");
const express = require("express");

// Models
const Activity = require("../models/activity");
const Actor = require("../models/actor");
const Note = require("../models/note");

// Utilities
const createSignatureHeader = require("../utils/security");

const router = express.Router();

router.get("/notes/:id", async (req, res) => {
	const note = await Note.findOne({
		id: `${process.env.DOMAIN}/notes/${req.params.id}`,
	});
	if (!note) return res.status(404).send("Note not found");

	res.set("Content-Type", "application/activity+json");
	res.json(note);
});

router.post("/notes", async (req, res) => {
	const { username, content, remoteInbox } = req.body;
	if (!username || !content)
		return res.status(400).send("Missing username or content");

	const actor = await Actor.findOne({ preferredUsername: username });
	if (!actor) return res.status(404).send("Actor not found");

	const noteId = `${process.env.DOMAIN}/notes/${crypto.randomUUID()}`;
	const activityId = `${process.env.DOMAIN}/activities/${crypto.randomUUID()}`;
	const published = new Date().toISOString();

	const note = await Note.create({
		id: noteId,
		type: "Note",
		attributedTo: actor.id,
		content,
		published,
	});

	const activity = await Activity.create({
		id: activityId,
		type: "Create",
		actor: actor.id,
		object: note.id,
		published,
	});

	if (remoteInbox) {
		const body = JSON.stringify({
			"@context": "https://www.w3.org/ns/activitystreams",
			id: activity.id,
			type: "Create",
			actor: actor.id,
			object: {
				id: note.id,
				type: "Note",
				attributedTo: actor.id,
				content,
				published,
			},
			published,
		});

		const digest =
			"SHA-256=" + crypto.createHash("sha256").update(body).digest("base64");
		const date = new Date().toUTCString();
		const host = new URL(remoteInbox).host;
		const requestTarget = `post ${new URL(remoteInbox).pathname}`;

		const signatureHeader = createSignatureHeader({
			actorId: actor.id,
			privateKeyPem: actor.privateKeyPem,
			requestTarget,
			host,
			date,
			digest,
		});

		try {
			const response = await fetch(remoteInbox, {
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

			console.log(`Remote inbox response: ${response.status}`);
			const json = await response.json();
			console.log(json);
		} catch (err) {
			console.error("Remote inbox error:", err);
		}
	}

	res.status(201).json({ note, activity });
});

module.exports = router;
