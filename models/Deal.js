const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User", required: true },
  coin: {
    name: { type: String, required: true },
    logo: { type: String, required: true },
    cost: { type: Number, required: true },
  },
  type: { type: String, required: true },
  comment: { type: Types.ObjectId, ref: "Comment" },
  forecast_value: { type: Number, required: true },
  forecast_time: { type: String, required: true },
  created: { type: Date, default: new Date() },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  closed: { type: Boolean, default: false },
  count: { type: Number, required: true },
});

module.exports = model("Deal", schema);
