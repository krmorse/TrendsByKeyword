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
                },
                {
                    ptype: 'rallygridboardactionsmenu',
                    menuItems: [{
                        text: 'Export to CSV...',
                        handler: function() {
                            window.location = Rally.ui.gridboard.Export.buildCsvExportUrl(this.down('rallygridboard').getGridOrBoard());
                        },
                        scope: this
                    }],
                    buttonConfig: {
                        iconCls: 'icon-export',
                        toolTipConfig: {
                            html: 'Export',
                            anchor: 'top',
                            hideDelay: 0
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
            chartColors: [
                "#FF8200", // $orange
                "#F6A900", // $gold
                "#FAD200", // $yellow
                "#8DC63F", // $lime
                "#1E7C00", // $green_dk
                "#337EC6", // $blue_link
                "#005EB8", // $blue
                "#7832A5", // $purple,
                "#DA1884",  // $pink,
                "#C0C0C0" // $grey4
            ],
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
                keywords: this._getKeywordsSetting(),
                bucketBy: this.getSetting('bucketBy'),
                aggregateBy: this.getSetting('aggregateBy')
            },
            chartConfig: {
                chart: { type: 'area' },
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
        return _.compact(['FormattedID', 'Name', 'Description', 'AcceptedDate', 'PlanEstimate', 'Release', ]);
    },

    _getChartSort: function () {
        if (this._isByRelease()) {
            return [{ property: 'Release.ReleaseDate', direction: 'ASC' }];
        } else {
            return [{ property: 'CreationDate', direction: 'ASC' }];
        }
    },

    _getKeywordsSetting: function() {
        return this.getSetting('keywords').split(',');
    },

    _getFilters: function () {
        var keywords = this._getKeywordsSetting();
        var queries = [Rally.data.wsapi.Filter.or(_.flatten(_.map(keywords, function(keyword) {
            return [
                { property: 'Name', operator: 'contains', value: keyword },
                { property: 'Description', operator: 'contains', value: keyword },
            ];
        })))];

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
