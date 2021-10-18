const express = require("express");
const PORT = process.env.PORT || 5000;
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ msg: "test" });
});

app.listen(PORT, () => console.log("Server is running on port " + PORT));
