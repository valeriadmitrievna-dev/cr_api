const Router = require("express");
const router = Router();
const axios = require("axios");
const withAuth = require("../middlewares/auth");
const Coin = require("../models/Coin");
const { format, differenceInDays, startOfDay } = require("date-fns");
const Deal = require("../models/Deal");

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
router.get("/info/:name/:days", withAuth, async (req, res) => {
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

    const _coin = await Coin.findOne({ name });

    res.status(200).json({
      coin: _coin,
      chart: prices,
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

router.get("/trending/:range", async (req, res) => {
  try {
    const { range } = req.params;
    const deals = await Deal.find();
    let _deals;
    switch (range) {
      case "week":
        _deals = deals.filter(
          d =>
            differenceInDays(
              startOfDay(new Date()),
              startOfDay(new Date(d.created))
            ) <= 7
        );
        break;
      case "month":
        _deals = deals.filter(
          d =>
            differenceInDays(
              startOfDay(new Date()),
              startOfDay(new Date(d.created))
            ) <= 31
        );
        break;
      case "day":
        _deals = deals.filter(
          d =>
            differenceInDays(
              startOfDay(new Date()),
              startOfDay(new Date(d.created))
            ) === 0
        );
        break;
      default:
        return res.status(400).json({ error: "Invalid time range" });
    }
    const coins = Object.values(
      _deals
        .map(deal => deal.coin)
        .reduce((acc, cur) => Object.assign(acc, { [cur.name]: cur }), {})
    );
    const filtered = coins
      .map(c => {
        return {
          coin: c,
          buy: _deals.filter(d => d.coin.name === c.name && d.type === "buy")
            .length,
          sell: _deals.filter(d => d.coin.name === c.name && d.type === "sell")
            .length,
          forecast: {
            time: _deals
              .filter(d => d.coin.name === c.name)
              .reduce(
                (a, b, i, arr) =>
                  arr.filter(v => v?.time === a?.time).length >=
                  arr.filter(v => v?.time === b?.time).length
                    ? a
                    : b,
                null
              ).time,
            value: Math.round(
              _deals
                .filter(
                  d =>
                    d.coin.name === c.name &&
                    d.time ===
                      _deals
                        .filter(d => d.coin.name === c.name)
                        .reduce(
                          (a, b, i, arr) =>
                            arr.filter(v => v?.time === a?.time).length >=
                            arr.filter(v => v?.time === b?.time).length
                              ? a
                              : b,
                          null
                        ).time
                )
                .map(d => d.value)
                .reduce(function (sum, a, i, ar) {
                  sum += a;
                  return i == ar.length - 1
                    ? ar.length == 0
                      ? 0
                      : sum / ar.length
                    : sum;
                }, 0)
            ),
          },
        };
      })
      .sort((a, b) => b.buy + b.sell - (a.buy + a.sell))
      .slice(0, 3);
    return res.status(200).json(filtered);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

module.exports = router;
