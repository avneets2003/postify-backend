const express = require("express");

// Models
const Activity = require("../models/activity");

const router = express.Router();

router.get("/users/:username/outbox", async (req, res) => {
	const actorId = `${process.env.DOMAIN}/users/${req.params.username}`;
	const activities = await Activity.find({ actor: actorId }).sort({
		published: -1,
	});

	res.set("Content-Type", "application/activity+json");
	res.json({
		"@context": "https://www.w3.org/ns/activitystreams",
		id: `${actorId}/outbox`,
		type: "OrderedCollection",
		totalItems: activities.length,
		orderedItems: activities,
	});
});

module.exports = router;
