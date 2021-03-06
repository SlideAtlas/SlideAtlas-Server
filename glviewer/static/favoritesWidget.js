// VCR like buttons to get to next/previous note/slide.
// entwined with the notes widget at the moment.


(function () {
    "use strict";


    //------------------------------------------------------------------------------
    // I intend to have only one object
    // display is an array of viewers (dualViewWidget now).
    function FavoritesWidget(parent, display) {

        this.Tab = new SA.Tab(parent,
                              SA.ImagePathUrl+"star.png",
                              "favorites");
        this.Tab.Div
            .css({'position':'absolute',
                  'bottom':'0px',
                  'left':'10px'})
            .prop('title', "Annotation");

        this.Tab.Panel
            .css({'position':'absolute',
                  'right': '-400px',
                  'left' : '-5px',
                  'height':'160px'});
        //.addClass("sa-view-favorites-div");

        this.FavoritesBar = new SA.FavoritesBar(this.Tab.Panel, display);

        this.FavoritesBar.LoadFavorites();
    }

    // Hack: Tabs panels are children of the tab div.
    // If I make the tab div width 100%, The other tabs do not receive events.
    // The hack solution is to keep the resize.
    FavoritesWidget.prototype.HandleResize = function(width){
        this.Tab.Panel
            .css({'left':'-5px',
                  'width': (width-20)+'px'});
    }


    SA.FavoritesWidget = FavoritesWidget;

})();
