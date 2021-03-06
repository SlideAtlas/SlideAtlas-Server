/*




*/

(function (namespace) {

    function Filter() {

    }

    function FilterColorThreshold() {
        Filter.call(this);

        // Define the selectors
        this.selectors = {};
        this.selectors['hue'] = {range : [0, 360]};
        this.selectors['saturation'] ={range: [0, 256]};
        this.selectors['value'] = {range: [0, 256]};

        // Current range is the default range
        for(var key in this.selectors) {
            if(this.selectors.hasOwnProperty(key)) {
                this.selectors[key].current = this.selectors[key].range;
            }
        }
    }

    FilterColorThreshold.prototype = new Filter;


    FilterColorThreshold.prototype.destructor=function() {
        // Get rid of the buffers?

    };

    FilterColorThreshold.prototype.button_text  = "Color threshold filter";

    FilterColorThreshold.prototype.Init = function() {
      // Gets the graphs and constructs the dialog
        var that=this;

        $.ajax({url: '/scar_ratio/get_image_histograms',
            type:'POST',
            data: {
                img : VIEWER1.MainView.Canvas[0].toDataURL('image/jpeg')
            }
        })
        .done(function(data) {
            that.histograms = data;
            that.Start()
        });
    };

    FilterColorThreshold.prototype.Start = function() {
        var that = this;
        // Create a div
        that.dialogDiv = $('<div>')
            .attr('id', 'scar_ratio_dialog')
            .attr('title', 'Color thresholding filter');

        // Add graphs

        for(var key in this.selectors) {
            if(this.selectors.hasOwnProperty(key)) {
                var selector = this.selectors[key];
                $('<h3>' + key  + ' <span id="value_' + key + '"> </span> </h3>')
                    .appendTo(that.dialogDiv);

                $('<img>')
                    .attr('src', 'data:image/png;base64,' + this.histograms[key])
                    .attr('width','100%')
                    .appendTo(that.dialogDiv);

                $('<br>').appendTo(that.dialogDiv);

                selector.sliderDiv = $('<div>')
                    .appendTo(that.dialogDiv);

                $(selector.sliderDiv).data({key : key});
                selector.sliderDiv.slider({
                    range:true,
                    min: selector.range[0],
                    max: selector.range[1],
                    values: selector.current,
                    slide: function( event, ui ) {
                        var key = $(event.target).data('key');
                        var selector = that.selectors[key];
                        selector.current = ui.values;
                        $('#value_' + key).html('' + JSON.stringify(selector.current));
                    }
                });
            }
        }
        $('<br>').appendTo(that.dialogDiv);

        $('<button>').appendTo(that.dialogDiv)
            .text('Update')
            .click(function () {
                // alert('About to update');
                $.ajax({url: '/scar_ratio/get_mask',
                    type:'POST',
                    data: {
                        img : VIEWER1.MainView.Canvas[0].toDataURL('image/jpeg'),

                        hmin: that.selectors["hue"].current[0],
                        hmax: that.selectors["hue"].current[1],

                        smin: that.selectors["saturation"].current[0],
                        smax: that.selectors["saturation"].current[1],

                        vmin: that.selectors["value"].current[0],
                        vmax: that.selectors["value"].current[1],
                    }
                })
                .done(function(data) {
                    // show the image popup
                    that.mask = data["mask"];
                    that.numPixels = data["count"];
                    that.percent = data["percent"];
                    // alert("Got the image !");
                    var img = new Image();
                    img.src = 'data:image/png;base64,' + that.mask;
                    VIEWER1.MainView.Context2d.drawImage(img, 0, 0);

                    //Show the selected pixels somewhere
                    $(that.dialogDiv).find("#pixelcount").html("Selected: " + that.numPixels + " (" + that.percent + "%)");

                });
            });

        $('<br>').appendTo(that.dialogDiv);

        $('<span>').appendTo(that.dialogDiv)
            .html("Selected: None")
            .attr("id", "pixelcount");

        that.dialogDiv.dialog({width: 500, height: 'auto'});
    };

    namespace["plugin_scar_ratio"] = FilterColorThreshold;

})(window);
