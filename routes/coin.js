const Router = require("express");
const router = Router();
const withAuth = require("../middlewares/auth");
const Coin = require("../models/Coin");

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
router.get("/:name", withAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const coin = await Coin.findOne({ name });
    res.status(200).json(coin);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

module.exports = router;
