Ext.define('Calculator', {

    config: {
        keywords: [],
        bucketBy: '',
        aggregateBy: ''
    },

    constructor: function (config) {
        this.initConfig(config);
    },

    prepareChartData: function (store) {
        var groupedData = this._groupData(store.getRange()),
            categories = _.keys(groupedData);

        var seriesData = _.reduce(this.keywords, function(accum, keyword) {
            accum[keyword] = [];
            return accum;
        }, {});

        _.each(categories, function(category) {
            var data = groupedData[category];

            _.each(this.keywords, function(keyword) {
                var val = 0;
                var matcher = new RegExp(keyword, 'gi');
                _.each(data, function(item) {
                    var name = item.get('Name'),
                        description = item.get('Description');
                    if (matcher.test(name) || matcher.test(description)) {
                        val += this.aggregateBy === 'count' ? 1 : (item.get('PlanEstimate') || 0);
                    }
                }, this);
                seriesData[keyword].push(val); 
            }, this);
        }, this);

        return {
            categories: categories,
            series: _.map(this.keywords, function(keyword) {
                return {
                    name: keyword,
                    data: seriesData[keyword]
                };
            })
        };
    },

    _groupData: function (records) {
        return _.groupBy(records, function (record) {
            var endDate = record.get('AcceptedDate');
            if (this.bucketBy === 'month') {
                return moment(endDate).startOf('month').format('MMM \'YY');
            } else if (this.bucketBy === 'quarter') {
                return moment(endDate).startOf('quarter').format('YYYY [Q]Q');
            } else if (this.bucketBy === 'release') {
                return record.get('Release')._refObjectName;
            } else if (this.bucketBy === 'year') {
                return moment(endDate).startOf('year').format('YYYY');
            }
        }, this);
    }
});
