/*global define*/
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom-attr',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/string',
    'dojo/topic',
    'dojo/keys',
    'dojo/dom',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/TextBox',
    'dijit/form/Select',
    'dijit/registry',
    'dijit/Tooltip',
    'dojo/text!./CoordinateControl.html',
    'esri/geometry/webMercatorUtils',
    'esri/graphic',
    'esri/geometry/Point',
    'esri/SpatialReference',
    'esri/tasks/GeometryService',
    './util',
    'jimu/dijit/Message'
], function (
    dojoDeclare,
    dojoLang,
    dojoOn,
    dojoDomAttr,
    dojoDomClass,
    dojoDomStyle,
    dojoString,
    dojoTopic,
    dojoKeys,
    dojoDom,
    dijitWidgetBase,
    dijitTemplatedMixin,
    dijitWidgetsInTemplate,
    dijitTextBox,
    dijitSelect,
    dijitRegistry,
    dijitTooltip,
    coordCntrl,
    esriWMUtils,
    EsriGraphic,
    EsriPoint,
    EsriSpatialReference,
    EsriGeometryService,
    Util,
    JimuMessage
) {
    'use strict';
    return dojoDeclare([dijitWidgetBase, dijitTemplatedMixin, dijitWidgetsInTemplate], {
        templateString: coordCntrl,
        baseClass: 'jimu-widget-cc',
        input: true,
        /**** type: 'dd', Available Types: DD, DDM, DMS, GARS, MGRS, USNG, UTM ****/

        /**
         *
         **/
        constructor: function (args) {
            dojoDeclare.safeMixin(this, args);
            this.uid = args.id || dijit.registry.getUniqueId('cc');
           //console.log("initializing : " + this.uid);
        },

        /**
         *
         **/
        parentStateDidChange: function (state) {
            if (state === 'opened') {
                this.mapclickhandler.resume();
            } else {
                this.mapclickhandler.pause();
            }
        },

        /**
         *
         **/
        postCreate: function () {
            //this.inherited(arguments);
            //this.uid = this.id;

            this.util = new Util({appConfig: this.parent_widget.config});

            var geomsrvcurl = this.parent_widget.config.geometry_service.url ||
                    'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer/fromGeoCoordinateString';

            this.geomsrvc = new EsriGeometryService(geomsrvcurl);

            // set initial value of coordinate type dropdown
            this.typeSelect.set('value', this.type);

            // setup event notification and handlers
            dojoTopic.subscribe("CRDWIDGETSTATEDIDCHANGE", dojoLang.hitch(this, this.parentStateDidChange));
            dojoTopic.subscribe("INPUTPOINTDIDCHANGE", dojoLang.hitch(this, this.mapWasClicked));

            // listen for dijit events
            this.own(dojoOn(this.expandButton, 'click', dojoLang.hitch(this, this.expandButtonWasClicked)));
            this.own(dojoOn(this.addNewCoordinateNotationBtn, 'click', dojoLang.hitch(this, this.newCoordnateBtnWasClicked)));
            this.own(dojoOn(this.zoomButton, 'click', dojoLang.hitch(this, this.zoomButtonWasClicked)));

            this.cpbtn.addEventListener('click', dojoLang.hitch(this, this.cpBtnWasClicked));
            this.sub1val_cpbtn.addEventListener('click', dojoLang.hitch(this, this.cpSubBtnWasClicked));
            this.sub2val_cpbtn.addEventListener('click', dojoLang.hitch(this, this.cpSubBtnWasClicked));
            this.sub3val_cpbtn.addEventListener('click', dojoLang.hitch(this, this.cpSubBtnWasClicked));
            this.sub4val_cpbtn.addEventListener('click', dojoLang.hitch(this, this.cpSubBtnWasClicked));
            //this.own(dojoOn(this.cpbtn, 'click', dojoLang.hitch(this, this.cpBtnWasClicked)));

            this.mapclickhandler = dojoOn.pausable(this.parent_widget.map, 'click', dojoLang.hitch(this, this.mapWasClicked));

            this.own(this.typeSelect.on('change', dojoLang.hitch(this, this.typeSelectDidChange)));

            // hide any actions we don't want to see on the input coords
            if (this.input) {

                this.setHidden(this.expandButton);
                this.setHidden(this.typeSelect.domNode);
                this.setHidden(this.removeControlBtn);
                this.own(dojoOn(this.coordtext, 'keyup', dojoLang.hitch(this, this.coordTextInputKeyWasPressed)));
                //this.own(dojoOn(this.coordtext, 'blur', dojoLang.hitch(this, this.coordTextInputLostFocus)));
                this.own(this.geomsrvc.on('error', dojoLang.hitch(this, this.geomSrvcDidFail)));

                dojoDomClass.add(this.cpbtn, 'inputCopyBtn');
                dojoDomAttr.set(this.cpbtn, 'title', 'Copy all output coordinates');

                // add a default graphic during input widget initialization
                var cPt = this.parent_widget.map.extent.getCenter();
                this.parent_widget.coordGLayer.add(new EsriGraphic(cPt));
                this.currentClickPoint = this.getDDPoint(cPt);
            } else {
                dojoDomClass.add(this.cpbtn, 'outputCopyBtn');
                this.setHidden(this.addNewCoordinateNotationBtn);
                this.setHidden(this.zoomButton);
                this.coordtext.readOnly = true;
            }

            // set an initial coord
            if (this.currentClickPoint) {
                this.updateDisplay();
            }
        },

        /**
         *
         **/
        cpSubBtnWasClicked: function (evt) {
            //console.log("Copy" + evt.currentTarget);
            var c = evt.currentTarget.id.split('~')[0];
            var s;

            this[c].select();
            try {
                s = document.execCommand('copy');
            } catch (err) {
                s = false;
            }

            var t = s ? "Copy Succesful" : "Unable to Copy\n use ctrl+c as an alternative";

            this.showToolTip(evt.currentTarget.id, t);
        },

        /**
         *
         **/
        cpBtnWasClicked: function (evt) {
            evt.preventDefault();
            var s = undefined;
            var tv;
            if (this.input) {

                var fw = dijitRegistry.toArray().filter(function (w) {
                    return w.baseClass === 'jimu-widget-cc' && !w.input;
                });

                var w = fw.map(function (w) {
                    return w.coordtext.value;
                }).join('\r\n');

                tv = this.coordtext.value;

                this.coordtext.value = w;

                this.coordtext.select();

                try {
                    s = document.execCommand('copy');

                } catch (caerr) {
                    s = false;
                }

                this.coordtext.value = tv;
            } else {

                this.coordtext.select();
                try {
                    s = document.execCommand('copy');
                } catch (cerr) {
                    s = false;
                }
            }

            var t = s ? "Copy Succesful" : "Unable to Copy\n use ctrl+c as an alternative";

            this.showToolTip(this.cpbtn.id, t);
        },

        /**
         *
         **/
        cpCoordPart: function (fromCntrl) {

        },

        /**
         *
         **/
        showToolTip: function (onId, withText) {

            var n = dojoDom.byId(onId);
            dijitTooltip.show(withText, n);
            /*dijitTooltip.defaultPosition = 'below';
            dojoOn.once(n, dojoMouse.leave, function () {
                dijitTooltip.hide(n);
            })*/
            setTimeout(function () {
                dijitTooltip.hide(n);
            }, 1000);
        },

        /**
         *
         **/
        geomSrvcDidComplete: function (r) {
            console.log(this.uid + " - geomSrvcDidComplete");
            if (r[0].length <= 0) {
                new JimuMessage({message: "unable to parse coordinates"});
                return;
            }

            var newpt = new EsriPoint(r[0][0], r[0][1], new EsriSpatialReference({wkid: 4326}));
            this.currentClickPoint = newpt;

            if (this.input) {
                this.zoomButtonWasClicked();
                dojoTopic.publish("INPUTPOINTDIDCHANGE", {mapPoint: this.currentClickPoint, inputFromText: true});
            }
        },

        /**
         *
         **/
        geomSrvcDidFail: function () {
            new JimuMessage({message: "Unable to parse input coordinates"});
        },

        /**
         *
         *
        coordTextInputLostFocus: function (evt) {
        },*/

        /**
         * Handles enter key press event
         **/
        coordTextInputKeyWasPressed: function (evt) {
            if (evt.keyCode === dojoKeys.ENTER) {
                var sanitizedInput = this.util.getCleanInput(evt.currentTarget.value);
                var newType = this.util.getCoordinateType(sanitizedInput);
                if (newType) {
                    this.type = newType;
                    this.processCoordTextInput(sanitizedInput);
                } else {
                    new JimuMessage({message: "Unable to determine input coordinate type"});
                }
                dojoDomAttr.set(this.coordtext, 'value', sanitizedInput);
            }
        },

        /**
         *
         **/
        processCoordTextInput: function (withStr) {
            this.util.getXYNotation(withStr, this.type).then(
                dojoLang.hitch(this, this.geomSrvcDidComplete),
                dojoLang.hitch(this, this.geomSrvcDidFail)
            );
        },

        /**
         *
         **/
        zoomButtonWasClicked: function () {
            if (this.input) {
                this.parent_widget.map.centerAndZoom(this.currentClickPoint, 19);
            }
        },

        /**
         *
         **/
        typeSelectDidChange: function () {
            this.type = this.typeSelect.get('value');

            if (this.currentClickPoint) {
                this.updateDisplay();
            }
        },

        /**
         *
         **/
        newCoordnateBtnWasClicked: function () {
            dojoTopic.publish("ADDNEWNOTATION");
        },

        /**
         *
         **/
        setHidden: function (cntrl) {
            dojoDomStyle.set(cntrl, 'display', 'none');
        },

        /**
         *
         **/
        setVisible: function (cntrl) {
            dojoDomStyle.set(cntrl, 'display', 'inline-flex');
        },

        /**
         *
         **/
        remove: function () {
            this.destroy();
        },

        /**
         *
         **/
        mapWasClicked: function (evt) {
           //console.log("mapWasClicked");
            this.currentClickPoint = this.getDDPoint(evt.mapPoint);
            if (evt.inputFromText) {
                this.inputFromText = true;
            } else {
                this.inputFromText = false;
            }
            this.updateDisplay();
        },

        /**
         *
         **/
        getDDPoint: function (fromPoint) {
            if (fromPoint.spatialReference.wkid === 102100) {
                return esriWMUtils.webMercatorToGeographic(fromPoint);
            }
            return fromPoint;
        },

        /**
         *
         **/
        expandButtonWasClicked: function () {
            dojoDomClass.toggle(this.coordcontrols, 'expanded');

            // if this.coordcontrols is expanded then disable all it's children
            this.setSubCoordUI(dojoDomClass.contains(this.coordcontrols, 'expanded'));
        },

        /**
         *
         **/
        setSubCoordUI: function (expanded) {

            if (expanded) {
                var cntrHeight = '150px';
                switch (this.type) {
                case 'DD':
                case 'DMS':
                case 'DDM':
                    this.sub1label.innerHTML = 'Lat';
                    this.sub2label.innerHTML = 'Lon';
                    this.setHidden(this.sub3);
                    this.setHidden(this.sub4);
                    cntrHeight = '90px';
                    break;
                case 'GARS':
                    this.sub1label.innerHTML = 'Lon';
                    this.sub2label.innerHTML = 'Lat';
                    this.sub3label.innerHTML = 'Quadrant';
                    this.setVisible(this.sub3);
                    this.sub4label.innerHTML = 'Key';
                    this.setVisible(this.sub4);
                    break;
                case 'USNG':
                case 'MGRS':
                    this.sub1label.innerHTML = 'GZD';
                    this.sub2label.innerHTML = 'Grid Sq';
                    this.sub3label.innerHTML = 'Easting';
                    this.setVisible(this.sub3);
                    this.sub4label.innerHTML = 'Northing';
                    this.setVisible(this.sub4);
                    break;
                case 'UTM':
                    this.sub1label.innerHTML = 'Zone';
                    this.sub2label.innerHTML = 'Easting';
                    this.sub3label.innerHTML = 'Northing';
                    this.setVisible(this.sub3);
                    this.setHidden(this.sub4);
                    cntrHeight = '125px';
                    break;
                }
                dojoDomStyle.set(this.coordcontrols, 'height', cntrHeight);
            } else {
                dojoDomStyle.set(this.coordcontrols, 'height', '0px');
            }
        },

        /**
         *
         **/
        setCoordUI: function (withValue) {

            var parts;
            var latdeg;
            var latmin;
            var latsec;
            var londeg;
            var lonmin;
            var lonsec;
            var gzd;
            var grdsq;
            var e;
            var n;
            var q;
            var w;
            var zone;
            var cntrlid = this.uid.split('_')[1];

            if (!this.input && this['cc_' + cntrlid + 'sub1val']) {

                switch (this.type) {
                case 'DDM':

                    parts = withValue[0].split(/[ ,]+/);

                    latdeg = parts[0];
                    latmin = parts[1];

                    londeg = parts[2];
                    lonmin = parts[3];

                    this['cc_' + cntrlid + 'sub1val'].value = dojoString.substitute('${latd} ${latm}', {
                        latd: latdeg,
                        latm: latmin
                    });

                    this['cc_' + cntrlid + 'sub2val'].value = dojoString.substitute('${lond} ${lonm}', {
                        lond: londeg,
                        lonm: lonmin
                    });
                    break;
                case 'DD':
                    parts = withValue[0].split(/[ ,]+/);

                    latdeg = parts[0];

                    londeg = parts[1];

                    this['cc_' + cntrlid + 'sub1val'].value = dojoString.substitute('${xcrd}', {
                        xcrd: latdeg
                    });

                    this['cc_' + cntrlid + 'sub2val'].value = dojoString.substitute('${ycrd}', {
                        ycrd: londeg
                    });
                    break;
                case 'DMS':
                    parts = withValue[0].split(/[ ,]+/);

                    latdeg = parts[0];
                    latmin = parts[1];
                    latsec = parts[2];

                    this['cc_' + cntrlid + 'sub1val'].value = dojoString.substitute("${latd} ${latm} ${lats}", {
                        latd: latdeg,
                        latm: latmin,
                        lats: latsec
                    });

                    londeg = parts[3];
                    lonmin = parts[4];
                    lonsec = parts[5];

                    this['cc_' + cntrlid + 'sub2val'].value = dojoString.substitute("${lond} ${lonm} ${lons}", {
                        lond: londeg,
                        lonm: lonmin,
                        lons: lonsec
                    });
                    break;
                case 'USNG':
                    gzd = withValue[0].match(/\d{1,2}[C-HJ-NP-X]/);
                    grdsq = withValue[0].match(/\s[a-zA-Z]{2}/);
                    e = withValue[0].match(/\s\d*\s/);
                    n = withValue[0].match(/\d{5}$/);

                    this['cc_' + cntrlid + 'sub1val'].value = gzd[0].trim();
                    this['cc_' + cntrlid + 'sub2val'].value = grdsq[0].trim();
                    this['cc_' + cntrlid + 'sub3val'].value = e[0].trim();
                    this['cc_' + cntrlid + 'sub4val'].value = n[0].trim();
                    break;
                case 'MGRS':
                    gzd = withValue[0].match(/\d{1,2}[C-HJ-NP-X]/);
                    grdsq = withValue[0].replace(gzd, '').match(/[a-hJ-zA-HJ-Z]{2}/);
                    e = withValue[0].replace(gzd + grdsq, '').match(/^\d{1,5}/);
                    n = withValue[0].replace(gzd + grdsq, '').match(/\d{1,5}$/);

                    this['cc_' + cntrlid + 'sub1val'].value = gzd[0].trim();
                    this['cc_' + cntrlid + 'sub2val'].value = grdsq[0].trim();
                    this['cc_' + cntrlid + 'sub3val'].value = e[0].trim();
                    this['cc_' + cntrlid + 'sub4val'].value = n[0].trim();
                    break;
                case 'GARS':
                    this['cc_' + cntrlid + 'sub1val'].value = withValue[0].match(/\d{3}/);
                    this['cc_' + cntrlid + 'sub2val'].value = withValue[0].match(/[a-zA-Z]{2}/);
                    q = withValue[0].match(/\d*$/);

                    this['cc_' + cntrlid + 'sub3val'].value = q[0][0];
                    this['cc_' + cntrlid + 'sub4val'].value = q[0][1];
                    break;
                case 'UTM':
                    parts = withValue[0].split(/[ ,]+/);
                    zone = parts[0];
                    e = parts[1];
                    w = parts[2];

                    this['cc_' + cntrlid + 'sub1val'].value = zone;
                    this['cc_' + cntrlid + 'sub2val'].value = e;
                    this['cc_' + cntrlid + 'sub3val'].value = w;
                    break;
                }
                this.setSubCoordUI(dojoDomClass.contains(this.coordcontrols, 'expanded'));
                if (this.coordtext) {
                    dojoDomAttr.set(this.coordtext, 'value', withValue);
                }
            } else if (!this.inputFromText) {
                if (this.coordtext) {
                    dojoDomAttr.set(this.coordtext, 'value', withValue);
                }
            }
        },

        /**
         *
         **/
        getFormattedCoordinates: function () {

            this.util.getCoordValues(this.currentClickPoint, this.type).then(
                dojoLang.hitch({s: this}, function (r) {
                    this.s.setCoordUI(r);
                }),
                dojoLang.hitch(this, function (err) {
                    console.log("Unable to get coordinate value" + err);
                })
            );
        },

        /**
         * Helper function to prettify decimal degrees into DMS (degrees-minutes-seconds).
         *
         * @param {number} decDeg The decimal degree number
         * @param {string} decDir LAT or LON
         *
         * @return {string} Human-readable representation of decDeg.
         **/
        degToDMS: function (decDeg, decDir) {
            /** @type {number} */
            var d = Math.abs(decDeg);

            /** @type {number} */
            var deg = Math.floor(d);
            d = d - deg;

            /** @type {number} */
            var min = Math.floor(d * 60);

            /** @type {number} */
            var sec = Math.floor((d - min / 60) * 60 * 60);

            if (sec === 60) { // can happen due to rounding above
                min = min + 1;
                sec = 0;
            }
            if (min === 60) { // can happen due to rounding above
                deg = deg + 1;
                min = 0;
            }

            /** @type {string} */
            //var min_string = min < 10 ? "0" + min : min;
            var min_string = min;
            if (min < 10) {
                min_string = "0" + min;
            }

            /** @type {string} */
            //var sec_string = sec < 10 ? "0" + sec : sec;
            var sec_string = sec;
            if (sec < 10) {
                sec_string = "0" + sec;
            }

            /** @type {string} */
            //var dir = (decDir === 'LAT') ? (decDeg < 0 ? "S" : "N") : (decDeg < 0 ? "W" : "E");

            var dir;
            if (decDir === 'LAT') {
                dir = "N";
                if (decDeg < 0) {
                    dir = "S";
                }
            } else {
                dir = "E";
                if (decDeg < 0) {
                    dir = "N";
                }
            }
            /*return (decDir === 'LAT') ? deg + "&deg;" + min_string + "&prime;" + sec_string + "&Prime;" + dir :
                deg + "&deg;" + min_string + "&prime;" + sec_string + "&Prime;" + dir;*/

            return dojoString.substitute('${d}° ${m}\' ${s}\" ${dr}', {
                d: deg,
                m: min_string,
                s: sec_string,
                dr: dir
            });
        },

        /**
         *
         **/
        updateDisplay: function () {

            this.getFormattedCoordinates(this.currentClickPoint);

            if (this.input) {
                this.parent_widget.coordGLayer.clear();
                //this.parent_widget.coordGLayer.add(new EsriGraphic(evt.mapPoint));
                this.parent_widget.coordGLayer.add(new EsriGraphic(this.currentClickPoint));
            }
        }
    });
});
