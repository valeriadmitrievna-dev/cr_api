const Router = require("express");
const router = Router();
const withAuth = require("../middlewares/auth");
const Deal = require("../models/Deal");
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Coin = require("../models/Coin");
const Comment = require("../models/Comment");

// Get all user deals
router.get("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const deals = await Deal.find({ owner: id });
    res.status(200).json(deals);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Create deal
router.post("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { coin, type, comment, forecast_value, forecast_time, count } =
      req.body;

    const _user = await User.findOne({ _id: id });
    if (!_user) {
      return res.status(401).send({
        error: "Not Authenticated",
      });
    }

    if (!coin) {
      return res.status(400).json({
        error: "Coin name is required",
      });
    }
    if (!count) {
      return res.status(400).json({
        error: "Coin count is required",
      });
    }
    if (!type) {
      return res.status(400).json({
        error: "Deal type is required",
      });
    }
    if (!forecast_value) {
      return res.status(400).json({
        error: "Forecast value is required",
      });
    }
    if (!forecast_time) {
      return res.status(400).json({
        error: "Forecast time is required",
      });
    }
    if (type !== "buy" && type !== "cell") {
      return res.status(400).json({
        error: "Unknown type of action",
      });
    }
    if (
      forecast_time !== "week" &&
      forecast_time !== "month" &&
      forecast_time !== "quarter" &&
      forecast_time !== "year"
    ) {
      return res.status(400).json({
        error: "Unknown forecast time value",
      });
    }

    const _coins = await Coin.find();
    if (!_coins.find(c => c.name === coin)) {
      return res.status(400).json({
        error: "Unknown coin name",
      });
    }

    const _coin = await Coin.findOne({ name: coin });
    const _portfolio = await Portfolio.findOne({ _id: _user.portfolio });

    const _comment = new Comment({
      content: comment,
      owner: _user,
    });

    const _deal = new Deal({
      owner: _user,
      coin: {
        name: _coin.name,
        logo: _coin.logo,
        price: _coin.price,
      },
      type,
      comment: _comment,
      forecast_value,
      forecast_time,
      count,
    });

    const __count = () => {
      if (_portfolio.coins.find(c => c.coin === coin)) {
        if (type === "buy") {
          return _portfolio.coins.find(c => c.coin === coin).count + count;
        } else {
          return _portfolio.coins.find(c => c.coin === coin).count - count;
        }
      } else {
        if (type === "buy") {
          return count;
        } else {
          return 0;
        }
      }
    };
    const _count = __count();

    if (_portfolio.coins.find(c => c.coin === coin)) {
      _portfolio.coins = _portfolio.coins.map(c => {
        if (c.coin === coin) {
          c.count = _count;
        }
        return c;
      });
    } else {
      _portfolio.coins.push({
        coin: _coin.name,
        count: _count < 0 ? 0 : _count,
      });
    }

    _portfolio.deals.push(_deal);
    _coin.deals.push(_deal);

    const callback = err => {
      if (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "Internal error",
        });
      }
    };

    _coin.save(callback);
    _portfolio.save(callback);
    _deal.save(callback);
    _comment.save(callback);

    res.status(200).json(_deal);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

module.exports = router;
