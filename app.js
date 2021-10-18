require("dotenv").config();
const express = require("express");
const PORT = process.env.PORT || 5000;
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function start() {
  try {
    await mongoose.connect(process.env.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    app.listen(PORT, () => {
      console.log("We are live on " + PORT);
    });
  } catch (e) {
    console.log("Server error:", e.message);
  }
}

start();
