const Router = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AWS = require("aws-sdk");
const User = require("../models/User");
const withAuth = require("../middlewares/auth");
const Portfolio = require("../models/Portfolio");

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
        return res.status(200).json({ token, user });
      }
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
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
    });
    return res.status(200).json(user);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
    });
  }
});

// Upload profile image
router.post("/upload/avatar", withAuth, async (req, res) => {
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
      error: "Something went wrong",
    });
  }
});

module.exports = router;
