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
      error: "Internal server error",
    });
  }
});

// Create deal
router.post("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { coin, type, comment, value, time, count } = req.body;

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
    if (!value) {
      return res.status(400).json({
        error: "Forecast value is required",
      });
    }
    if (!time) {
      return res.status(400).json({
        error: "Forecast time is required",
      });
    }
    if (type !== "buy" && type !== "sell") {
      return res.status(400).json({
        error: "Unknown type of action",
      });
    }
    if (
      time !== "week" &&
      time !== "month" &&
      time !== "quarter" &&
      time !== "year"
    ) {
      return res.status(400).json({
        error: "Unknown forecast time value",
      });
    }

    const _coin = await Coin.findOne({ name: coin });
    if (!_coin) {
      return res.status(400).json({
        error: "Unknown coin name",
      });
    }
    const _portfolio = await Portfolio.findOne({
      _id: _user.portfolio,
    });

    const _comment = new Comment({
      content: comment,
      owner: _user,
    });

    const _deal = new Deal({
      owner: _user,
      coin: {
        _id: _coin._id,
        price: _coin.price,
        name: _coin.name,
        short_name: _coin.short_name,
        logo: _coin.logo,
      },
      type,
      comment: _comment,
      value,
      time,
      count,
      sum: count * _coin.price,
      created: new Date(),
    });

    const potrfolio_coins = _portfolio.coins.find(
      c => c.toString() == _coin._id.toString()
    );

    if (!potrfolio_coins) {
      _portfolio.coins.push(_coin);
    }

    _portfolio.deals.push(_deal);

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
      error: "Internal server error",
    });
  }
});

// like deal
router.put("/like", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { deal } = req.body;
    const user = await User.findOne({ _id: id });
    const _deal = await Deal.findOne({ _id: deal });
    if (!user || !_deal) {
      return res.status(400).json({
        error: "Delivered data is incorect",
      });
    }
    if (!!_deal.likes.find(d => d.toString() == user._id.toString())) {
      return res.status(400).json({
        error: "You cant like if you already liked",
      });
    }
    _deal.dislikes = _deal.dislikes.filter(
      d => d.toString() != user._id.toString()
    );
    _deal.likes.push(user);
    _deal.save(err => {
      if (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "Internal server error",
        });
      }
    });
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// dislike deal
router.put("/dislike", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { deal } = req.body;
    const user = await User.findOne({ _id: id });
    const _deal = await Deal.findOne({ _id: deal });
    if (!user || !_deal) {
      return res.status(400).json({
        error: "Delivered data is incorect",
      });
    }
    if (_deal.dislikes.find(d => d.toString() == user._id.toString())) {
      return res.status(400).json({
        error: "You cant dislike if you already disliked",
      });
    }
    _deal.likes = _deal.likes.filter(d => d.toString() != user._id.toString());
    _deal.dislikes.push(user);
    _deal.save(err => {
      if (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "Internal server error",
        });
      }
    });
    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
