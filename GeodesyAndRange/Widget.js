///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015 Esri. All Rights Reserved.
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
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/topic',
  'dojo/_base/array',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/registry',
  'jimu/BaseWidget',
  'jimu/dijit/TabContainer3',
  'jimu/dijit/ViewStack',
  './TabLine',
  './TabCircle',
  './TabEllipse',
  './TabRange'
], function (
  dojoDeclare,
  dojoLang,
  dojoTopic,
  dojoArray,
  dijitWidgetsInTemplate,
  dijitRegistry,
  jimuBaseWidget,
  JimuTabContainer3,
  JimuViewStack,
  TabLine,
  TabCircle,
  TabEllipse,
  TabRange
) {
  'use strict';
  var clz = dojoDeclare([jimuBaseWidget, dijitWidgetsInTemplate], {
    baseClass: 'jimu-widget-GeodesyAndRange',

    /**
     *
     **/
    postCreate: function () {
      this.tab = new JimuTabContainer3({
        tabs: [
          {
            title: 'Lines',
            content: new TabLine({}, this.lineTabNode)
          },
          {
            title: 'Circle',
            content: new TabCircle({}, this.CircleTabContainer)
          },
          {
            title: 'Ellipse',
            content: new TabEllipse({}, this.EllipseTabContainer)
          },
          {
            title: 'Range',
            content: new TabRange({}, this.RangeTabContainer)
          }
        ]
      }, this.tabContainer);

    }

  });
  return clz;
});
