const {
  startOfDay,
  differenceInYears,
  differenceInQuarters,
  differenceInMonths,
  differenceInWeeks,
} = require("date-fns");
const Portfolio = require("../models/Portfolio");

module.exports = async () => {
  try {
    const portfolios = await Portfolio.find().populate(["deals", "coins"]);
    for (const p of portfolios) {
      const success = [];
      const toClose = p.deals
        .filter(d => {
          if (!d.closed) {
            if (
              d.time === "year" &&
              differenceInYears(
                startOfDay(new Date()),
                startOfDay(new Date(d.created))
              ) >= 1
            ) {
              return d;
            }
            if (
              d.time === "quarter" &&
              differenceInQuarters(
                startOfDay(new Date()),
                startOfDay(new Date(d.created))
              ) >= 1
            ) {
              return d;
            }
            if (
              d.time === "month" &&
              differenceInMonths(
                startOfDay(new Date()),
                startOfDay(new Date(d.created))
              ) >= 1
            ) {
              return d;
            }
            if (
              d.time === "week" &&
              differenceInWeeks(
                startOfDay(new Date()),
                startOfDay(new Date(d.created))
              ) >= 1
            ) {
              return d;
            }
          }
        })
        .map(d => {
          if (
            (d.value > 0 &&
              p.coins.find(c => c.name === d.coin.name).price >=
                d.coin.price) ||
            (d.value < 0 &&
              p.coins.find(c => c.name === d.coin.name).price < d.coin.price)
          ) {
            success.push(d);
          }
          d.closed = true;
          return d;
        });
      p.success = Math.round((success.length / p.deals.length) * 100) || 0;
      p.save(err => {
        if (err) throw new Error(err);
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};
