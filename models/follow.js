const mongoose = require("mongoose");

const FollowSchema = new mongoose.Schema({
	username: { type: String, required: true },
	follower: { type: String, required: true },
});

FollowSchema.index({ username: 1, follower: 1 }, { unique: true });

const Follow = mongoose.model("Follower", FollowSchema);

module.exports = Follow;
