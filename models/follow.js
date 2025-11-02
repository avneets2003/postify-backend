const mongoose = require("mongoose");

const FollowSchema = new mongoose.Schema({
	username: String,
	follower: String,
});

const Follow = mongoose.model("Follower", FollowSchema);

module.exports = Follow;
