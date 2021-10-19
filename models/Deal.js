const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User" },
  coin: { type: String, required: true },
  type: { type: String, required: true },
  comment: { type: String },
  forecast: { type: String, required: true },
});

module.exports = model("Deal", schema);
