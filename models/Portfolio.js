const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User" },
  description: { type: String, default: "" },
  created: { type: Date, default: new Date() },
  deals: [{ type: Types.ObjectId, ref: "Deal" }],
  profit: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  coins: [
    {
      coin: { type: Types.ObjectId, ref: "Coin" },
      count: { type: Number },
    },
  ],
});

module.exports = model("Portfolio", schema);
