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

const PORT = process.env.PORT || 5000;
const app = express();
const http = require("http").createServer(app);
const io = new Server(http, {
  cors: {
    origin: "*",
  },
});

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? process.env.API_DEV
        : process.env.API_ORIGIN,
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
      await data.forEach(async coin => {
        const doc = await Coin.findOneAndUpdate(
          { name: coin.id },
          {
            logo: coin.image.small,
            price: Math.round(coin.market_data.current_price.usd),
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
      });
    }
    getAllCoinsAndSend("updateCoins");
  } catch (error) {
    console.log(error.message);
  }
};
updateCoinsInfo();

io.on("connection", socket => {
  console.log("a user connected");
  getAllCoinsAndSend("updateCoins");
});

// update coins info
setInterval(updateCoinsInfo, 300000);
