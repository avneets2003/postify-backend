const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
	id: { type: String, required: true, unique: true },
	type: { type: String, enum: ["Note"], default: "Note" },
	attributedTo: { type: String, required: true },
	content: { type: String, required: true },
	published: { type: Date, required: true },
});

const Note = mongoose.model("Note", NoteSchema);

module.exports = Note;
