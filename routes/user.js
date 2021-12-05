const Router = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AWS = require("aws-sdk");
const User = require("../models/User");
const withAuth = require("../middlewares/auth");
const Portfolio = require("../models/Portfolio");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const credentials = new AWS.Credentials({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
AWS.config.credentials = credentials;

// User sign up
router.post("/signup", async (req, res) => {
  try {
    const { password, name } = req.body;

    // check incoming data
    if (!name) {
      return res.status(400).json({
        error: "Name is required",
      });
    }
    if (!password) {
      return res.status(400).json({
        error: "Password is required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password length should be 6 or greater",
      });
    }

    // check user name
    const candidate = await User.findOne({
      name,
    });
    if (candidate) {
      return res
        .status(400)
        .json({ error: "User with this name already exists" });
    }

    const portfolio = new Portfolio();
    const portfolios = await Portfolio.find();
    portfolio.rating_number = portfolios.length + 1;
    await portfolio.save(err => {
      if (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "500: Error registering new user please try again later.",
        });
      }
    });

    // create user
    const newUser = new User({
      name,
      password,
      portfolio,
    });

    await newUser.save(function (err, user) {
      if (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "500: Error registering new user please try again later.",
        });
      } else {
        const payload = { id: user._id };
        const token = jwt.sign(payload, process.env.SECRET, {
          expiresIn: "24h",
        });
        res.cookie("access token", token, {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        return res.status(200).json(token);
      }
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// User sign in
router.post("/signin", async (req, res) => {
  try {
    const { password, name } = req.body;

    // check incoming data
    if (!name) {
      return res.status(400).json({
        error: "Name is required",
      });
    }
    if (!password) {
      return res.status(400).json({
        error: "Password is required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password length should be equial or greater than 6",
      });
    }

    // get user by name and password
    const user = await User.findOne({ name }).populate("portfolio");
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(500).json({
        error: "Wrong password",
      });
    }
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.SECRET, {
      expiresIn: "24h",
    });
    res.cookie("access token", token, {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    return res.status(200).json(token);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Update profile image
router.put("/update/avatar", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const s3 = new AWS.S3();
    if (!req.files) {
      return res.status(500).json({
        error: "Avatar image is required",
      });
    }
    const fileContent = Buffer.from(req.files.file.data, "binary");
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: req.files.file.name,
      Body: fileContent,
    };
    s3.upload(params, async function (err, data) {
      if (err) {
        console.log(err.message);
        return res.status(500).json({
          error: "Problems with uploading",
        });
      }
      await User.findOneAndUpdate({ _id: id }, { avatar: data.Location });
      return res.status(200).json({
        url: data.Location,
      });
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Check if user authenticated
router.get("/auth/check", withAuth, (req, res) => {
  return res.status(200).json();
});

// Get user data
router.get("/data", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id }).populate([
      {
        path: "portfolio",
        populate: {
          path: "deals",
          model: "Deal",
          populate: [
            {
              path: "comment",
              model: "Comment",
            },
          ],
        },
      },
      {
        path: "subscriptions",
        populate: {
          path: "portfolio",
          model: "Portfolio",
        },
      },
    ]);
    const followers = await User.find({
      subscriptions: { $in: [user._id] },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({
      ...user._doc,
      followers: followers.length,
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Update user email
router.put("/update/email", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { email } = req.body;
    const user = await User.findOne({ _id: id });
    if (user.email === email) {
      return res.status(400).json({
        error: "The new email must not be the same as the old one",
      });
    }
    user.email = email;
    user.save((err, u) => {
      if (err) throw new Error("Error on updating email");
      return res.status(200).json(u.email);
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Update user name and/or password
router.put("/update/creds", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { name, password, type } = req.body;
    const user = await User.findOne({ _id: id });
    if (type === "name" && user.name === name) {
      return res.status(400).json({
        error: "The new name must not be the same as the old one",
      });
    }
    if (type === "password" && bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({
        error: "The new password must not be the same as the old one",
      });
    }
    if (type === "name") user.name = name;
    if (type === "password") user.password = password;
    user.save((err, u) => {
      try {
        if (err) throw new Error(err.message);
        return res.status(200).json(u);
      } catch (err) {
        console.log(err.message);
        return res
          .status(400)
          .json({ error: "Error on updating user credentials" });
      }
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Update portfolio description
router.put("/update/description/portfolio", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { desc } = req.body;
    const user = await User.findOne({ _id: id });
    const portfolio = await Portfolio.findOne({ _id: user.portfolio });
    if (portfolio.description === desc) {
      return res.status(400).json({
        error:
          "The new portfolio description must not be the same as the old one",
      });
    }
    portfolio.description = desc;
    portfolio.save(err => {
      if (err) throw new Error("Error on updating, try again later");
      return res.status(200).json();
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Update user description
router.put("/update/description/user", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { desc } = req.body;
    const user = await User.findOne({ _id: id });
    if (user.description === desc) {
      return res.status(400).json({
        error: "The new user description must not be the same as the old one",
      });
    }
    user.description = desc;
    user.save(err => {
      if (err) throw new Error("Error on updating, try again later");
      return res.status(200).json();
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Get users count
router.get("/count", withAuth, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users.length);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Get paginated portfolio
router.get("/portfolios/:count/:page", withAuth, async (req, res) => {
  try {
    const { page, count } = req.params;
    const users = await User.find()
      .limit(parseInt(count))
      .skip(parseInt(count) * (parseInt(page) - 1))
      .populate({
        path: "portfolio",
        populate: [
          {
            path: "deals",
            model: "Deal",
          },
          {
            path: "coins",
            model: "Coin",
          },
        ],
      });

    const followersCount = [];
    for await (const user of users) {
      const followers = await User.find({ subscriptions: { $in: [user._id] } });
      followersCount.push(followers.length);
    }
    const portfolios = users.map((user, id) => {
      return {
        ...user._doc,
        followers: followersCount[id],
      };
    });
    res.status(200).json(portfolios);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Toggle subscription
router.post("/subscription", withAuth, async (req, res) => {
  try {
    const { subscribed, subscription } = req.body;
    if (subscribed === undefined || !subscription) {
      return res
        .status(400)
        .json({ error: "Invalid try to toggle subscription" });
    }
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id });
    const candidate = user.subscriptions.find(s => s == subscription);
    if (subscribed && !candidate) {
      return res.status(400).json({
        error: "You cannot unsubscribe if you have not been subscribed",
      });
    }
    if (!subscribed && !!candidate) {
      return res.status(400).json({
        error: "You cannot subscribe if you are already subscribed",
      });
    }
    if (subscribed) {
      user.subscriptions = user.subscriptions.filter(s => s != subscription);
    } else {
      const sub_user = await User.findOne({ _id: subscription });
      user.subscriptions.push(sub_user);
      const mailOptions = {
        from: "CryptoRanks",
        to: sub_user.email,
        subject: "New follower!",
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
                margin-bottom: 20px;
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
                <h2>You have new follower!</h2>
                <table style="
                  margin: 0 auto;
                  width: fit-content;
                ">
                  <tr>
                    <td>
                      <a href="${
                        process.env.NODE_ENV === "development"
                          ? process.env.APP_DEV
                          : process.env.APP_ORIGIN
                      }/portfolio/${user.name}">
                        <table
                          style="
                            padding: 5px 15px;
                            background: rgba(255, 255, 255, 0.07);
                            border-radius: 16px;
                          "
                        >
                          <tr>
                            <td>
                              <img
                                src="${user.avatar}"
                                style="
                                  border: none;
                                  display: block;
                                  border-radius: 50%;
                                  object-fit: cover;
                                  margin-right: 10px;
                                "
                                width="50"
                                height="50"
                              />
                            </td>
                            <td
                              style="
                                font-weight: bold;
                                color: rgba(255, 255, 255, 0.5);
                                font-size: 18px;
                              "
                            >
                              ${user.name}
                            </td>
                          </tr>
                        </table>
                      </a>
                    </td>
                    <td style="padding-left: 10px; color: rgba(255, 255, 255, 0.5)">
                      now following you on CryptoRanks.
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
          console.log("Email not sended");
        } else {
          console.log("Email sended");
        }
      });
    }
    await user.save(err => {
      if (err) throw new Error("Error on saving");
    });

    res.status(200).json({ success: true });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Get current user data
router.get("/portfolio/:name", withAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const user = await User.findOne({ name }).populate({
      path: "portfolio",
      populate: [
        {
          path: "deals",
          populate: {
            path: "comment",
            model: "Comment",
            populate: [
              {
                path: "replies",
                populate: [
                  {
                    path: "owner",
                  },
                ],
              },
              {
                path: "owner",
              },
            ],
          },
        },
        {
          path: "coins",
          model: "Coin",
        },
      ],
    });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    res.status(200).json(user);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// forget password send link
router.post("/password/forget", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.email) {
      user.email = email;
    }

    const token = jwt.sign(email, process.env.SECRET);
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: "Reset password on CryptoRanks",
      html: `
      <!DOCTYPE html PUBLIC>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link
            href="https://fonts.googleapis.com/css?family=Montserrat"
            rel="stylesheet"
            type="text/css"
          />
          <link
            href="https://fonts.googleapis.com/css?family=Roboto"
            rel="stylesheet"
            type="text/css"
          />
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
                padding: 40px 60px;
                height: fit-content;
                min-width: 500px;
                max-width: 600px;
                margin: 0 auto;
                margin-bottom: 40px;
              "
            >
              <h2>Forgot your password?</h2>
              <p style="margin-bottom: 40px">
                That's okay, it happens! Click on the button below to reset your
                password.
              </p>
              <a
                id="link"
                href="${
                  process.env.NODE_ENV === "development"
                    ? process.env.APP_DEV
                    : process.env.APP_ORIGIN
                }/password/${token}"
                style="
                  text-transform: uppercase;
                  padding: 20px 40px;
                  background-color: #1890ff;
                  color: #fff;
                  border-radius: 8px;
                  font-weight: bold;
                  width: fit-content;
                  margin: 0 auto;
                "
                >reset password</a
              >
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

    user.password_token = token;
    user.save(err => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ error: "Error on creating updaint token" });
      }
    });

    transporter.sendMail(mailOptions, error => {
      if (error) {
        console.log(error);
        console.log("Email not sended");
      } else {
        console.log("Email sended");
        return res.status(200).json();
      }
    });
  } catch (error) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// check updating token
router.get("/password/forget/check/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ password_token: token });
    if (!user) {
      return res
        .status(404)
        .json({ error: "Invalid token or password already updated" });
    }
    res.status(200).json();
  } catch (error) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// update forgeted password
router.post("/password/forget/update", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token?.length) {
      return res.status(400).json({ error: "Token is required" });
    }
    if (!password?.length) {
      return res.status(400).json({ error: "Password is required" });
    }
    if (password?.length < 6) {
      return res
        .status(400)
        .json({ error: "Password length should be equial or greater than 6" });
    }
    const user = await User.findOne({ password_token: token });
    if (!user) {
      return res.status(404).json({ error: "Invalid token" });
    }
    if (bcrypt.compareSync(password, user.password)) {
      return res.status(404).json({
        error: "The new password must not be the same as the old one",
      });
    }
    user.password = password;
    user.password_token = undefined;
    user.save(err => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "Error on saving new password" });
      }
    });

    res.status(200).json();
  } catch (error) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
