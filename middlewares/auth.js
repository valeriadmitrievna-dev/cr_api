const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  try {
    if (req.method === "OPTIONS") return next();

    const token =
      req.cookies["access token"] || req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const data = jwt.verify(token, process.env.SECRET);
    req.decoded = data;

    return next();
  } catch (error) {
    return res.status(401).send({
      error: "Not Authenticated",
    });
  }
};
