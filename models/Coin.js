const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  logo: { type: String, required: true },
  price: { type: Number, required: true },
  cap: { type: Number, required: true },
  name: { type: String, required: true },
  forecast: {
    week: { type: Number },
    month: { type: Number },
    quarter: { type: Number },
    year: { type: Number },
  },
});

module.exports = model("Coin", schema);
