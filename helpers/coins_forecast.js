const Deal = require("../models/Deal");

const forecast_by_type = (deals, time) => {
  const array = deals.filter(d => d.time === time);
  return array.reduce((sum, v) => sum + v.value, 0) / array.length || 0;
};

module.exports = async coin => {
  const deals = await Deal.find({ "coin.name": coin.name });
  return {
    week: forecast_by_type(deals, "week"),
    month: forecast_by_type(deals, "month"),
    quarter: forecast_by_type(deals, "quarter"),
    year: forecast_by_type(deals, "year"),
  };
};
