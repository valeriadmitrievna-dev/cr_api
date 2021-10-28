const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  logo: { type: String, required: true },
  price: { type: Number, required: true },
  name: { type: String, required: true },
  short_name: { type: String, reauired: true },
  updated: { type: Date, default: new Date() },
});

module.exports = model("Coin", schema);
