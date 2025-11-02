const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
	id: { type: String, required: true, unique: true },
	type: {
		type: String,
		enum: ["Create", "Follow", "Undo", "Delete"],
		default: "Create",
	},
	actor: { type: String, required: true },
	object: { type: String, required: true },
	published: { type: Date, required: true },
});

const Activity = mongoose.model("Activity", ActivitySchema);

module.exports = Activity;
