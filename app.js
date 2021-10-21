require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const cors = require("cors");
const axios = require("axios");
const cookieparser = require("cookie-parser");
const { Server } = require("socket.io");
const Coin = require("./models/Coin");

const PORT = process.env.PORT || 5000;
const app = express();
const http = require("http").createServer(app);
const io = new Server(http);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());
app.use(cookieparser());

app.use("/user", require("./routes/user"));
app.use("/coins", require("./routes/coin"));
app.use("/deals", require("./routes/deal"));
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

      // fecth coins cost
      // require("./helpers/coins_fetch")(axios);
      // require("./helpers/coins_forecast")();
    });
  } catch (e) {
    console.log("Server error:", e.message);
  }
}

start();

// socket.io

const getAllCoinsAndSend = async event => {
  const coins = await Coin.find();
  io.emit(event, coins);
};

io.on("connection", socket => {
  console.log("a user connected");

  // socket.on("disconnect", () => {
  //   console.log("user disconnected");
  // });

  getAllCoinsAndSend("updateCoins");
});

setInterval(async () => {
  try {
    const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins`);
    if (data) {
      await data.forEach(async coin => {
        const doc = await Coin.findOneAndUpdate(
          { name: coin.id },
          {
            logo: coin.image.small,
            cost: Math.round(coin.market_data.current_price.usd),
            cap: coin.market_data.market_cap.usd,
            name: coin.id,
            updated: new Date(),
          },
          {
            new: true,
            upsert: true,
          }
        );
        doc.save(function (err, c) {
          if (err) throw new Error(err.message);
        });
      });
    }
    getAllCoinsAndSend("updateCoins");
  } catch (error) {
    console.log(error.message);
  }
}, 30000);
