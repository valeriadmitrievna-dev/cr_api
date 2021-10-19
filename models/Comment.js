const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  replies: [{ type: Types.ObjectId, ref: "Comment" }],
  created: { type: Date, default: new Date() },
});

module.exports = model("Comment", schema);
