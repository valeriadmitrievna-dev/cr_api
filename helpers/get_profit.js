const {
  startOfDay,
  isSameDay,
  isWithinInterval,
  subYears,
  format,
} = require("date-fns");
const Portfolio = require("../models/Portfolio");

module.exports = async axios => {
  try {
    const portfolios = await Portfolio.find().populate(["deals", "coins"]);
    const _coins = [
      ...new Set(
        portfolios
          .map(p => p.deals)
          .flat()
          .map(d => d.coin.name)
      ),
    ].map(c => ({
      name: c,
    }));
    for (const coin of _coins) {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coin.name}/market_chart?vs_currency=usd&days=max&interval=daily`
      );
      coin.prices = data.prices
        .filter(p =>
          isWithinInterval(new Date(p[0]), {
            start: subYears(new Date(), 1),
            end: new Date(),
          })
        )
        .map(d => ({
          date: d[0],
          price: d[1],
        }));
    }
    for (const p of portfolios) {
      try {
        const _profit = _coins[0].prices.map(p => ({
          date: p.date,
        }));
        for (const _p of _profit) {
          const buy = p.deals
            .filter(d =>
              isWithinInterval(new Date(d.created), {
                start: new Date(_profit[0].date),
                end: new Date(_p.date),
              })
            )
            ?.filter(d => d.type === "buy")
            ?.map(d => d.sum)
            .reduce((a, b) => a + b, 0);
          const now = p.deals
            .filter(d =>
              isWithinInterval(new Date(d.created), {
                start: new Date(_profit[0].date),
                end: new Date(_p.date),
              })
            )
            ?.filter(d => d.type === "buy")
            ?.map(
              d =>
                _coins
                  .find(c => c.name === d.coin.name)
                  .prices.find(pr =>
                    isSameDay(new Date(pr.date), new Date(_p.date))
                  ).price * d.count
            )
            .reduce((a, b) => a + b, 0);
          _p.value = (buy / now).toFixed(1);
          if (isNaN(_p.value)) _p.value = 0;
        }
        p.profit = _profit.sort((a, b) => new Date(a.date) - new Date(b.date));
        // p.save(err => {
        //   if (err) throw new Error(err);
        // });
      } catch (error) {
        throw new Error(error.message);
      }
    }
    const ratingArray = portfolios
      .sort((a, b) => b.deals.length - a.deals.length)
      .sort((a, b) => b.coins.length - a.coins.length)
      .sort(
        (a, b) => b.profit[b.profit.length - 1] - a.profit[a.profit.length - 1]
      );
    for (const p of ratingArray) {
      try {
        p.rating_number = ratingArray.indexOf(p) + 1;
        p.save(err => {
          if (err) throw new Error(error.message);
        });
      } catch (error) {
        throw new Error(error.message);
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};
