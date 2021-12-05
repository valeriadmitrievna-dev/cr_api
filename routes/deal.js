const Router = require("express");
const router = Router();
const withAuth = require("../middlewares/auth");
const Deal = require("../models/Deal");
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const Coin = require("../models/Coin");
const Comment = require("../models/Comment");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

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

    const _user = await User.findOne({ _id: id }).populate("subscriptions");
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
      if (err) throw new Error(err.message);
    };

    _deal.save(callback);
    _portfolio.save(callback);
    _comment.save(callback);
    _coin.save(callback);

    require("../helpers/get_success");

    const followers = await User.find({
      subscriptions: { $in: [_user._id] },
    });
    for (const follower of followers) {
      if (follower.email?.length) {
        const mailOptions = {
          from: "CryptoRanks",
          to: follower.email,
          subject: "New deal!",
          html: `
          <!DOCTYPE html PUBLIC>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta http-equiv="X-UA-Compatible" content="IE=edge" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>CryptoRanks</title>
              <style type="text/css">
                @import url("https://fonts.googleapis.com/css2?family=Montserrat");
                @import url("https://fonts.googleapis.com/css2?family=Roboto");
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  font-family: "Montserrat", "Roboto", sans-serif;
                }
                #main {
                  background-image: linear-gradient(
                    287.67deg,
                    #2c4b5c 3.66%,
                    #1d1b24 86.16%
                  );
                  background-repeat: no-repeat;
                  background-size: cover;
                  padding: 50px;
                  min-height: 600px;
                }
                a {
                  display: block;
                  color: #fff;
                  text-decoration: none;
                }
                h1 {
                  display: flex;
                  width: fit-content;
                  color: #4c9ad2;
                  margin: 0 auto;
                  margin-bottom: 50px;
                  height: fit-content;
                }
                h1 img {
                  margin-right: 10px;
                }
                h1 span {
                  display: block;
                  margin-top: 5px;
                }
                h2 {
                  color: #fff;
                  font-weight: normal;
                  margin-bottom: 40px;
                  text-align: center;
                }
                p {
                  color: rgba(255, 255, 255, 0.4);
                  text-align: center;
                }
                div > p {
                  margin: 0 auto;
                }
                table p {
                    text-align: left;
                }
              </style>
            </head>
            <body>
              <div id="main">
                <h1>
                  <img
                    src="https://cryptoranks.s3.amazonaws.com/logo.png"
                    style="border: none; display: block"
                    width="50"
                    height="50"
                    alt="logo"
                    title="logo"
                  />
                  <span>CryptoRanks</span>
                </h1>
                <div
                  style="
                    background: rgba(255, 255, 255, 0.04);
                    border-radius: 30px;
                    padding: 20px 30px;
                    height: fit-content;
                    min-width: 500px;
                    max-width: 600px;
                    margin: 0 auto;
                    margin-bottom: 40px;
                  "
                >
                  <a href="${
                    process.env.NODE_ENV === "development"
                      ? process.env.APP_DEV
                      : process.env.APP_ORIGIN
                  }/portfolio/${_user.name}" style="display: block"
                    ><table>
                      <tr>
                        <td width="50px">
                          <img
                            width="50"
                            height="50"
                            style="
                              border-radius: 50%;
                              object-fit: cover;
                              margin-right: 10px;
                            "
                            src="${_user.avatar}"
                          />
                        </td>
                        <td
                          style="font-weight: bold; color: #fff; letter-spacing: 0.05em"
                        >
                        ${_user.name}
                        </td>
                      </tr>
                    </table></a
                  >
                  <p
                    style="
                      margin-top: 10px;
                      padding-top: 10px;
                      font-size: 20px;
                      color: #fff;
                      text-align: left;
                      margin-bottom: 10px;
                      border-top: 1px solid rgba(255, 255, 255, 0.2);
                    "
                  >
                    Deal details:
                  </p>
                  <table>
                    <tr>
                      <td width="35px">
                        <img
                          src="${_coin.logo}"
                          alt="${_coin.short_name}"
                          width="35"
                          height="35"
                          style="margin-right: 10px"
                        />
                      </td>
                      <td
                        style="color: #fff; text-transform: uppercase; font-weight: bold"
                      >
                      ${_coin.short_name}
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2">
                        <p style="margin-top: 10px">
                          <span style="color: #fff; font-weight: bold">Forecast: </span>
                          will
                          <span style="color: ${
                            value > 0 ? "#56CF12" : "#FF4E4E"
                          }">${value > 0 ? "increase" : "decrease"}</span>
                          by
                          <span style="color: ${
                            value > 0 ? "#56CF12" : "#FF4E4E"
                          }">${value > 0 ? value : -value}%</span>
                          in a
                          <span style="color: #fff">${time}</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2">
                        <p style="margin-top: 10px">
                          <span style="color: #fff; font-weight: bold">Comment: </span>
                          ${comment}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
                <p style="max-width: 400px">
                  Problems or questions? Contact us with
                  <a
                    href="support.cryptoranks.io"
                    style="color: #1890ff; font-weight: bold"
                    >support.cryptoranks.io</a
                  >
                </p>
              </div>
            </body>
          </html>
        `,
        };
        transporter.sendMail(mailOptions, error => {
          if (error) {
            console.log(error);
            throw new Error("Error on sending message: ", error.message);
          } else {
            console.log("Email sended");
          }
        });
      }
    }

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
