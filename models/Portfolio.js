const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User" },
  description: { type: String },
  created: { type: Date, default: new Date() },
  deals: [
      
  ]
});

module.exports = model("Portfolio", schema);
