// -Separating annotations from the viewer. They have their own canvas / layer now.
// -This is more like a view than a viewer.
// -Viewer still handles stack correlations crosses.
// -This object does not bind events, but does have handle methods called by
//  the viewer.  We could change this if the annotationsLayer received
//  events before the viewer.
// -Leave the copyright stuff in the viewer too.  It is not rendered in the canvas.
// -AnnotationWidget (the panel for choosing an annotation to add) is
//  separate from this class.
// -I will need to fix saving images from the canvas.  Saving large imag
//  should still work. Use this for everything.
// -This class does not handle annotation visibility (part of annotationWidget).



(function () {
    "use strict";

    window.SAM = window.SAM || {};
    window.SAM.ImagePathUrl = "/webgl-viewer/static/";
    window.SAM.MOBILE_DEVICE = false;

    SAM.detectMobile = function() {
        if ( SAM.MOBILE_DEVICE) {
            return SAM.MOBILE_DEVICE;
        }
        SAM.MOBILE_DEVICE = false;
        if ( navigator.userAgent.match(/Android/i)) {
            SAM.MOBILE_DEVICE = "Andriod";
        }
        if ( navigator.userAgent.match(/webOS/i)) {
            SAM.MOBILE_DEVICE = "webOS";
        }
        if ( navigator.userAgent.match(/iPhone/i)) {
            SAM.MOBILE_DEVICE = "iPhone";
        }
        if ( navigator.userAgent.match(/iPad/i)) {
            SAM.MOBILE_DEVICE = "iPad";
        }
        if ( navigator.userAgent.match(/iPod/i)) {
            SAM.MOBILE_DEVICE = "iPod";
        }
        if ( navigator.userAgent.match(/BlackBerry/i)) {
            SAM.MOBILE_DEVICE = "BlackBerry";
        }
        if ( navigator.userAgent.match(/Windows Phone/i)) {
            SAM.MOBILE_DEVICE = "Windows Phone";
        }
        if (SA.MOBILE_DEVICE) {
            SAM.MaximumNumberOfTiles = 5000;
        }
        return SAM.MOBILE_DEVICE;
    }


    // Debugging ... not called in normal operation.
    // Report the area for each polyline in the sequence.
    SAM.areaSequence = function(r, g, b) {
        var pl = new SAM.Polyline();
        var vr = SA.RootNote.ViewerRecords;
        var area_sequence = [];
        for (var i = 0; i < vr.length; ++i) {
            var area = 0;
            var as = vr[i].Annotations;
            for (var j = 0; j < as.length; ++j) {
                var an = as[j];
                if (an.type == "polyline" &&
                    Math.round(an.outlinecolor[0]*255) == r &&
                    Math.round(an.outlinecolor[1]*255) == g &&
                    Math.round(an.outlinecolor[2]*255) == b) {
                    if (area != 0) { console.log("Found more than one in a section");}
                    pl.Points = an.points;
                    area += pl.ComputeArea() * 0.25 * 0.25;
                    area = Math.round(area*100) / 100.0;
                }
            }
            area_sequence.push(area)
        }
        //console.log(JSON.stringify(area_sequence));
        return area_sequence;
    }

    // Debugging ... not called in normal operation.
    // For manually moving annotations from individual slides to a stack.
    // Remove all annotations that are not in the current view.
    SAM.pruneAnnotations = function(){
        var c=SA.VIEWER1.GetCamera().FocalPoint;
        var w=SA.VIEWER1.GetCamera().GetWidth()/2;
        var h=SA.VIEWER1.GetCamera().GetHeight()/2;
        var v=[c[0]-w,c[0]+w,c[1]-h,c[1]+h];
        var l=SA.VIEWER1.GetAnnotationLayer()
        var w=l.WidgetList;
        var n=[];
        var r=[w.length,0]
        for(var i=0;i<w.length;++i){
            //console.log(i)
            var p=w[i];
            if(p.Polyline){
                var b=p.Polyline.GetBounds();
                var x=(b[0]+b[1])/2;
                var y=(b[2]+b[3])/2;
                if (x<v[1]&&x>v[0]&&y<v[3]&&y>v[2]){
                    n.push(p);
                }
            }
        }
        r[1] = n.length;
        l.WidgetList = n;
        SA.display.NavigationWidget.NextNote();
        return r;
    }

    // Convert any color to an array [r,g,b] values 0->1
    SAM.ConvertColor = function(color) {
        if ( typeof(color)=='string' && color[0] != '#') {
            if (color.slice(0,5) == "rgba(") {
                color = color.slice(5,-1).split(',');
                color[0] = color[0]/255;
                color[1] = color[1]/255;
                color[2] = color[1]/255;
                return color;
            }

            // Deal with color names.
            var colors = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
                          "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
                          "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
                          "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
                          "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
                          "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
                          "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
                          "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
                          "honeydew":"#f0fff0","hotpink":"#ff69b4",
                          "indianred ":"#cd5c5c","indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
                          "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
                          "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
                          "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
                          "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
                          "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
                          "navajowhite":"#ffdead","navy":"#000080",
                          "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
                          "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
                          "red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
                          "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
                          "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
                          "violet":"#ee82ee",
                          "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
                          "yellow":"#ffff00","yellowgreen":"#9acd32"};
            if (typeof colors[color.toLowerCase()] != 'undefined') {
                color = colors[color.toLowerCase()];
            } else {
                alert("Unknown color " + color);
            }
        }

        // Deal with color in hex format i.e. #0000ff
        if ( typeof(color)=='string' && color.length == 7 && color[0] == '#') {
            var floatColor = [];
            var idx = 1;
            for (var i = 0; i < 3; ++i) {
                var val = ((16.0 * SAM.HexDigitToInt(color[idx++])) + SAM.HexDigitToInt(color[idx++])) / 255.0;
                floatColor.push(val);
            }
            return floatColor;
        }
        // No other formats for now.
        return color;
    }


    // RGB [Float, Float, Float] to #RRGGBB string
    SAM.ConvertColorToHex = function(color) {
        if (typeof(color) == 'string') { 
            if (color.slice(0,5) == "rgba(") {
                return color;
            }
            color = SAM.ConvertColorNameToHex(color);
            if (color.substring(0,1) == '#') {
                return color;
            } else if (color.substring(0,3) == 'rgb') {
                tmp = color.substring(4,color.length - 1).split(',');
                color = [parseInt(tmp[0])/255,
                         parseInt(tmp[1])/255,
                         parseInt(tmp[2])/255];
            }
        }
        var hexDigits = "0123456789abcdef";
        var str = "#";
        for (var i = 0; i < 3; ++i) {
	          var tmp = color[i];
	          for (var j = 0; j < 2; ++j) {
	              tmp *= 16.0;
	              var digit = Math.floor(tmp);
	              if (digit < 0) { digit = 0; }
	              if (digit > 15){ digit = 15;}
	              tmp = tmp - digit;
	              str += hexDigits.charAt(digit);
            }
        }
        return str;
    }


    // 0-f hex digit to int
    SAM.HexDigitToInt = function(hex) {
        if (hex == '1') {
            return 1.0;
        } else if (hex == '2') {
            return 2.0;
        } else if (hex == '3') {
            return 3.0;
        } else if (hex == '4') {
            return 4.0;
        } else if (hex == '5') {
            return 5.0;
        } else if (hex == '6') {
            return 6.0;
        } else if (hex == '7') {
            return 7.0;
        } else if (hex == '8') {
            return 8.0;
        } else if (hex == '9') {
            return 9.0;
        } else if (hex == 'a' || hex == 'A') {
            return 10.0;
        } else if (hex == 'b' || hex == 'B') {
            return 11.0;
        } else if (hex == 'c' || hex == 'C') {
            return 12.0;
        } else if (hex == 'd' || hex == 'D') {
            return 13.0;
        } else if (hex == 'e' || hex == 'E') {
            return 14.0;
        } else if (hex == 'f' || hex == 'F') {
            return 15.0;
        }
        return 0.0;
    }


    SAM.ConvertColorNameToHex = function(color) {
        // Deal with color names.
        if ( typeof(color)=='string' && color[0] != '#') {
            var colors = {
                "aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff",
                "aquamarine":"#7fffd4","azure":"#f0ffff","beige":"#f5f5dc",
                "bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd",
                "blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a",
                "burlywood":"#deb887","cadetblue":"#5f9ea0","chartreuse":"#7fff00",
                "chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed",
                "cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
                "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b",
                "darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b",
                "darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
                "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000",
                "darksalmon":"#e9967a","darkseagreen":"#8fbc8f",
                "darkslateblue":"#483d8b","darkslategray":"#2f4f4f",
                "darkturquoise":"#00ced1","darkviolet":"#9400d3",
                "deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969",
                "dodgerblue":"#1e90ff","firebrick":"#b22222","floralwhite":"#fffaf0",
                "forestgreen":"#228b22","fuchsia":"#ff00ff","gainsboro":"#dcdcdc",
                "ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520",
                "gray":"#808080","green":"#008000","greenyellow":"#adff2f",
                "honeydew":"#f0fff0","hotpink":"#ff69b4","indianred":"#cd5c5c",
                "indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
                "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00",
                "lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080",
                "lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
                "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1",
                "lightsalmon":"#ffa07a","lightseagreen":"#20b2aa",
                "lightskyblue":"#87cefa","lightslategray":"#778899",
                "lightsteelblue":"#b0c4de","lightyellow":"#ffffe0","lime":"#00ff00",
                "limegreen":"#32cd32","linen":"#faf0e6","magenta":"#ff00ff",
                "maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd",
                "mediumorchid":"#ba55d3","mediumpurple":"#9370d8",
                "mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
                "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc",
                "mediumvioletred":"#c71585","midnightblue":"#191970",
                "mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
                "navajowhite":"#ffdead","navy":"#000080","oldlace":"#fdf5e6",
                "olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500",
                "orangered":"#ff4500","orchid":"#da70d6","palegoldenrod":"#eee8aa",
                "palegreen":"#98fb98","paleturquoise":"#afeeee",
                "palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9",
                "peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd",
                "powderblue":"#b0e0e6","purple":"#800080","red":"#ff0000",
                "rosybrown":"#bc8f8f","royalblue":"#4169e1","saddlebrown":"#8b4513",
                "salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57",
                "seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0",
                "skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090",
                "snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
                "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347",
                "turquoise":"#40e0d0","violet":"#ee82ee","wheat":"#f5deb3",
                "white":"#ffffff","whitesmoke":"#f5f5f5",
                "yellow":"#ffff00","yellowgreen":"#9acd32"};
            color = color.toLowerCase();
            if (typeof colors[color] != 'undefined') {
                color = colors[color];
            }
        }
        return color;
    }


    // length units = meters
    window.SAM.DistanceToString = function(length) {
        var lengthStr = "";
        if (length < 0.001) {
            // Latin-1 00B5 is micro sign
            lengthStr += (length*1e6).toFixed(2) + " \xB5m";
        } else if (length < 0.01) {
            lengthStr += (length*1e3).toFixed(2) + " mm";
        } else if (length < 1.0)  {
            lengthStr += (length*1e2).toFixed(2) + " cm";
        } else if (length < 1000) {
            lengthStr += (length).toFixed(2) + " m";
        } else {
            lengthStr += (length).toFixed(2) + " km";
        }
        return lengthStr;
    }

    window.SAM.StringToDistance = function(lengthStr) {
        var length = 0;
        lengthStr = lengthStr.trim(); // remove leading and trailing spaces.
        var len = lengthStr.length;
        // Convert to microns
        if (lengthStr.substring(len-2,len) == "\xB5m") {
            length = parseFloat(lengthStr.substring(0,len-2)) / 1e6;
        } else if (lengthStr.substring(len-2,len) == "mm") {
            length = parseFloat(lengthStr.substring(0,len-2)) / 1e3;
        } else if (lengthStr.substring(len-2,len) == "cm") {
            length = parseFloat(lengthStr.substring(0,len-2)) / 1e2;
        } else if (lengthStr.substring(len-2,len) == " m") {
            length = parseFloat(lengthStr.substring(0,len-2));
        } else if (lengthStr.substring(len-2,len) == "km") {
            length = parseFloat(lengthStr.substring(0,len-2)) * 1e3;
        }

        return length;
    }

    // ConvertToMeters.
    window.SAM.ConvertToMeters = function (distObj) 
    {
        if ( ! distObj.units || distObj.units == "Units") {
            return distObj.value;
        }

        if (distObj.units.toLowerCase() == "nm") {
            distObj.units = "m";
            return distObj.value *= 1e-9;
        }
        if (distObj.units.toLowerCase() == "\xB5m") {
            distObj.units = "m";
            return distObj.value *= 1e-6;
        }
        if (distObj.units.toLowerCase() == "mm") {
            distObj.units = "m";
            return distObj.value *= 1e-3;
        }
        if (distObj.units.toLowerCase() == "cm") {
            distObj.units = "m";
            return distObj.value *= 1e-2;
        }
        if (distObj.units.toLowerCase() == "dm") {
            distObj.units = "m";
            return distObj.value *= 1e-1;
        }
        if (distObj.units.toLowerCase() == "m") {
            distObj.units = "m";
            return distObj.value;
        }
        if (distObj.units.toLowerCase() == "km") {
            distObj.units = "m";
            return distObj.value *= 1e3;
        }
        console.log("Unknown units: " + units);
        return distObj.value;
    }

    window.SAM.ConvertForGui = function (distObj) 
    {
        if ( ! distObj.units) {
            distObj.units = "Units";
            return;
        }
        SAM.ConvertToMeters(distObj);
        if (distObj.value > 1000) {
            distObj.value = distObj.value/1000;
            distObj.units = "km";
            return;
        }
        if (distObj.value > 1) {
            distObj.value = distObj.value;
            distObj.units = "m";
            return;
        }
        if (distObj.value > 0.01) {
            distObj.value = distObj.value*100;
            distObj.units = "cm";
            return;
        }
        if (distObj.value > 0.001) {
            distObj.value = distObj.value*1000;
            distObj.units = "mm";
            return;
        }
        if (distObj.value > 0.0000001) {
            distObj.value = distObj.value*1000000;
            distObj.units = "\xB5m";
            return;
        }
        distObj.value = distObj.value*1000000000;
        distObj.units = "nm";
    }
    
    // Pass in the viewer div.
    // TODO: Pass the camera into the draw method.  It is shared here.
    function AnnotationLayer (parent) {
        var self = this;

        this.LayerDiv = $('<div>')
            .appendTo(parent)
            .css({'position':'absolute',
                  'left':'0px',
                  'top':'0px',
                  'border-width':'0px',
                  'width':'100%',
                  'height':'100%',
                  'box-sizing':'border-box',
                  'z-index':'100'})
            .addClass('sa-resize');

        // I do not like modifying the parent.
        var self = this;
        this.LayerDiv.saOnResize(
            function() {
                self.UpdateSize();
            });

        // Hack for debugging
        SAM.DebugLayer = this;

        // TODO: Abstract the view to a layer somehow.
        this.AnnotationView = new SAM.View(this.LayerDiv);

        this.AnnotationView.Canvas
            .saOnResize(function() {self.UpdateCanvasSize();});

        this.WidgetList = [];
        this.ActiveWidget = null;

        this.Visibility = true;
        // Scale widget is unique. Deal with it separately so it is not
        // saved with the notes.
        this.ScaleWidget = new SAM.ScaleWidget(this);

        var self = this;
        var can = this.LayerDiv;
        can.on(
            "mousedown.viewer",
			      function (event){
                return self.HandleMouseDown(event);
            });
        can.on(
            "mousemove.viewer",
			      function (event){
                // So key events go the the right viewer.
                this.focus();
                // Firefox does not set which for mouse move events.
                SA.FirefoxWhich(event);
                return self.HandleMouseMove(event);
            });
        // We need to detect the mouse up even if it happens outside the canvas,
        $(document.body).on(
            "mouseup.viewer",
			      function (event){
                self.HandleMouseUp(event);
                return true;
            });
        can.on(
            "wheel.viewer",
            function(event){
                return self.HandleMouseWheel(event.originalEvent);
            });

        // I am delaying getting event manager out of receiving touch events.
        // It has too many helper functions.
        can.on(
            "touchstart.viewer",
            function(event){
                return self.HandleTouchStart(event.originalEvent);
            });
        can.on(
            "touchmove.viewer",
            function(event){
                return self.HandleTouchMove(event.originalEvent);
            });
        can.on(
            "touchend.viewer",
            function(event){
                self.HandleTouchEnd(event.originalEvent);
                return true;
            });

        // necesary to respond to keyevents.
        this.LayerDiv.attr("tabindex","1");
        can.on(
            "keydown.viewer",
			      function (event){
                return self.HandleKeyDown(event);
            });
    }

    // Try to remove all global references to this viewer.
    AnnotationLayer.prototype.Delete = function () {
        this.AnnotationView.Delete();
    }

    AnnotationLayer.prototype.GetVisibility = function () {
        return this.Visibility;
    }
    AnnotationLayer.prototype.SetVisibility = function (vis) {
        this.Visibility = vis;
        this.EventuallyDraw();
    }

    AnnotationLayer.prototype.GetCamera = function () {
        return this.AnnotationView.GetCamera();
    }
    AnnotationLayer.prototype.GetViewport = function () {
        return this.AnnotationView.Viewport;
    }
    AnnotationLayer.prototype.UpdateCanvasSize = function () {
        this.AnnotationView.UpdateCanvasSize();
    }
    AnnotationLayer.prototype.Clear = function () {
        this.AnnotationView.Clear();
    }
    // This is the same as LayerDiv.
    // Get the div of the layer (main div).
    // It is used to append DOM GUI children.
    AnnotationLayer.prototype.GetCanvasDiv = function () {
        return this.AnnotationView.CanvasDiv;
    }
    // Get the current scale factor between pixels and world units.
    AnnotationLayer.prototype.GetPixelsPerUnit = function() {
        return this.AnnotationView.GetPixelsPerUnit();
    }

    AnnotationLayer.prototype.GetMetersPerUnit = function() {
        return this.AnnotationView.GetMetersPerUnit();
    }

    // the view arg is necessary for rendering into a separate canvas for
    // saving large images.
    AnnotationLayer.prototype.Draw = function (masterView) {
        masterView = masterView || this.AnnotationView;
        this.AnnotationView.Clear();
        if ( ! this.Visibility) { return;}

        var cam = masterView.Camera;
        this.AnnotationView.Camera.DeepCopy(cam);


        for(var i = 0; i < this.WidgetList.length; ++i) {
            this.WidgetList[i].Draw(this.AnnotationView);
        }
        if (this.ScaleWidget) {
            this.ScaleWidget.Draw(this.AnnotationView);
        }
    }

    // To compress draw events.
    AnnotationLayer.prototype.EventuallyDraw = function() {
        if ( ! this.RenderPending) {
            this.RenderPending = true;
            var self = this;
            requestAnimFrame(
                function() {
                    self.RenderPending = false;
                    self.Draw();
                });
        }
    }

    // Some widgets need access to the viewer.
    AnnotationLayer.prototype.GetViewer = function() {
        return this.Viewer || SA.VIEWER1;
    }

    // Load an array of anntoations into this layer.
    // It does not clear previous annotations. Call reset to do that.
    // Called by Viewer.SetViewerRecord()
    // This is neede to give a callback to an app that needs to update the
    // visibility of annotations based on a threshold.
    AnnotationLayer.prototype.LoadAnnotations = function(annotations) {
        // TODO: Fix this.  Keep actual widgets in the records / notes.
        // For now lets just do the easy thing and recreate all the
        // annotations.
        for (var i = 0; i < annotations.length; ++i) {
            var widget = this.LoadWidget(annotations[i]);
            // This a bad hack. Modifying that array passed in.
            // It is not really needed.  It was a fix for a schema mistake.
            if (! widget) {
                // Get rid of corrupt widgets that do not load properly
                annotations.splice(i,1);
                --i;
            }
        }

        // This is used by the vigilant plugnin to update which annotations
        // are visible based on a confidence threshold.
        if (this.LoadCallback) {
            (this.LoadCallback)();
        }
    }
    
    // Load a widget from a json object (origin MongoDB).
    // Returns the widget if there was not an error.
    AnnotationLayer.prototype.LoadWidget = function(obj) {
        var widget;
        switch(obj.type){
        case "lasso":
            widget = new SAM.LassoWidget(this, false);
            break;
        case "pencil":
            widget = new SAM.PencilWidget(this, false);
            break;
        case "text":
            widget = new SAM.TextWidget(this, "");
            break;
        case "circle":
            widget = new SAM.CircleWidget(this, false);
            break;
        case "polyline":
            widget = new SAM.PolylineWidget(this, false);
            break;
        case "stack_section":
            if (window.SA) {
                widget = new SA.StackSectionWidget(this);
            }
            break;
        case "sections":
            if (window.SA) {
                // HACK.....
                widget = new SA.SectionsWidget(this, SA.VIEWER1);
            }
            break;
        case "rect":
            widget = new SAM.RectWidget(this, false);
            break;
        case "rect_set":
            widget = new SAM.RectSetWidget(this, false);
            break;
        case "grid":
            widget = new SAM.GridWidget(this, false);
            break;
        }
        widget.Load(obj);
        // TODO: Get rid of this hack.
        // This is the messy way of detecting widgets that did not load
        // properly.
        if (widget.Type == "sections" && widget.IsEmpty()) {
            return undefined;
        }

        // We may want to load without adding.
        //this.AddWidget(widget);

        return widget;
    }

    // I expect only the widget SetActive to call these method.
    // A widget cannot call this if another widget is active.
    // The widget deals with its own activation and deactivation.
    AnnotationLayer.prototype.ActivateWidget = function(widget) {
        // not getting key events for copy.
        this.LayerDiv.focus()
        if (this.ActiveWidget == widget) {
            return;
        }
        // Make sure only one popup is visible at a time.
        for (var i = 0; i < this.WidgetList.length; ++i) {
            if (this.WidgetList[i].Popup) {
                this.WidgetList[i].Popup.Hide();
            }
        }

        this.ActiveWidget = widget;
        widget.SetActive(true);
    }
    AnnotationLayer.prototype.DeactivateWidget = function(widget) {
        if (this.ActiveWidget != widget || widget == null) {
            // Do nothing if the widget is not active.
            return;
        }
        // Incase the widget changed the cursor.  Change it back.
        this.LayerDiv.css({'cursor':'default'});
        // The cursor does not change immediatly.  Try to flush.
        this.EventuallyDraw();
        this.ActiveWidget = null;
        widget.SetActive(false);
    }
    AnnotationLayer.prototype.GetActiveWidget = function() {
        return this.ActiveWidget;
    }

    // Return to initial state.
    AnnotationLayer.prototype.Reset = function() {
        this.WidgetList = [];
    }

    AnnotationLayer.prototype.ComputeMouseWorld = function(event) {
        this.MouseWorld = this.GetCamera().ConvertPointViewerToWorld(event.offsetX, event.offsetY);
        // Put this extra ivar in the even object.
        event.worldX = this.MouseWorld[0];
        event.worldY= this.MouseWorld[1];
        return this.MouseWorld;
    }


    // TODO: share this code with viewer.
    // I think MouseX,Y and, offestX,Y are both
    // Save the previous touches and record the new
    // touch locations in viewport coordinates.
    AnnotationLayer.prototype.HandleTouch = function(e, startFlag) {
        var date = new Date();
        var t = date.getTime();
        // I have had trouble on the iPad with 0 delta times.
        // Lets see how it behaves with fewer events.
        // It was a bug in iPad4 Javascript.
        // This throttle is not necessary.
        if (t-this.Time < 20 && ! startFlag) { return false; }

        this.LastTime = this.Time;
        this.Time = t;

        if (!e) {
            var e = event;
        }

        // Still used on mobile devices?
        var viewport = this.GetViewport();
        this.LastTouches = this.Touches;
        this.Touches = [];
        for (var i = 0; i < e.targetTouches.length; ++i) {
            var offset = this.AnnotationView.Canvas.offset();
            var x = e.targetTouches[i].pageX - offset.left;
            var y = e.targetTouches[i].pageY - offset.top;
            this.Touches.push([x,y]);
        }

        this.LastMouseX = this.MouseX;
        this.LastMouseY = this.MouseY;

        // Compute the touch average.
        var numTouches = this.Touches.length;
        this.MouseX = this.MouseY = 0.0;
        for (var i = 0; i < numTouches; ++i) {
            this.MouseX += this.Touches[i][0];
            this.MouseY += this.Touches[i][1];
        }
        this.MouseX = this.MouseX / numTouches;
        this.MouseY = this.MouseY / numTouches;

        // Hack because we are moving away from using the event manager
        // Mouse interaction are already independant...
        this.offsetX = this.MouseX;
        this.offsetY = this.MouseY;

        return true;
    }


    // TODO: Try to get rid of the viewer argument.
    AnnotationLayer.prototype.HandleTouchStart = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        this.HandleTouch(event, true);

        // Code from a conflict
        // Touch was not activating widgets on the ipad.
        // Show text on hover.
        if (this.Visibility) {
            for (var touchIdx = 0; touchIdx < this.Touches.length; ++touchIdx) {
                event.offsetX = this.Touches[touchIdx][0];
                event.offsetY = this.Touches[touchIdx][1];
                this.ComputeMouseWorld(event);
                for (var i = 0; i < this.WidgetList.length; ++i) {
                    if ( ! this.WidgetList[i].GetActive() &&
                         this.WidgetList[i].CheckActive(event)) {
                        this.ActivateWidget(this.WidgetList[i]);
                        return true;
                    }
                }
            }
        }
    }

    AnnotationLayer.prototype.HandleTouchMove = function(e) {
        // Put a throttle on events
        if ( ! this.HandleTouch(e, false)) { return; }

        if (this.Touches.length == 1) {
            return this.HandleTouchPan(this);
        }
        if (this.Touches.length == 2) {
            return this.HandleTouchPinch(this);
        }
        //if (this.Touches.length == 3) {
        //    this.HandleTouchRotate(this);
        //    return
        //}
    }


    AnnotationLayer.prototype.HandleTouchPan = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleTouchPan) {
            return this.ActiveWidget.HandleTouchPan(event);
        }
        return ! this.ActiveWidget;
    }

    AnnotationLayer.prototype.HandleTouchPinch = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleTouchPinch) {
            return this.ActiveWidget.HandleTouchPinch(event);
        }
        return ! this.ActiveWidget;
    }

    AnnotationLayer.prototype.HandleTouchEnd = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleTouchEnd) {
            return this.ActiveWidget.HandleTouchEnd(event);
        }
        return ! this.ActiveWidget;
    }

    AnnotationLayer.prototype.SetMousePositionFromEvent = function(event) {
        if (event.offsetX && event.offsetY) {
            this.MouseX = event.offsetX;
            this.MouseY = event.offsetY;
            this.MouseTime = (new Date()).getTime();
        } else if (event.layerX && event.layerY) {
            this.MouseX = event.layerX;
            this.MouseY = event.layerY;
            this.MouseTime = (new Date()).getTime();
            event.offsetX = event.layerX;
            event.offsetY = event.layerY;
        }
        this.MouseTime = new Date().getTime();
    }

    AnnotationLayer.prototype.HandleMouseDown = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        this.LastMouseDownTime = this.MouseDownTime || 1;
        this.SetMousePositionFromEvent(event);

        // Trying to detect click
        // TODO: How to skip clicks when doubleclick occur.
        this.MouseClick = true;
        this.MouseDownX = this.MouseX;
        this.MouseDownY = this.MouseY;
        this.MouseDownTime = this.MouseTime;

        if (this.LastMouseDownTime) {
            if ( this.MouseDownTime - this.LastMouseDownTime < 200) {
                delete this.LastMouseDownTime;
                return this.HandleDoubleClick(event);
            }
        }

        if (this.ActiveWidget && this.ActiveWidget.HandleMouseDown) {
            return this.ActiveWidget.HandleMouseDown(event);
        }
        // We do not know if the widget will handle click or double click.
        return true;
    }

    AnnotationLayer.prototype.HandleDoubleClick = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleDoubleClick) {
            return this.ActiveWidget.HandleDoubleClick(event);
        }
        return ! this.ActiveWidget;
    }

    AnnotationLayer.prototype.HandleClick = function(event) {
        if ( ! this.GetVisibility() ) { return true; }
        if (this.ActiveWidget && this.ActiveWidget.HandleClick) {
            return this.ActiveWidget.HandleClick(event);
        }
        return true;
    }

    AnnotationLayer.prototype.HandleMouseUp = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }

        if (this.MouseClick) {
            this.MouseClick = false;
            return this.HandleClick(event);
        }

        if (this.ActiveWidget && this.ActiveWidget.HandleMouseUp) {
            return this.ActiveWidget.HandleMouseUp(event);
        }
        return ! this.ActiveWidget;
    }

    AnnotationLayer.prototype.HandleMouseMove = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }

        this.SetMousePositionFromEvent(event);
        if (event.which != 0 && this.MouseClick) {
            if (Math.abs(this.MouseDownX-this.MouseX) > 5) {
                this.MouseClick = false;
            }
            if (Math.abs(this.MouseDownY-this.MouseY) > 5) {
                this.MouseClick = false;
            }
            if ((this.MouseTime - this.MouseDownTime) > 400) {
                this.MouseClick = false;
            }
            // Wait to process a move until we know it will not
            // be a click.
            return false;
        }

        // The event position is relative to the target which can be a tab on
        // top of the canvas.  Just skip these events.
        if ($(event.target).width() != $(event.currentTarget).width()) {
            return true;
        }


        this.ComputeMouseWorld(event);

        // Firefox does not set "which" for move events.
        event.which = event.buttons;
        if (event.which == 2) {
            event.which = 3;
        } else if (event.which == 3) {
            event.which = 2;
        }

        if (this.ActiveWidget) {
            if (this.ActiveWidget.HandleMouseMove) {
                return this.ActiveWidget.HandleMouseMove(event);
            }
        } else {
            if ( ! event.which) {
                this.CheckActive(event);
                return true;
            }
        }

        // An active widget should stop propagation even if it does not
        // respond to the event.
        return true;
    }

    AnnotationLayer.prototype.HandleMouseWheel = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleMouseWheel) {
            return this.ActiveWidget.HandleMouseWheel(event);
        }
        return true;
    }

    AnnotationLayer.prototype.HandleKeyDown = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleKeyDown) {
            return this.ActiveWidget.HandleKeyDown(event);
        }
        return true;
    }

    AnnotationLayer.prototype.HandleKeyUp = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget && this.ActiveWidget.HandleKeyUp) {
            return this.ActiveWidget.HandleKeyUp(event);
        }
        return true;
    }

    // Called on mouse motion with no button pressed.
    // Looks for widgets under the cursor to make active.
    // Returns true if a widget is active.
    AnnotationLayer.prototype.CheckActive = function(event) {
        if ( ! this.GetVisibility() ) {
            return true;
        }
        if (this.ActiveWidget) {
            return this.ActiveWidget.CheckActive(event);
        } else {
            for (var i = 0; i < this.WidgetList.length; ++i) {
                if (this.WidgetList[i].CheckActive(event)) {
                    this.ActivateWidget(this.WidgetList[i]);
                    return true; // trying to keep the browser from selecting images
                }
            }
        }
        return false;
    }

    AnnotationLayer.prototype.GetNumberOfWidgets = function() {
        return this.WidgetList.length;
    }


    AnnotationLayer.prototype.GetWidget = function(i) {
        return this.WidgetList[i];
    }

    // Legacy
    AnnotationLayer.prototype.GetWidgets = function() {
        return this.WidgetList;
    }

    AnnotationLayer.prototype.AddWidget = function(widget) {
        widget.Layer = this;
        this.WidgetList.push(widget);
        if (SAM.NotesWidget) {
            // Hack.
            SAM.NotesWidget.MarkAsModified();
        }
    }

    AnnotationLayer.prototype.RemoveWidget = function(widget) {
        if (widget.Layer == null) {
            return;
        }
        widget.Layer = null;
        var idx = this.WidgetList.indexOf(widget);
        if(idx!=-1) {
            this.WidgetList.splice(idx, 1);
        }
        if (SAM.NotesWidget) {
            // Hack.
            SAM.NotesWidget.MarkAsModified();
        }
    }

    AnnotationLayer.prototype.LoadGirderItem = function(id) {
        var itemId = "564e42fe3f24e538e9a20eb9";
        var data= {"itemId": itemId,
                   "limit": 50,
                   "offset": 0,
                   "sort":"lowerName",
                   "sortdir":1};
        
        // This gives an array of {_id:"....",annotation:{name:"...."},itemId:"...."}
        girder.restRequest({
            type: "get",
            url:  "annotation",
            data: JSON.stringify(data),
            success: function(data,status) {
                console.log("success");
            },
            error: function() {
                alert( "AJAX - error() : annotation get"  );
            },
        });


        var annotationId = "572be29d3f24e53573aa8e91";
        girder.restRequest({                             
            path: 'annotation/' + annotationId,    // note that you don't need
            // api/v1
            method: 'GET',                          // data will be put in the
            // body of a POST
            contentType: 'application/json',        // this tells jQuery that we
            // are passing JSON in the body
        }).done(function(data) {
            console.log("done"); 
        });
    }

    AnnotationLayer.prototype.SaveGirderItem = function(id) {
        // Create a new annotation.
        var annotId = "572be29d3f24e53573aa8e91";
        data ={"name": "Test3",
               "elements": [{"type": "circle",
                             "lineColor": "#FFFF00",
                             "lineWidth": 20,
                             "center": [5000, 5000, 0],
                             "radius": 2000}]
              }
        girder.restRequest({
            type: "post",
            url:  "annotation",
            data: JSON.stringify(data),
            success: function(data,status) {
                console.log("success");
            },
            error: function() {
                alert( "AJAX - error() : annotation get"  );
            },
        });

        // Change an existing annotation
        data = {"name": "Test", 
                "elements": [{"type": "polyline", 
                              "points":[[6500,6600,0],[3300,5600,0],[10600,500,6]],
                              "closed": true,
                              "fillColor": "rgba(0, 255, 0, 1)"} ]
               };
        girder.restRequest({
            type: "put",
            url:  "annotation/" + annotId,
            data: JSON.stringify(data),
            success: function(data,status) {
                console.log("success2");
            },
            error: function() {
                alert( "AJAX - error() : annotation get"  );
            },
        });
    }

    AnnotationLayer.prototype.UpdateSize = function () {
        if (! this.AnnotationView) {
            return false;
        }
        if (this.AnnotationView.UpdateCanvasSize()) {
            this.EventuallyDraw();
            return true;
        }
        return false;
    }

    SAM.AnnotationLayer = AnnotationLayer;
})();


