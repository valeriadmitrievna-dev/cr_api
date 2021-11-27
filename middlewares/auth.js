const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  try {
    // console.log(req.route.path);
    if (req.method === "OPTIONS") return next();

    const token =
      req.cookies["access token"] || req.headers.authorization?.split(" ")[1];
    console.log("token: ", token);
    if (!token) throw new Error("No token provided");
    const data = jwt.verify(token, process.env.SECRET);
    console.log("data: ", data);
    req.decoded = data;

    return next();
  } catch (error) {
    console.log('Not auth');
    console.log(error.message);
    return res.status(401).send({
      error: "Not Authenticated",
    });
  }
};
