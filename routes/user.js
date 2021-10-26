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
        return res.status(200).json(token);
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
    return res.status(200).json(token);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
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
      error: "Something went wrong",
    });
  }
});

// Check if user authenticated
router.get("/auth/check", withAuth, (req, res) => {
  const data = req.decoded;
  return res.status(200).json();
});

// Get user data
router.get("/data", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id }).populate({
      path: "portfolio",
      populate: {
        path: "deals",
        model: "Deal",
        populate: [
          {
            path: "coin",
            model: "Coin",
          },
          {
            path: "comment",
            model: "Comment",
          },
        ],
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(user);
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
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
    user.save((err, u) => {
      if (err) throw new Error("Error on updating email");
      return res.status(200).json(u);
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
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
    user.name = name;
    user.password = password;
    user.save((err, u) => {
      if (err) throw new Error("Error on updating user credentials");
      return res.status(200).json(u);
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Something went wrong",
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
      error: "Something went wrong",
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
      error: "Something went wrong",
    });
  }
});

module.exports = router;
