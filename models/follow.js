const mongoose = require("mongoose");

const FollowSchema = new mongoose.Schema({
	follower: { type: String, required: true },
	following: { type: String, required: true },
	status: { type: String, enum: ["pending", "accepted"], default: "pending" },
	createdAt: { type: Date, default: Date.now },
});

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model("Follow", FollowSchema);

module.exports = Follow;
