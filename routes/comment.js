const Router = require("express");
const router = Router();
const withAuth = require("../middlewares/auth");
const Comment = require("../models/Comment");
const Deal = require("../models/Deal");
const User = require("../models/User");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Get last commnets with replies
router.get("/last", withAuth, async (req, res) => {
  try {
    const comments = await Comment.find({
      replies: { $exists: true, $type: "array", $ne: [] },
    }).populate([
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
    ]);
    res.status(200).json(
      comments
        .map(c => c.replies)
        .flat()
        .map(r => ({
          ...r._doc,
          responseFor: {
            text: comments.find(c => c.replies.includes(r)).content,
            owner: comments.find(c => c.replies.includes(r)).owner.name,
          },
        }))
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(0, 4)
    );
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

router.get("/last/:owner", withAuth, async (req, res) => {
  try {
    const { owner } = req.params;
    const user = await User.findOne({ name: owner });
    const comments = await Comment.find({
      replies: { $exists: true, $type: "array", $ne: [] },
      owner: user,
    }).populate([
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
    ]);
    res.status(200).json(
      comments
        .map(d => ({
          ...d._doc,
          replies: d.replies.sort(
            (a, b) => new Date(b.created) - new Date(a.created)
          ),
        }))
        .sort(
          (a, b) =>
            new Date(b.replies[0].created) - new Date(a.replies[0].created)
        )
        .slice(0, 2)
    );
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Response comment
router.post("/response", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { content, commentID } = req.body;
    const deal = await Deal.findOne({ comment: commentID }).populate("owner");
    const user = await User.findOne({ _id: id });
    const comment = await Comment.findOne({ _id: commentID });
    if (!comment) {
      return res.status(404).json({
        error: "Comment not found",
      });
    }
    const _comment = new Comment({
      owner: user,
      content,
      created: new Date(),
    });
    await _comment.save(err => {
      if (err) throw new Error();
    });
    comment.replies.push(_comment);
    await comment.save(err => {
      if (err) throw new Error();
    });

    const mailOptions = {
      from: "CryptoRanks",
      to: deal.owner.email,
      subject: "New comment!",
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
            table {
              border-spacing: 0;
            }
            table p {
              text-align: left;
            }
            #tr_head td {
              padding-bottom: 10px;
              color: #fff;
              border-bottom: 1px solid rgba(255, 255, 255, 0.3);
            }
            #tr_body td {
              padding-top: 5px;
            }
            #tr_head > td:last-of-type,
            #tr_body > td:last-of-type {
              padding-left: 10px;
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
              <h2>You have new comment!</h2>
              <table style="width: 100%">
                <tr id="tr_head">
                  <td>Deal</td>
                  <td>Comment</td>
                </tr>
                <tr id="tr_body">
                  <td>
                    <table>
                      <tr>
                        <td width="35px">
                          <img
                            src="${deal.coin.logo}"
                            alt="${deal.coin.short_name}"
                            width="35"
                            height="35"
                            style="margin-right: 10px"
                          />
                        </td>
                        <td
                          style="
                            color: #fff;
                            text-transform: uppercase;
                            font-weight: bold;
                          "
                        >
                          ${deal.coin.short_name}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2">
                          <p style="margin-top: 10px">
                            <span style="color: #fff; font-weight: bold"
                              >Forecast:
                            </span>
                            will
                            <span style="color: ${
                              deal.value > 0 ? "#56CF12" : "#FF4E4E"
                            }">${
        deal.value > 0 ? "increase" : "decrease"
      }</span>
                            by
                            <span style="color: ${
                              deal.value > 0 ? "#56CF12" : "#FF4E4E"
                            }">${
        deal.value > 0 ? deal.value : -deal.value
      }%</span>
                            in a
                            <span style="color: #fff">${deal.time}</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="color: rgba(255, 255, 255, 0.5)">
                    <div
                      style="
                        padding: 5px 15px 10px 15px;
                        background: rgba(255, 255, 255, 0.07);
                        min-width: 180px;
                        border-radius: 8px;
                      "
                    >
                      <table>
                        <tr>
                          <td>
                            <img
                              src="${user.avatar}"
                              width="35"
                              height="35"
                              style="border-radius: 50%; object-fit: cover"
                            />
                          </td>
                          <td style="padding-left: 10px; color: #fff">${
                            user.name
                          }</td>
                        </tr>
                      </table>
                      <p
                        style="
                          margin-top: 5px;
                          padding-top: 10px;
                          border-top: 1px solid rgba(255, 255, 255, 0.2);
                          color: #fff;
                          font-size: 16px;
                        "
                      >
                        ${content}
                      </p>
                    </div>
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

    res.status(200).json({
      _id: _comment._id,
      content,
      created: new Date(),
      responseFor: comment.content,
      owner: _comment.owner,
    });
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
