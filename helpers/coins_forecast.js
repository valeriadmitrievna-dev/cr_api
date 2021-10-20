const Deal = require("../models/Deal");

const forecast_by_type = (deals, type) => {
  const array = deals.filter(d => d.forecast_time === type);
  return {
    deals: array,
    length: array.length,
  };
};

module.exports = async () => {
  const deals = await Deal.find();
  console.log('wait forecast');
  //   const forecast = {
  //     week: deals.filter(d => d.forecast_time === "week"),
  //   };
  // console.log(forecast_by_type(deals, 'week'));
  // console.log(forecast_by_type(deals, 'quarter'));
  // console.log(forecast_by_type(deals, 'month'));
  // console.log(forecast_by_type(deals, 'year'));
};
