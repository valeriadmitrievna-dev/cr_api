const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  description: { type: String, default: "" },
  deals: [{ type: Types.ObjectId, ref: "Deal" }],
  profit: [{
    date: { type: Date },
    value: { type: Number },
  }],
  success: { type: Number, default: 0 },
  coins: [{ type: Types.ObjectId, ref: "Coin" }],
});

module.exports = model("Portfolio", schema);
