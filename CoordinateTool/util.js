/*global define*/
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/sniff',
    'esri/tasks/GeometryService',
    'esri/request',
], function (
    dojoDeclare,
    dojoArray,
    dojoLang,
    dojoSniff,
    EsriGeometryService,
    EsriRequest
) {
    'use strict';
    return dojoDeclare(null, {

        constructor: function (ac) {

            this.appConfig = ac.appConfig;
            this.geomService = new EsriGeometryService(this.appConfig.geometry_service.url);
        },

        /**
         *
         **/
        isNumber: function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        /**
         *
         **/
        getCleanInput: function (fromstr) {
            return fromstr.replace(/\s+/g, ' ').trim();
        },

        /**
         * Send request to get dd coordinates in format string
         **/
        getCoordValues: function (fromInput, toType, numDigits) {
            var nd = numDigits | 2;

            /**
             * for parameter info
             * http://resources.arcgis.com/en/help/arcgis-rest-api/#/To_GeoCoordinateString/02r30000026w000000/
             **/
            var params = {
                sr: 4326,
                coordinates: [[fromInput.x,fromInput.y]],
                conversionType: toType,
                numOfDigits: nd,
                rounding: false,
                addSpaces: false
            };

            if (toType === 'MGRS') {
                params.conversionMode = 'mgrsDefault';
                params.addSpaces = false;
                params.numOfDigits = 5;
            } else if (toType === 'UTM') {
                params.conversionMode = 'utmNorthSouth';
                params.addSpaces = true;
            } else if (toType === 'GARS') {
                params.conversionMode = 'garsDefault'
            } else if (toType === 'USNG') {
                params.addSpaces = true
                params.numOfDigits = 5;
            }

            return this.geomService.toGeoCoordinateString(params);
        },

        /**
         *
         **/
        getXYNotation: function (fromStr, toType) {
            var params = {
                sr: 4326,
                conversionType: toType,
                strings: [fromStr]
            };

            if (toType === 'MGRS') {
                params.conversionMode = 'mgrsDefault';
            } else if (toType === 'UTM') {
                params.conversionMode = 'utmNorthSouth';
            } else if (toType === 'GARS') {
                params.conversionMode = 'garsDefault'
            }

            return this.geomService.fromGeoCoordinateString(params);
        },

        /**
         *
         **/
        getCoordinateType: function (fromInput) {

            var clnInput = this.getCleanInput(fromInput);
            //regexr.com
            var strs = [{
                    name: 'DD',
                    pattern: /^[-+]?\d+[.]?\d*[NnSsEeWw]?[,\s][-+]?\d+[.]?\d*[NnSsEewW]?(?![\s,\d])/
                }, {
                    name: 'DDM',
                    pattern: /^\d{1,3}[°]?\s\d{1,3}[.]?\d*['NnSs]?\s\d{1,3}\d{1,3}[°]?\s\d{1,3}[.]?\d*['WwEe]?/
                }, {
                    name: 'DMS',
                    pattern: /^\d{1,3}[°]?\s\d{1,2}[']?\s\d{1,3}[.]?[\d*]["]?[NnSsEeWw]?\s\d*[°]?\s\d{1,2}[']?\s\d{1,3}[.]?[\d*]["]?[NnSsEeWw]?/
                }, {
                    name: 'GARS',
                    pattern: /\d{3}[a-zA-Z]{2}\d?\d?/
                }, {
                    name: 'MGRS',
                    pattern: /^\d{1,2}[c-hj-np-xC-HJ-NP-X][-,;:\s]*[a-hj-np-zA-HJ-NP-Z]{1}[a-hj-np-zA-HJ-NP-Z]{1}[-,;:\s]*\d{0,10}/
                }, {
                    name: 'USNG',
                    pattern: /\d{2}[S,s,N,n]*\s[A-Za-z]*\s\d*/
                }, {
                    name: 'UTM',
                    pattern: /\d{1,3}[S,s,N,n]*\s\d*[m,M]*\s\d*[m,M]*/
                }
            ];
            
            var fndType = undefined;

            var matchedtype = dojoArray.filter(strs, function (itm) {
                return itm.pattern.test(this.v);
            }, {t:this, v:clnInput});

            if (matchedtype.length === 1) {
                return matchedtype[0].name;
            } else if (matchedtype.length > 0) {
                return matchedtype;
            } else {
                return null;
            }
        },
    });
});
