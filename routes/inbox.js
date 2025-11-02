const express = require("express");
const router = express.Router();

// Models
const Activity = require("../models/activity");

router.post("/users/:username/inbox", async (req, res) => {
	const activity = req.body;
	const actorId = activity?.actor;
	const objectId =
		typeof activity?.object === "string"
			? activity.object
			: activity?.object?.id;
	const published = activity?.published || new Date().toISOString();

	// TODO: Verify HTTP signature

	await Activity.create({
		id:
			activity.id || `${process.env.DOMAIN}/activities/${crypto.randomUUID()}`,
		type: activity.type,
		actor: actorId,
		object: objectId,
		published,
	});

	res.status(202).send("Accepted");
});

module.exports = router;
