require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const cors = require("cors");
const axios = require("axios");
const cookieparser = require("cookie-parser");
const { Server } = require("socket.io");
const Coin = require("./models/Coin");
const Deal = require("./models/Deal");
const cron = require("node-cron");
const success = require("./helpers/get_success");
const profit = require("./helpers/get_profit");

const PORT = process.env.PORT || 5000;
const app = express();
const http = require("http").createServer(app);
const io = new Server(http, {
  cors: {
    origin:
      process.env.NODE_ENV === "development"
        ? process.env.APP_DEV
        : process.env.APP_ORIGIN,
  },
});

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  host: "smtp.gmail.com",
  port: 25,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
  ignoreTLS: true,
});
transporter.verify(function (error) {
  if (error) {
    console.log("Server can't send emails");
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

app.set("transporter", transporter);

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? process.env.APP_DEV
        : process.env.APP_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());
app.use(cookieparser());

app.use("/user", require("./routes/user"));
app.use("/coins", require("./routes/coin"));
app.use("/deals", require("./routes/deal"));
app.use("/comments", require("./routes/comment"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/test.html");
});

async function start() {
  try {
    await mongoose.connect(process.env.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    http.listen(PORT, () => {
      console.log("We are live on " + PORT);
    });
  } catch (e) {
    console.log("Server error:", e.message);
  }
}

start();

// socket.io

const getAllCoinsAndSend = async event => {
  try {
    const coins = await Coin.find();
    io.emit(event, coins);
  } catch (error) {
    console.log(error.message);
  }
};

const updateCoinsInfo = async () => {
  try {
    const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins`);
    if (data) {
      for (const coin of data) {
        try {
          const doc = await Coin.findOneAndUpdate(
            { name: coin.id },
            {
              logo: coin.image.small,
              price: Math.trunc(coin.market_data.current_price.usd * 100) / 100,
              name: coin.id,
              updated: new Date(),
              short_name: coin.symbol,
            },
            {
              new: true,
              upsert: true,
            }
          );
          if (doc) {
            doc.deals = await Deal.find({ "coin.name": doc.name });
            doc.save(function (err) {
              if (err) throw new Error(err.message);
            });
          }
        } catch (error) {
          throw new Error(error.message);
        }
      }
    }
    getAllCoinsAndSend("updateCoins");
  } catch (error) {
    console.log(error.message);
  }
};

updateCoinsInfo();
cron.schedule("*/5 * * * *", () => {
  console.log("Update coins info");
  updateCoinsInfo();
});

io.on("connection", socket => {
  getAllCoinsAndSend("updateCoins");
});

profit(axios);
success();

cron.schedule("*/59 * * * *", () => {
  console.log("Update profit and success");
  profit(axios);
  success();
});
