const Coin = require("../models/Coin");

module.exports = async axios => {
  const btc = await Coin.findOne({ name: "bitcoin" });
  axios
    .get("https://api.coingecko.com/api/v3/coins")
    .then(response => {
      if (
        btc.updated.getMonth() !== new Date().getMonth() &&
        btc.updated.getDate() &&
        new Date().getDate() &&
        btc.updated.getYear() &&
        new Date().getYear()
      ) {
        response.data.forEach(async coin => {
          const doc = await Coin.findOneAndUpdate(
            { name: coin.id },
            {
              logo: coin.image.small,
              cost: coin.market_data.current_price.usd,
              cap: coin.market_data.market_cap.usd,
              name: coin.id,
              updated: new Date(),
            },
            {
              new: true,
              upsert: true,
            }
          );
          doc.save(function (err) {
            if (err) console.log(err.message);
            console.log(doc.name + " updated");
          });
        });
      }
    })
    .catch(error => {
      console.log(error.message);
    });
};
