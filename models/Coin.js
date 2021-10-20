const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  logo: { type: String, required: true },
  cost: { type: Number, required: true },
  cap: { type: Number, required: true },
  name: { type: String, required: true },
  deals: [{ type: Types.ObjectId, ref: "Deal" }],
  forecast: {
    week: { type: Number },
    month: { type: Number },
    quarter: { type: Number },
    year: { type: Number },
  },
  updated: { type: Date, required: true },
});

module.exports = model("Coin", schema);
