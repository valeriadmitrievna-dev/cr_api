const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User", required: true },
  coin: {
    _id: { type: String, required: true },
    price: { type: Number, required: true },
    name: { type: String, required: true },
    short_name: { type: String, required: true },
    logo: { type: String, required: true },
  },
  type: { type: String, required: true },
  comment: { type: Types.ObjectId, ref: "Comment" },
  value: { type: Number, required: true },
  time: { type: String, required: true },
  created: { type: Date, default: new Date() },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  closed: { type: Boolean, default: false },
  count: { type: Number, required: true },
  sum: { type: Number, required: true },
});

module.exports = model("Deal", schema);
