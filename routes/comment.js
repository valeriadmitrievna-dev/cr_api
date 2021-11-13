const Router = require("express");
const router = Router();
const withAuth = require("../middlewares/auth");
const Comment = require("../models/Comment");
const User = require("../models/User");

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
          responseFor: comments.find(c => c.replies.includes(r)).content,
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
        .map(c => c.replies)
        .flat()
        .map(r => ({
          ...r._doc,
          responseFor: comments.find(c => c.replies.includes(r)).content,
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

// Response comment
router.post("/response", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const { content, commentID } = req.body;
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
