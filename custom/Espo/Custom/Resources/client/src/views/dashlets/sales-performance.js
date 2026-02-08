define('custom:views/dashlets/sales-performance', ['views/dashlets/abstract', 'lib!Chart'], function (Dep, Chart) {
    return Dep.extend({
        template: 'custom:dashlets/sales-performance',

        setup: function () {
            this.chartInstances = [];
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.loadData();
        },

        onRemove: function () {
            this.disposeCharts();
        },

        loadData: function () {
            this.ajaxGetRequest('SalesPerformance').then(function (data) {
                this.renderCharts(data || {});
            }.bind(this));
        },

        disposeCharts: function () {
            this.chartInstances.forEach(function (chart) {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            this.chartInstances = [];
        },

        renderCharts: function (data) {
            this.disposeCharts();

            var leadSourceData = data.leadSource || {};
            var statusData = data.leadStatus || {};
            var conversionRates = data.conversionRates || [];

            var leadSourceLabels = Object.keys(leadSourceData);
            var leadSourceValues = leadSourceLabels.map(function (key) {
                return leadSourceData[key];
            });

            var statusLabels = Object.keys(statusData);
            var statusValues = statusLabels.map(function (key) {
                return statusData[key];
            });

            var agentLabels = conversionRates.map(function (row) {
                return row.agent;
            });
            var agentValues = conversionRates.map(function (row) {
                return row.rate;
            });

            this.chartInstances.push(this.buildBarChart(
                this.$el.find('[data-chart="leadSource"]')[0],
                leadSourceLabels,
                leadSourceValues,
                'Leads by Source'
            ));

            this.chartInstances.push(this.buildPieChart(
                this.$el.find('[data-chart="leadStatus"]')[0],
                statusLabels,
                statusValues,
                'Lead Status'
            ));

            this.chartInstances.push(this.buildBarChart(
                this.$el.find('[data-chart="conversionRates"]')[0],
                agentLabels,
                agentValues,
                'Conversion Rate (%)'
            ));
        },

        buildBarChart: function (canvas, labels, values, label) {
            if (!canvas) {
                return null;
            }

            return new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: label,
                            data: values,
                            backgroundColor: '#1e3a5f',
                            borderColor: '#0f2742',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        },

        buildPieChart: function (canvas, labels, values, label) {
            if (!canvas) {
                return null;
            }

            return new Chart(canvas.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: label,
                            data: values,
                            backgroundColor: [
                                '#1e3a5f',
                                '#304a72',
                                '#4a607f',
                                '#8b95a5',
                                '#cfd6e0'
                            ]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    });
});
