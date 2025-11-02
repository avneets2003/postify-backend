const mongoose = require("mongoose");

const FollowerSchema = new mongoose.Schema({
	username: String,
	follower: String,
});

const Follower = mongoose.model("Follower", FollowerSchema);

module.exports = Follower;
