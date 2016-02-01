/*global define*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/_base/array',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'esri/layers/GraphicsLayer',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/PictureMarkerSymbol',
    './CoordinateControl'
], function (
    dojoDeclare,
    dojoLang,
    dojoTopic,
    dojoArray,
    dijitWidgetsInTemplateMixin,
    jimuBaseWidget,
    EsriGraphicsLayer,
    EsriSimpleRenderer,
    EsriPictureMarkerSymbol,
    CoordinateControl
) {
    'use strict';
    var cls = dojoDeclare([jimuBaseWidget, dijitWidgetsInTemplateMixin], {
        baseClass: 'jimu-widget-cw',
        name: 'CW',

        /**
         *
         **/
        postCreate: function () {
            dojoTopic.subscribe("REMOVECONTROL", dojoLang.hitch(this, this.removeControl));
            dojoTopic.subscribe("ADDNEWNOTATION", dojoLang.hitch(this, this.addOutputSrBtn));

            this.coordTypes = ['DD', 'DDM', 'DMS', 'GARS', 'MGRS', 'USNG', 'UTM'];
            if (this.config.initial_coords && this.config.initial_coords.length > 0) {
                this.coordTypes = this.config.initial_coords;
            }

            // Create graphics layer
            if (!this.coordGLayer) {
                var glsym = new EsriPictureMarkerSymbol(
                    this.folderUrl + "images/CoordinateLocation.png",
                    26,
                    26
                );
                glsym.setOffset(0, 13);

                var glrenderer = new EsriSimpleRenderer(glsym);

                this.coordGLayer = new EsriGraphicsLayer();
                this.coordGLayer.setRenderer(glrenderer);
                this.map.addLayer(this.coordGLayer);
            }
        },

        /**
         *
         **/
        removeControl: function () {
            console.log("Remove Control");
        },

        /**
         *
         **/
        addOutputSrBtn: function (withType) {
            if (!withType) {
                withType = 'DD';
            }

            var cc = new CoordinateControl({
                parent_widget: this,
                input: false,
                currentClickPoint: this.inputControl.currentClickPoint,
                type: withType
            });

            cc.placeAt(this.outputtablecontainer);
            cc.startup();
        },

        /**
         *
         **/
        startup: function () {
            this.inputControl = new CoordinateControl({
                parent_widget: this,
                input: true,
                type: 'DD'
            });
            this.inputControl.placeAt(this.inputcoordcontainer);
            this.inputControl.startup();

            dojoArray.forEach(this.coordTypes, function (itm) {
                this.addOutputSrBtn(itm);
            }, this);
        },

        /**
         * widget open event handler
         **/
        onOpen: function () {
            this.setWidgetSleep(false);
        },

        /**
         * widget close event handler
         **/
        onClose: function () {
            this.setWidgetSleep(true);
        },

        /**
         *
         **/
        setWidgetSleep: function (sleeping) {

            if (sleeping) {
                if (this.coordGLayer && this.coordGLayer.visible) {
                    this.coordGLayer.setVisibility(false);
                }
            } else {
                if (this.coordGLayer && !this.coordGLayer.visible) {
                    this.coordGLayer.setVisibility(true);
                }
            }

            //inform child widgets we are inactive
            dojoTopic.publish("CRDWIDGETSTATEDIDCHANGE", this.state);
        },

        /**
         *
         **/
        disableWebMapPopup: function () {
            this.map.setInfoWindowOnClick(false);
        },

        /**
         *
         **/
        enableWebMapPopup: function () {
            this.map.setInfoWindowOnClick(true);
        }
    });

    return cls;
});
