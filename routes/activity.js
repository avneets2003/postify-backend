const express = require("express");

// Models
const Activity = require("../models/activity");

const router = express.Router();

router.get("/activities/:id", async (req, res) => {
	const activity = await Activity.findOne({
		id: `${process.env.DOMAIN}/activities/${req.params.id}`,
	});
	if (!activity) return res.status(404).send("Activity not found");

	res.set("Content-Type", "application/activity+json");
	res.json(activity);
});

module.exports = router;
