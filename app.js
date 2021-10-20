require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());

app.use("/user", require("./routes/user"));
app.use("/coins", require("./routes/coin"));
app.use("/deals", require("./routes/deal"));
app.get("/", (req, res) => res.json({ message: "test" }));

async function start() {
  try {
    await mongoose.connect(process.env.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    app.listen(PORT, () => {
      console.log("We are live on " + PORT);

      // fecth coins cost
      require("./helpers/coins_fetch")(axios);
      require("./helpers/coins_forecast")();
    });
  } catch (e) {
    console.log("Server error:", e.message);
  }
}

start();
