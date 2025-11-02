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
app.use(express.json());

// Routes
app.use(require("./routes/webfinger"));
app.use(require("./routes/actor"));
app.use(require("./routes/inbox"));
app.use(require("./routes/outbox"));
app.use(require("./routes/note"));
app.use(require("./routes/activity"));

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
