Ext.define('TrendsByKeywordApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    layout: 'fit',
    autoScroll: false,

    requires: [
        'Calculator'
    ],

    config: {
        defaultSettings: {
            keywords: '',
            aggregateBy: 'points',
            bucketBy: 'release',
            query: ''
        }
    },

    launch: function () {
        if (!this.getSetting('keywords')) {
            Rally.ui.notify.Notifier.showError({ message: 'No keywords specified.  Please edit settings to continue.' });
   
        } else {
            this._addChart();
        }
    },

    getSettingsFields: function () {
        return [
            {
                name: 'keywords',
                xtype: 'rallytextfield',
                plugins: ['rallyfieldvalidationui'],
                fieldLabel: 'Keywords',
                allowBlank: false
            },
            {
                name: 'aggregateBy',
                xtype: 'rallycombobox',
                plugins: ['rallyfieldvalidationui'],
                fieldLabel: 'Aggregate By',
                displayField: 'name',
                valueField: 'value',
                editable: false,
                allowBlank: false,
                width: 300,
                store: {
                    fields: ['name', 'value'],
                    data: [
                        { name: 'Points', value: 'points' },
                        { name: 'Count', value: 'count' }
                    ]
                },
                lastQuery: ''
            },
            {
                name: 'bucketBy',
                xtype: 'rallycombobox',
                plugins: ['rallyfieldvalidationui'],
                fieldLabel: 'Bucket By',
                displayField: 'name',
                valueField: 'value',
                editable: false,
                allowBlank: false,
                store: {
                    fields: ['name', 'value'],
                    data: [
                        { name: 'Month', value: 'month' },
                        { name: 'Quarter', value: 'quarter' },
                        { name: 'Release', value: 'release' },
                        { name: 'Year', value: 'year' }
                    ]
                },
                lastQuery: ''
            },
            {
                type: 'query'
            }
        ];
    },

    _addChart: function () {
        var context = this.getContext(),
            whiteListFields = ['Milestones', 'Tags'],
            modelNames = ['HierarchicalRequirement','Defect'],
            gridBoardConfig = {
                xtype: 'rallygridboard',
                toggleState: 'chart',
                chartConfig: this._getChartConfig(),
                plugins: [{
                    ptype: 'rallygridboardinlinefiltercontrol',
                    showInChartMode: true,
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: context.getScopedStateId('filters'),
                        filterChildren: false,
                        modelNames: modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                defaultFields: [],
                                addQuickFilterConfig: {
                                    whiteListFields: whiteListFields
                                }
                            },
                            advancedFilterPanelConfig: {
                                advancedFilterRowsConfig: {
                                    propertyFieldConfig: {
                                        whiteListFields: whiteListFields
                                    }
                                }
                            }
                        }
                    }
                }],
                context: context,
                modelNames: modelNames,
                storeConfig: {
                    filters: this._getFilters()
                }
            };

        this.add(gridBoardConfig);
    },

    _getChartConfig: function () {
        return {
            xtype: 'rallychart',
            storeType: 'Rally.data.wsapi.artifact.Store',
            storeConfig: {
                context: this.getContext().getDataContext(),
                limit: Infinity,
                fetch: this._getChartFetch(),
                sorters: this._getChartSort(),
                pageSize: 2000,
                models: ['HierarchicalRequirement', 'Defect']
            },
            calculatorType: 'Calculator',
            calculatorConfig: {
                keywords: this.getSetting('keywords').split(','),
                bucketBy: this.getSetting('bucketBy'),
                aggregateBy: this.getSetting('aggregateBy')
            },
            chartConfig: {
                chart: { type: 'area' },
                // legend: { enabled: this._isByRelease() },
                title: {
                    text: ''
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: this._getYAxisLabel()
                    },
                },
                plotOptions: {
                    area: {
                        stacking: 'normal'
                    }
                }
            }
        };
    },

    onTimeboxScopeChange: function () {
        this.callParent(arguments);

        var gridBoard = this.down('rallygridboard');
        if (gridBoard) {
            gridBoard.destroy();
        }
        this._addChart();
    },

    _getYAxisLabel: function () {
        var estimateUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.ReleaseEstimateUnitName;
        return this.getSetting('aggregateBy') === 'count' ? 'Count' : estimateUnitName;
    },

    _getChartFetch: function () {
        return _.compact(['AcceptedDate', 'PlanEstimate', 'Release', 'Name', 'Description']);
    },

    _getChartSort: function () {
        if (this._isByRelease()) {
            return [{ property: 'Release.ReleaseDate', direction: 'ASC' }];
        } else {
            return [{ property: 'CreationDate', direction: 'ASC' }];
        }
    },

    _getFilters: function () {
        var queries = [];

        if (this._isByRelease()) {
            queries.push({
                property: 'Release',
                operator: '!=',
                value: null
            });
        }

        var timeboxScope = this.getContext().getTimeboxScope();
        if (timeboxScope) {
            queries.push(timeboxScope.getQueryFilter());
        }
        if (this.getSetting('query')) {
            queries.push(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
        }
        return queries;
    },

    _isByRelease: function () {
        return this.getSetting('bucketBy') === 'release';
    }
});
