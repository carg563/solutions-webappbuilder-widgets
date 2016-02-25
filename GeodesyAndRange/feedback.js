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

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/has",
  "esri/toolbars/draw",
  "esri/geometry/Polyline",
  "esri/geometry/Polygon",
  "esri/geometry/Point",
  "esri/graphic",
  "esri/geometry/geometryEngineAsync"
], function (
  dojoDeclare,
  dojoLang,
  dojoHas,
  esriDraw,
  EsriPolyLine,
  EsriPolygon,
  EsriPoint,
  EsriGraphic,
  esriGeoDUtils
) {
  return dojoDeclare(esriDraw, {

    /**
     *
     **/
    constructor: function () {
      // force loading of the geometryEngine
      // prevents lag in feedback when used in mousedrag
      esriGeoDUtils.isSimple(new EsriPoint({
        "x": -122.65,
        "y": 45.53,
        "spatialReference": {
          "wkid": 4326
        }
      })).then(function (r) {
        console.log("Geometry Engine initialized");
      });

      this.inherited(arguments);
    },
    /**
     * override drag event to create geodesic feedback
     **/
    _onMouseDragHandler: function (evt) {
      // Pressing escape while drawing causing errors for certain draw tools
      // -- Issue #1381
      if(!this._graphic && !this._points.length){
        return;
      }

      // BlackBerry legacy issue (not changing for 3x)
      if (dojoHas("esri-touch") && !this._points.length) {
        // BlackBerry Torch certainly needs this
        // to prevent page from panning
        evt.preventDefault();
        return;
      }

      this._dragged = true;
      var snappingPoint;
      if (this.map.snappingManager) {
        snappingPoint = this.map.snappingManager._snappingPoint;
      }
      var start = this._points[0],
      end = snappingPoint || evt.mapPoint,
      _graphic = this._graphic;
      switch(this._geometryType){
        case esriDraw.LINE:
          var g = dojoLang.mixin(_graphic.geometry, {
            paths:[
              [[start.x, start.y], [end.x, end.y]]
            ]});

          esriGeoDUtils.geodesicDensify(g, 10000).then(function(r) {
            _graphic.setGeometry(r);
          });

          break;
      }

      if (dojoHas("esri-touch")) {
        // Prevent iOS from panning the web page
        evt.preventDefault();
      }
      //this.inherited(arguments);
    }
  });
});
