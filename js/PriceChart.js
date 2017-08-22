class PriceChart {


    constructor(data) {

        this._data = data;
        this._duration = 1000;
        this._radius = 8;
        this._zonesColor = ['red', 'yellow', 'green']

        this._circlesData = this._data
            .filter(function(d) {
                return d.key != 'price';
            }).filter(function(d) {
                return d.price != null;
            });

        this._purchasePrices = this._data
            .filter(function(d) {
                return d.key == 'price';
            })

        this._medianPrices = _(this._circlesData)
            .groupBy(d => d.code)
            .mapValues(d => d3.median(d, d => d.price))
            .map((price, code) => ({
                code: code,
                price: price
            })).value();

        this._zonesData = [];
        _(this._data).groupBy(d => d.code).forEach(function(value, key) {
            var domain = this._getXDomain(value);
            var min = domain[0];
            var max = domain[1];
            var price = this._purchasePrices.find(d => d.code == key).price;
            var median = this._medianPrices.find(d => d.code == key).price;

            this._zonesData = this._zonesData.concat([{
                    index: 0,
                    code: key,
                    min: min,
                    max: price
                }, {
                    index: 1,
                    code: key,
                    min: price,
                    max: median
                }, {
                    index: 2,
                    code: key,
                    min: median,
                    max: max
            }]);
        }.bind(this));

        this._margin = {
            left: 40,
            top: 5,
            right: 35,
            bottom: 25
        };

        this._defaults = {
            height: 400
        };

        d3.select(window).on('resize.' + this._id, function() {
            this.resize();
        }.bind(this));
    }


    static getInstance(data) {

        return new PriceChart(data);
    }


    renderTo(selector) {

        this._container = d3.select(selector);

        var height = this._getOuterHeight();
        var width = this._getOuterWidth();

        this._svg = this._container
            .append('svg')
            .attr('class', 'line-chart')
            .attr('width', width)
            .attr('height', height);

        this._canvas = this._svg
            .append('g')
            .attr('class', 'canvas');

        var yScale = this._getYScale();
        var step = yScale.step();

        this._xAxisContainer = this._canvas
            .selectAll('.x-axis')
            .data(yScale.domain().reverse())
            .enter()
            .append('g')
            .attr('class', 'axis x-axis');

        this._yAxisContainer = this._canvas
            .append('g')
            .attr('class', 'axis y-axis');

        this._zones = this._canvas
            .selectAll('rect.zone')
            .data(this._zonesData)
            .enter()
            .append('rect')
            .attr('class', 'zone')
            .style('fill', (d) => this._zonesColor[d.index])
            .style('opacity', 0.2);

        this._circles = this._canvas
            .selectAll('circle')
            .data(this._circlesData)
            .enter()
            .append('circle')
            .attr('r', this._radius)
            .attr('cx', 0)
            .attr('cy', function(d, i) {
                return yScale(d.code) + step / 2;
            }.bind(this))
            .style('fill', 'blue')
            .style('opacity', 0.4)
            .on('mouseover', function(d) {
                this._showTip(d);
                this._circles.filter(function(x) {
                    return d.key == x.key;
                }).style('opacity', 1);
                this._circles.filter(function(x) {
                    return d.key != x.key;
                }).style('opacity', 0.1);
            }.bind(this))
            .on('mouseout', function(d) {
                this._hideTip(d);
                this._circles.style('opacity', 0.5);
            }.bind(this));

        this._purchaseLines = this._canvas
            .selectAll('line.border')
            .data(this._purchasePrices)
            .enter()
            .append('line')
            .style('stroke', 'red')
            .style('stroke-width', 2);

        this._medianLines = this._canvas
            .selectAll('line.border')
            .data(this._medianPrices)
            .enter()
            .append('line')
            .style('stroke', 'lightgreen')
            .style('stroke-width', 2);

        return this.resize(true);
    }


    _hideTip() {

        this._tip.remove();
    }


    _showTip(d) {

        this._tip = this._container
            .append('div')
            .attr('class', 'tip');
        this._tip.append('div')
            .selectAll('span')
            .data(d => Array(2).fill(d))
            .enter()
            .append('span')
            .text(function(x, i) {
                if (i == 0) {
                    return d.key + ':';
                } else {
                    return d.price + ' ₽';
                };
            });
    }


    resize(animate = false) {

        var self = this;

        var xScales = this._getXScales();
        var yScale = this._getYScale();

        var height = this._getOuterHeight();
        var step = yScale.step();

        this._svg
            .attr('width', this._getOuterWidth())
            .attr('height', height);

        this._canvas
            .attr('transform', 'translate(' + [this._margin.left, this._margin.top] + ')');

        this._xAxisContainer
            .attr('transform', (code, i) => 'translate(' + [0, step * (i + 1)] + ')')
            .each(function(code) {
                d3.select(this).call(d3.axisBottom(xScales[code]));
            });

        this._yAxisContainer
            .call(d3.axisLeft(yScale));

        var zones = this._zones
            .attr('x', d => xScales[d.code](d.min))
            .attr('y', d => yScale(d.code))
            .attr('width', 0)
            .attr('height', step);
        if (animate) {
            zones = zones.transition().duration(this._duration);
        }
        zones
            .attr('width', d => xScales[d.code](d.max) - xScales[d.code](d.min));

        var circles = this._circles;
        if (animate) {
            circles = circles.transition().duration(this._duration);
        } else {
            circles.attr('cy', (d, i) => yScale(d.code) + this._getRandomOffset(step));
        }
        circles
            .attr('cx', (d, i) => xScales[d.code](d.price))
            .on('end', function(d, i) {
                d3.select(this)
                    .transition()
                    .duration(self._duration)
                    .attr('cy', function(d, i) {
                        return yScale(d.code) + self._getRandomOffset(step);
                    });
            })

        var purchaseLines = this._purchaseLines
            .attr('x1', d => xScales[d.code](d.price))
            .attr('y1', d => yScale(d.code) + step / 2)
            .attr('x2', d => xScales[d.code](d.price))
            .attr('y2', d => yScale(d.code) + step / 2);
        if (animate) {
            purchaseLines = purchaseLines.transition().delay(this._duration).duration(this._duration);
        }
        purchaseLines
            .attr('y1', d => yScale(d.code))
            .attr('y2', d => yScale(d.code) + step);

        var medianLines = this._medianLines
            .attr('x1', d => xScales[d.code](d.price))
            .attr('y1', d => yScale(d.code) + step / 2)
            .attr('x2', d => xScales[d.code](d.price))
            .attr('y2', d => yScale(d.code) + step / 2);
        if (animate) {
            medianLines = medianLines.transition().delay(this._duration).duration(this._duration);
        }
        medianLines
            .attr('y1', d => yScale(d.code))
            .attr('y2', d => yScale(d.code) + step);

        return this;
    }


    _getRandomOffset(step) {

        var min = Math.ceil(this._radius);
        var max = Math.floor(step - this._radius);

        return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    _getXScales() {

        var xScales = {};

        _(this._data).groupBy(d => d.code).forEach(function(value, key) {
            xScales[key] = d3.scaleLinear()
                .range([0, this._getInnerWidth()])
                .domain(this._getXDomain(value));
        }.bind(this))

        return xScales;
    }


    _getXDomain(value) {

        return this._extend(d3.extent(value, d => d.price));
    }


    _getYScale() {

        return d3.scaleBand()
            .range([this._getInnerHeight(), 0])
            .domain(this._getYDomain());
    }


    _getYDomain() {

        return _.uniq(this._data.map(d => d.code));
    }


    _extend(interval) {

        var x1 = interval[0];
        var x2 = interval[1];

        var add = Math.min(x1 / 100 * 10, x2 / 100 * 10)

        return [x1 - add, x2 + add];
    }


    _getSize() {

        return this._container.node().getBoundingClientRect();
    }


    _getOuterWidth() {

        return this._getSize().width;
    }


    _getOuterHeight() {

        return this._getSize().height || this._defaults.height;
    }


    _getInnerWidth() {

        return this._getSize().width - this._margin.left - this._margin.right;
    }


    _getInnerHeight() {

        return this._getSize().height - this._margin.top - this._margin.bottom;
    }


    /**
     * Generate unique string.
     * @private
     * @returns {String}
     */
    _getUniqueId() {

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
}
