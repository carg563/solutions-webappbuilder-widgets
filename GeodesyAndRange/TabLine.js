///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

/*global define*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/string',
    'dojo/number',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'esri/layers/GraphicsLayer',
    'esri/geometry/geometryEngine',
    'esri/symbols/SimpleLineSymbol',
    'esri/graphic',
    'esri/units',
    'esri/geometry/webMercatorUtils',
    './feedback',
    'dojo/text!./templates/TabLine.html'
], function (
    dojoDeclare,
    dojoLang,
    dojoOn,
    dojoTopic,
    dojoDomAttr,
    dojoDomClass,
    dojoDomStyle,
    dojoString,
    dojoNumber,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    EsriGraphicsLayer,
    esriGeometryEngine,
    EsriSimpleLineSymbol,
    EsriGraphic,
    esriUnits,
    esriWMUtils,
    DrawFeedBack,
    templateStr
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: templateStr,
        baseClass: 'jimu-widget-TabLine',

        /**
         * class constructor
         **/
        constructor: function (args) {
          dojoDeclare.safeMixin(this, args);
        },

        /**
         * dijit post create
         **/
        postCreate: function () {
          console.log('TabLine');

          this.currentUnit = this.lengthUnitDD.get('value');

          dojoTopic.subscribe('CLEAR_GRAPHICS', dojoLang.hitch(this, this.clearGraphics));

          // add extended toolbar
          this.dt = new DrawFeedBack(this.map);

          this._lineSym = new EsriSimpleLineSymbol({
            'type': 'esriSLS',
            'style': 'esriSLSSolid',
            'color': [255, 50, 50, 255],
            'width': 1.25
          });

          this._gl = new EsriGraphicsLayer();
          this.map.addLayer(this._gl);

          this.own(
            this.dt.on(
              'draw-complete',
              dojoLang.hitch(this, this.feedbackDidComplete)
          ));

          this.own(dojoOn(
            this.addPointBtn,
            'click',
            dojoLang.hitch(this, this.pointButtonWasClicked)
          ));
        },

        /**
         * Button click event, activate feedback tool
         **/
        pointButtonWasClicked: function () {
          this.map.disableMapNavigation();
          this.dt.activate('line');
          dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');
        },

        /**
         *
         **/
        feedbackDidComplete: function (results) {

          var gdgeo = esriGeometryEngine.geodesicDensify(results.geographicGeometry, 10000);

          var gdLength = esriGeometryEngine.geodesicLength(results.geographicGeometry, this.currentUnit);

          var wmgra = esriWMUtils.geographicToWebMercator(gdgeo);

          var g = new EsriGraphic(wmgra, this._lineSym);

          var stPoint = gdgeo.getPoint(0,0);

          var endPoint = gdgeo.getPoint(0, gdgeo.paths[0].length - 1);

          var startPointStr = dojoString.substitute('${xStr}, ${yStr}', {
            xStr: dojoNumber.format(stPoint.y, {places:4}),
            yStr: dojoNumber.format(stPoint.x, {places:4})
          });

          var endPointStr = dojoString.substitute('${xStr}, ${yStr}', {
            xStr: dojoNumber.format(endPoint.y, {places:4}),
            yStr: dojoNumber.format(endPoint.x, {places:4})
          });

          var len = dojoNumber.format(gdLength, {places:4});

          var ang = dojoNumber.format(
            this.getAngle(stPoint, endPoint),
            {places:2}
          );

          dojoDomAttr.set(this.startPointCoords, 'value', startPointStr);
          dojoDomAttr.set(this.endPointCoords, 'value', endPointStr);
          dojoDomAttr.set(this.lengthInput, 'value', len);
          dojoDomAttr.set(this.angleInput, 'value', ang);

          this._gl.add(g);
          this.map.enableMapNavigation();
          this.dt.deactivate();
          dojoDomClass.toggle(this.addPointBtn, 'jimu-state-active');

        },

        /**
         *
         **/
        clearGraphics: function () {
          if (this._gl) {
            this._gl.clear();
            dojoDomAttr.set(this.startPointCoords, 'value', '');
            dojoDomAttr.set(this.endPointCoords, 'value', '');
            dojoDomAttr.set(this.lengthInput, 'value', '');
            dojoDomAttr.set(this.angleInput, 'value', '');
          }
        },

        /**
         *
         **/
        getAngle: function (stPoint, endPoint) {
          var delx = endPoint.y - stPoint.y;
          var dely = endPoint.x - stPoint.x;

          var azi = Math.atan2(dely, delx) * 180 / Math.PI;
          var br = ((azi + 360) % 360).toFixed(2);

          return br;
        }
    });
});