// here temporarily
// transformation that user camera models
(function () {
    "use strict";




    //==============================================================================
    // A correlation is just a pair of matching points from two sections.
    // Abstract the correlation so we have an api for getting points.
    // Currently, stack has direct access to correlation ivars / points.
    // The api will make forward and back transformations use the same code.


    // Pass in world to image transformation (3x3) for each image.
    function MatrixTransformation() {
        this.WorldToImage1=mat3.create();
        this.Image1ToWorld=mat3.create();
        this.WorldToImage2=mat3.create();
        this.Image2ToWorld=mat3.create();
    }

    MatrixTransformation.prototype.M2Invert = function(m1) {
        var d = m1[0]*m1[3] - m1[1]*m1[2];
        return [ m1[3]/d, -m1[1]/d,
                -m1[2]/d,  m1[0]/d];
    }
    MatrixTransformation.prototype.M2Multiply = function(m1,m2) {
        return [m1[0]*m2[0] + m1[1]*m2[2], m1[0]*m2[1] + m1[1]*m2[3],
                m1[2]*m2[0] + m1[3]*m2[2], m1[2]*m2[1] + m1[3]*m2[3]];
    }


    // Initialize with 3 corresponding points.
    MatrixTransformation.prototype.InitializeWithPoints = function(p1a,p2a, p1b,p2b, p1c,p2c) {
        var m1=mat3.create();
        var m2=mat3.create();
        mat3.identity(m1);
        mat3.identity(m2);
        // Take the first point as the origin.
        m1[2] = p1a[0]; m1[5] = p1a[1];
        m2[2] = p2a[0]; m2[5] = p2a[1];
        // Assume that the image1 coordinates (minus origin) are world.
        // Matrix to transform i,j to new basis b,c
        var A1 = [p1b[0]-p1a[0], p1c[0]-p1a[0], 
                  p1b[1]-p1a[1], p1c[1]-p1a[1]];
        var A2 = [p2b[0]-p2a[0], p2c[0]-p2a[0], 
                  p2b[1]-p2a[1], p2c[1]-p2a[1]];
        var M = this.M2Multiply(A2,this.M2Invert(A1));
        // Use the 2x2 in the 3x3
        m2[0] = M[0]; m2[1] = M[1];
        m2[3] = M[2]; m2[4] = M[3];

        this.Initialize(m1,m2);
    }

    // Pass in two matrixes (World to image)
    MatrixTransformation.prototype.Initialize = function(m1, m2) {
        // Now invert these matrixes.
        mat3.set(m1,this.WorldToImage1);
        mat3.set(m2,this.WorldToImage2);

        // A lot of hastle to get the inverse for a 3x3.
        // It is not that hard to compute.
        var m4a = mat4.create();
        var m4b = mat4.create();
        mat3.toMat4(this.WorldToImage1,m4a);
        mat4.inverse(m4a,m4b);
        mat4.toMat3(m4b,this.Image1ToWorld);

        mat3.toMat4(this.WorldToImage2,m4a);
        mat4.inverse(m4a,m4b);
        mat4.toMat3(m4b,this.Image2ToWorld);
    }

    // 1->2
    // This is confusing because for slides I consider image as world.
    // World here is geo location.
    MatrixTransformation.prototype.ForwardTransformPoint = function(ptIn) {
        var m = this.Image1ToWorld;
        var x = ptIn[0]*m[0] + ptIn[1]*m[1] + m[2];
        var y = ptIn[0]*m[3] + ptIn[1]*m[4] + m[5];
        var h = ptIn[0]*m[6] + ptIn[1]*m[7] + m[8];
        m = this.WorldToImage2;
        var x2 = x*m[0] + y*m[1] + h*m[2];
        var y2 = x*m[3] + y*m[4] + h*m[5];
        var h2   = x*m[6] + y*m[7] + h*m[8];
        return [x2/h2, y2/h2];
    }
    // 2->1
    MatrixTransformation.prototype.ReverseTransformPoint = function(ptIn) {
        var m = this.Image2ToWorld;
        var x = ptIn[0]*m[0] + ptIn[1]*m[1] + m[2];
        var y = ptIn[0]*m[3] + ptIn[1]*m[4] + m[5];
        var h = ptIn[0]*m[6] + ptIn[1]*m[7] + m[8];
        m = this.WorldToImage1;
        var x2 = x*m[0] + y*m[1] + h*m[2];
        var y2 = x*m[3] + y*m[4] + h*m[5];
        var h2   = x*m[6] + y*m[7] + h*m[8];
        return [x2/h2, y2/h2];
    }

    // 1->2
    MatrixTransformation.prototype.ForwardTransformCamera = function(camIn, camOut) {
        var fpIn = camIn.FocalPoint;
        var fpOut = camOut.FocalPoint;
        var upIn = [fpIn[0]+1,fpIn[1]];

        var pt = this.ForwardTransformPoint(fpIn);
        fpOut[0] = pt[0]; fpOut[1] = pt[1];
        var upOut = this.ForwardTransformPoint(upIn);
        upOut[0] -= fpOut[0];
        upOut[1] -= fpOut[1];
        var scale = Math.sqrt(upOut[0]*upOut[0] + upOut[1]*upOut[1]);
        // compute the height.
        camOut.SetHeight(camIn.GetHeight() * scale);
        // Compute the rotation. upOut = [Sin,cos];
        var angle = Math.atan2(upOut[1], upOut[0]);
        camOut.Roll = camIn.Roll;// - angle;
        camOut.ComputeMatrix();
    }

    // 2->1
    MatrixTransformation.prototype.ReverseTransformCamera = function(camIn, camOut) {
        var fpIn = camIn.FocalPoint;
        var fpOut = camOut.FocalPoint;
        var upIn = [fpIn[0]+1,fpIn[1]];

        var pt = this.ReverseTransformPoint(fpIn);
        fpOut[0] = pt[0]; fpOut[1] = pt[1];
        var upOut = this.ReverseTransformPoint(upIn);
        upOut[0] -= fpOut[0];
        upOut[1] -= fpOut[1];
        var scale = Math.sqrt(upOut[0]*upOut[0] + upOut[1]*upOut[1]);
        // compute the height.
        camOut.SetHeight(camIn.GetHeight() * scale);
        // Compute the rotation. upOut = [Sin,cos];
        var angle = Math.atan2(upOut[1], upOut[0]);
        camOut.Roll = camIn.Roll;// - angle;
        camOut.ComputeMatrix();
    }

    SAM.MatrixTransformation = MatrixTransformation;

})();

