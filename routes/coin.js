const Router = require("express");
const router = Router();
const axios = require("axios");
const withAuth = require("../middlewares/auth");
const Coin = require("../models/Coin");
const { format } = require("date-fns");

// Get all coins data
router.get("/", withAuth, async (req, res) => {
  try {
    const coins = await Coin.find();
    res.status(200).json(coins);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Get coin data by name
router.get("/:name/:days", withAuth, async (req, res) => {
  try {
    const { name, days } = req.params;
    let url;
    if (
      parseInt(days) !== 7 &&
      parseInt(days) !== 14 &&
      parseInt(days) !== 30
    ) {
      return res.status(400).json({
        error: "Incorect days parameter",
      });
    } else {
      url = `https://api.coingecko.com/api/v3/coins/${name}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    }
    const response = await axios.get(url);
    const prices = response.data.prices.map(pair => {
      return {
        date: format(new Date(pair[0]), "dd.MM.yyy"),
        price: Math.round(pair[1]),
      };
    });
    prices.splice(days - 1, 1);

    const _coin = await Coin.findOneAndUpdate(
      { name },
      { cost: Math.round(prices[days - 1].price) }
    );

    _coin.save((err, coin) => {
      if (err) {
        throw new Error(err.message);
      }
      res.status(200).json({
        coin,
        chart: prices,
      });
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
