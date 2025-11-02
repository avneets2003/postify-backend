const express = require("express");
const router = express.Router();

// Models
const Activity = require("../models/activity");

router.post("/users/:username/inbox", async (req, res) => {
	const activity = req.body;
    console.log("Incoming ActivityPub request:", JSON.stringify(req.body, null, 2));
	const actorId = activity?.actor;
	const objectId =
		typeof activity?.object === "string"
			? activity.object
			: activity?.object?.id;
	const published = activity?.published || new Date().toISOString();
	const recipientId = `https://${process.env.DOMAIN}/users/${req.params.username}`;

	await Activity.create({
		id:
			activity.id || `${process.env.DOMAIN}/activities/${crypto.randomUUID()}`,
		type: activity.type,
		actor: actorId,
		object: objectId,
		published,
	});

	// Handle Follow activity
	if (activity.type === "Follow") {
		try {
			await Follower.create({
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

			const response = await fetch(actorId, {
				headers: { Accept: "application/activity+json" },
			});
			const followerActor = await response.json();
			const inbox = followerActor?.inbox;

			if (inbox) {
				await fetch(inbox, {
					method: "POST",
					headers: {
						"Content-Type": "application/activity+json",
					},
					body: JSON.stringify(acceptActivity),
				});
			}
		} catch (err) {
			console.error("Error handling Follow:", err);
		}
	}

	res.status(202).send("Accepted");
});

module.exports = router;
