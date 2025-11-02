// routes/webfinger.js
const express = require("express");
const router = express.Router();

router.get("/.well-known/webfinger", async (req, res) => {
	const resource = req.query.resource;
	const username = resource?.split(":")[1];

	if (!username) return res.status(400).send("Missing resource");

	const actorUrl = `${process.env.DOMAIN}/users/${username}`;
	res.json({
		subject: resource,
		links: [
			{
				rel: "self",
				type: "application/activity+json",
				href: actorUrl,
			},
		],
	});
});

module.exports = router;
