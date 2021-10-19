const { Schema, model, Types } = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const schema = new Schema({
  email: { type: String, unic: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, unic: true, trim: true },
  created: { type: Date, default: new Date() },
  description: { type: String, default: "" },
  subscriptions: [{ type: Types.ObjectId, ref: "User" }],
  avatar: {
    type: String,
    default: "https://cryptoranks.s3.amazonaws.com/avatar.png",
  },
  portfolio: { type: Types.ObjectId, ref: "Portfolio", required: true },
});

schema.pre("save", function (next) {
  if (this.isNew || this.isModified("password")) {
    const document = this;
    bcrypt.hash(document.password, saltRounds, function (err, hashedPassword) {
      if (err) {
        next(err);
      } else {
        document.password = hashedPassword;
        next();
      }
    });
  } else {
    next();
  }
});

module.exports = model("User", schema);
