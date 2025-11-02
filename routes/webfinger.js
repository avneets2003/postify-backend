const express = require("express");
const router = express.Router();

router.get("/.well-known/webfinger", async (req, res) => {
	const resource = req.query.resource;

	if (!resource || !resource.startsWith("acct:")) {
		return res.status(400).send("Missing or invalid resource");
	}

	const [username, domain] = resource.slice(5).split("@");

	if (!username || !domain) {
		return res.status(400).send("Invalid resource format");
	}

	const actorUrl = `https://${domain}/users/${username}`;

	res.json({
		subject: `acct:${username}@${domain}`,
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
