const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  description: { type: String, default: "" },
  created: { type: Date, default: new Date() },
  deals: [{ type: Types.ObjectId, ref: "Deal" }],
  profit: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  coins: [
    {
      coin: { type: String, required: true },
      count: { type: Number, default: 0 },
    },
  ],
});

module.exports = model("Portfolio", schema);
