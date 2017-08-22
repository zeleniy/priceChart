function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

d3.tsv('data/prices.lego.tsv', function(error, data) {

  var chartData = [];

  data.forEach(function(row) {
    var key = row[''];
    var data = row;
    delete data[''];

    var webSite = [];
    for (var i in data) {
      chartData.push({
        key: key,
        code: i,
        price: isNumeric(data[i]) ? Number(data[i]) : null
      });
    }
  });

  PriceChart.getInstance(chartData)
    .renderTo('#price-chart');
});
