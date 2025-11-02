const express = require("express");
const mongoose = require("mongoose");

require("dotenv").config();

// Check if all environment variables are loaded and not empty
const requiredEnvVars = ["DOMAIN", "MONGO_URI"];

const missingVars = requiredEnvVars.filter(
	(key) => !process.env[key] || process.env[key].trim() === "",
);

if (missingVars.length > 0) {
	console.error(
		`Missing required environment variables: ${missingVars.join(", ")}`,
	);
	process.exit(1);
}

// Hello 1
const app = express();
app.use(
	express.json({ type: ["application/json", "application/activity+json"] }),
);

// Routes
app.use(require("./routes/webfinger"));
app.use(require("./routes/actor"));
app.use(require("./routes/inbox"));
app.use(require("./routes/outbox"));
app.use(require("./routes/note"));
app.use(require("./routes/activity"));
app.use(require("./routes/follow"));

app.use((req, res, next) => {
	if (req.url.includes("/followers") || req.url.includes("/following")) {
		console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
		console.log("User-Agent:", req.headers["user-agent"]);
		console.log("Accept:", req.headers["accept"]);
	}
	next();
});

mongoose
	.connect(process.env.MONGO_URI)
	.then(() => {
		console.log("MongoDB connected");
		app.listen(3000, () => console.log("Server running on port 3000"));
	})
	.catch((err) => {
		console.error("MongoDB connection error:", err.message);
		process.exit(1);
	});
