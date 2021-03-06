// It seems I cannot control the order these files are loaded.
window.SA = window.SA || {};

// TODO: 
//  ShowViewBrowser();});
// get rid of these.

//function ComparisonSaveAnnotations() {} (used wrongly in text widget.)
//function ShowViewerEditMenu(viewer) {

// Empty
//ViewEditMenu.prototype.SessionAdvanceAjax = function() {


(function () {
    "use strict";



// All edit menus share a ViewBrowser.  Next to consider.  Share the
// presentation browser panel.
SA.VIEW_BROWSER;


// Other viewer is a hack for copy camera.
// parent is for the view browser.
function ViewEditMenu (viewer, otherViewer) {
    var self = this; // trick to set methods in callbacks.
    this.Viewer = viewer;
    // Other viewer is a hack for copy camera.
    this.OtherViewer = otherViewer;
    this.Tab = new SA.Tab(viewer.GetDiv(),SA.ImagePathUrl+"Menu.jpg", "editTab");
    this.Tab.Div
        .css({'position':'absolute',
              'right':'47px',
              'bottom':'0px',
              'z-index':'200'})
        .prop('title', "View Menu");

    this.Tab.Panel.addClass("sa-view-edit-panel");

    if (SA.VIEW_BROWSER) {
        $('<button>')
            .appendTo(this.Tab.Panel)
            .text("Load Slide")
            .addClass("sa-view-edit-button")
            .click(
                function(){
                    self.Tab.PanelOff();
                    SA.VIEW_BROWSER.Open(self.Viewer);
                });
    }
    if (SA.Edit) {
        $('<button>')
            .appendTo(this.Tab.Panel)
            .text("Save View")
            .addClass("sa-view-edit-button")
            .click(function(){self.SaveView();});
    }
    if (SA.notesWidget) {
        $('<button>')
            .appendTo(this.Tab.Panel)
            .text("Download Image")
            .addClass("sa-view-edit-button")
            .click(function(){self.Tab.PanelOff();
                              DownloadImage(self.Viewer);});

        $('<button>')
            .appendTo(this.Tab.Panel)
            .text("Slide Info")
            .addClass("sa-view-edit-button")
            .click(function(){self.ShowSlideInformation();});

        if (SA.recorderWidget.TimeLine) {
            // Test for showing coverage of view histor.
            this.HistoryMenuItem = $('<button>')
                .appendTo(this.Tab.Panel)
                .text("History On")
                .addClass("sa-view-edit-button")
                .click(function(){self.ToggleHistory();});
        }
        // Hack until we have some sort of scale.
        if (this.OtherViewer) {
            this.CopyZoomMenuItem = $('<button>')
                .appendTo(this.Tab.Panel)
                .text("Copy Zoom")
                .hide()
                .addClass("sa-view-edit-button")
                .click(function(){self.CopyZoom();});
        }
    
        $('<button>').appendTo(this.Tab.Panel)
            .text("Flip Horizontal")
            .addClass("sa-view-edit-button")
            .click(function(){self.FlipHorizontal();});
        /* cutout widget dialog is broken.
        $('<button>').appendTo(this.Tab.Panel)
            .text("Download image from server")
            .addClass("sa-view-edit-button")
            .click(function(){
                self.Tab.PanelOff();
                // When the circle button is pressed, create the widget.
                if ( ! self.Viewer) { return; }
                new SA.CutoutWidget(parent, self.Viewer);
            });
        // color threshold is also broken
        for(var plugin in window.PLUGINS) {
            var that = this;
            if(window.PLUGINS[plugin].button_text) {
                (function (plugin) {
                    // console.log("Adding menu for " + plugin);
                    $('<button>').appendTo(that.Tab.Panel)
                        .text(window.PLUGINS[plugin].button_text)
                        .addClass("sa-view-edit-button")
                        .click(function () {
                            window.PLUGINS[plugin].Init();
                        });
                })(plugin);
            }
        }
        */

        // I need some indication that the behavior id different in edit mode.
        // If the user is authorized, the new bounds are automatically saved.
        if (SA.Edit) {
            $('<button>').appendTo(this.Tab.Panel)
                .text("Save Overview Bounds")
                .addClass("sa-view-edit-button")
                .click(function(){self.SetViewBounds();});
        } else {
            $('<button>').appendTo(this.Tab.Panel)
                .text("Set Overview Bounds")
                .addClass("sa-view-edit-button")
                .click(function(){self.SetViewBounds();});
        }
    }
}

ViewEditMenu.prototype.SetVisibility = function(flag) {
    if (flag) {
        this.Tab.show();
    } else {
        this.Tab.hide();
    }
}

ViewEditMenu.prototype.DetectTissueSections = function() {
    initHagfish();
    findHagFishSections(2, 0.0002, 0.01);
}


ViewEditMenu.prototype.ToggleHistory = function() {
    this.Tab.PanelOff();

    this.Viewer.HistoryFlag = ! this.Viewer.HitoryFlag;
    if (this.Viewer.HistoryFlag) {
        this.HistoryMenuItem.text("History Off")
    } else {
        this.HistoryMenuItem.text("History On")
    }
    SA.display.EventuallyRender();
}


// Record the viewer into the current note and save into the database.
ViewEditMenu.prototype.SaveView = function() {
    this.Tab.PanelOff();
    if (SA.notesWidget) SA.notesWidget.SaveCallback();
}

ViewEditMenu.prototype.GetViewerBounds = function (viewer) {
    var cam = viewer.GetCamera();
    var fp = cam.GetFocalPoint(); 
    var halfWidth = cam.GetWidth()/2;
    var halfHeight = cam.GetHeight()/2;
    return [fp[0]-halfWidth, fp[0]+halfWidth, fp[1]-halfHeight, fp[1]+halfHeight];
}

// Add bounds to view to overide image bounds.
ViewEditMenu.prototype.SetViewBounds = function() {
    this.Tab.PanelOff();
    var bounds = this.GetViewerBounds(this.Viewer);
    var note = SA.display.GetNote();
    // Which view record?
    var viewerRecord = note.ViewerRecords[this.Viewer.RecordIndex];

    viewerRecord.OverviewBounds = bounds;
    // Set the image bounds so the new bounds are used immediately.
    viewerRecord.Image.bounds = viewerRecord.OverviewBounds;
    this.Viewer.OverView.Camera.SetFocalPoint( [(bounds[0]+bounds[1])/2,
                                                (bounds[2]+bounds[3])/2]);
    this.Viewer.OverView.Camera.SetHeight(bounds[3]-bounds[2]);
    this.Viewer.OverView.Camera.ComputeMatrix();
    eventuallyRender();

    // Save automatically if user has permission.
    var self = this;
    if (SA.Edit) {
        // I cannot do this because it first sets the viewer record and bounds are lost.
        //SA.notesWidget.SaveCallback();
        // Lets try just setting this one note.
        var noteObj = JSON.stringify(note.Serialize(true));
        var d = new Date();
        $.ajax({
            type: "post",
            url: "webgl-viewer/saveviewnotes",
            data: {"note" : noteObj,
                   "date" : d.getTime()},
            success: function(data,status) {
                self.Viewer.EventuallyRender();
            },
            error: function() { SA.Debug( "AJAX - error() : saveviewnotes (bounds)" ); },
        });
    }
}

// Add bounds to view to overide image bounds.
ViewEditMenu.prototype.SetImageBounds = function() {
    this.Tab.PanelOff();

    var viewer = this.Viewer;
    var imageDb = viewer.GetCache().Image.database;
    var imageId = viewer.GetCache().Image._id;
    var bounds = this.GetViewerBounds(viewer);

    // Set the image bounds so the new bounds are used immediately.
    viewer.GetCache().Image.bounds = bounds;
    viewer.OverView.Camera.SetFocalPoint( [(bounds[0]+bounds[1])/2,
                                           (bounds[2]+bounds[3])/2]);
    viewer.OverView.Camera.SetHeight(bounds[3]-bounds[2]);
    viewer.OverView.Camera.ComputeMatrix();
    eventuallyRender();

    var data = JSON.stringify(bounds);
    $.ajax({
        type: "post",
        url: "webgl-viewer/set-image-bounds",
        data: {"img" : imageId,
               "imgdb"  : imageDb,
               "bds" : JSON.stringify(bounds)},
        success: function(data,status) {},
        error: function() {
            SA.Debug( "AJAX - error() : saveusernote 1" );
        },
    });
}


//==============================================================================
// Create and manage the menu to edit dual views.


// hack: Find the other viewer to copy.
ViewEditMenu.prototype.CopyZoom = function() {
    this.Tab.PanelOff();

    var cam = this.Viewer.GetCamera();
    var copyCam;
    var copyCam = this.OtherViewer.GetCamera();
    
    this.Viewer.AnimateCamera(cam.GetFocalPoint(), cam.Roll, copyCam.Height);
}

ViewEditMenu.prototype.ShowSlideInformation = function() {
    this.Tab.PanelOff();
    var imageObj = this.Viewer.MainView.Section.Caches[0].Image;
    SA.SlideInformation.Open(imageObj, this.Viewer);
}

// Mirror image
ViewEditMenu.prototype.FlipHorizontal = function() {
    this.Tab.PanelOff();
    // When the circle button is pressed, create the widget.
    if ( ! this.Viewer) { return; }

    var cam = this.Viewer.GetCamera();
    this.Viewer.ToggleMirror();
    this.Viewer.SetCamera(cam.GetFocalPoint(), cam.GetRotation()+180.0, cam.Height);
    SA.RecordState();
}


// Stuff that should be moved to some other file.

// Make the download dialog / function a module.
var DownloadImage = (function () {

    // Dialogs require an object when accept is pressed.
    var DOWNLOAD_WIDGET = undefined;

    function DownloadImage(viewer) {
        // Use a global so apply callback can get the viewer.
        SA.VIEWER = viewer;

        if ( ! DOWNLOAD_WIDGET) {
            InitializeDialogs();
        }

        // Setup default dimensions.
        var viewport = viewer.GetViewport();
        var d = DOWNLOAD_WIDGET.DimensionDialog;
        d.PxWidthInput.val(viewport[2]);
        d.PxHeightInput.val(viewport[3]);
        var pixelsPerInch = parseInt(d.SizeResInput.val());
        d.SizeWidthInput.val((viewport[2]/pixelsPerInch).toFixed(2));
        d.SizeHeightInput.val((viewport[3]/pixelsPerInch).toFixed(2));
        d.AspectRatio = viewport[2] / viewport[3];

        // Hide or show the stack option.
        if (SA.display.GetNote().Type == "Stack") {
            DOWNLOAD_WIDGET.DimensionDialog.StackDiv.show();
        } else {
            DOWNLOAD_WIDGET.DimensionDialog.StackDiv.hide();
        }

        DOWNLOAD_WIDGET.DimensionDialog.Show(1);
    }

    function InitializeDialogs() {

        DOWNLOAD_WIDGET = {};

        // Two dialogs.
        // Dialog to choose dimensions and initiate download.
        // A dialog to cancel the download while waiting for tiles.
        var CancelDownloadCallback = function () {
            if ( DOWNLOAD_WIDGET.Viewer) {
                // We are in the middle of rendering.
                // This method was called by the cancel dialog.
                DOWNLOAD_WIDGET.Viewer.CancelLargeImage();
                DOWNLOAD_WIDGET.Viewer = undefined;
                // The dialog hides itself.
            }
        }
        var StartDownloadCallback = function () {
            // Trigger the process to start rendering the image.
            DOWNLOAD_WIDGET.Viewer = SA.VIEWER;
            var width = parseInt(DOWNLOAD_WIDGET.DimensionDialog.PxWidthInput.val());
            var height = parseInt(DOWNLOAD_WIDGET.DimensionDialog.PxHeightInput.val());
            var stack = DOWNLOAD_WIDGET.DimensionDialog.StackCheckbox.prop('checked');

            // Show the dialog that empowers the user to cancel while rendering.
            DOWNLOAD_WIDGET.CancelDialog.Show(1);
            // We need a finished callback to hide the cancel dialog.
            if (stack) {
                DOWNLOAD_WIDGET.CancelDialog.StackMessage.show();
            } else {
                DOWNLOAD_WIDGET.CancelDialog.StackMessage.hide();
            }
            SA.VIEWER.SaveLargeImage("slide-atlas.png", width, height, stack,
                                  function () {
                                      // Rendering has finished.
                                      // The user can no longer cancel.
                                      DOWNLOAD_WIDGET.Viewer = undefined;
                                      DOWNLOAD_WIDGET.CancelDialog.Hide();
                                  });
        }

        
        var d = new SAM.Dialog(StartDownloadCallback);
        d.Body.css({'margin':'1em 2em',
                    // Hack no time to figure out layout with border box option.
                    'padding-bottom':'2em',
                    'padding-right':'3em'});
        DOWNLOAD_WIDGET.DimensionDialog = d;
        d.Title.text('Download Image');
        
        // Pixel Dimensions
        d.PxDiv = $('<div>')
            .appendTo(d.Body)
            .css({'border':'1px solid #555',
                  'margin': '15px',
                  'padding-left': '5px'});
        d.PxLabel =
            $('<div>')
            .appendTo(d.PxDiv)
            .text("Dimensions:")
            .css({'position': 'relative',
                  'top': '-9px',
                  'display': 'inline-block',
                  'background-color': 'white'});
        
        d.PxWidthDiv =
            $('<div>')
            .appendTo(d.PxDiv)
            .css({'display':'table-row'});
        
        d.PxWidthLabel =
            $('<div>')
            .appendTo(d.PxWidthDiv)
            .text("Width:")
            .css({'display':'table-cell',
                  'text-align': 'right',
                  'width': '6em'});
        d.PxWidthInput =
            $('<input type="number">')
            .appendTo(d.PxWidthDiv)
            .val('1900')
            .css({'display':'table-cell',
                  'width': '100px',
                  'margin': '5px'})
            .change(function () {PxWidthChanged();});
        d.PxWidthUnits =
            $('<div>')
            .appendTo(d.PxWidthDiv)
            .text("Pixels")
            .css({'display':'table-cell',
                  'text-align': 'left'});
        
        d.PxHeightDiv =
            $('<div>')
            .appendTo(d.PxDiv)
            .css({'display':'table-row',
                  'margin': '5px'});
        d.PxHeightLabel =
            $('<div>')
            .appendTo(d.PxHeightDiv)
            .text("Height:")
            .css({'display':'table-cell',
                  'text-align': 'right'});
        d.PxHeightInput =
            $('<input type="number">')
            .appendTo(d.PxHeightDiv)
            .val('1080')
            .css({'display':'table-cell',
                  'width': '100px',
                  'margin': '5px'})
            .change(function () {PxHeightChanged();});
        
        d.PxHeightUnits =
            $('<div>')
            .appendTo(d.PxHeightDiv)
            .text("Pixels")
            .css({'display':'table-cell',
                  'text-align': 'left'});
        
        
        // Document Size
        d.SizeDiv = $('<div>')
            .appendTo(d.Body)
            .css({'border':'1px solid #555',
                  'margin': '15px',
                  'padding-left': '5px'});
        d.SizeLabel =
            $('<div>')
            .appendTo(d.SizeDiv)
            .text("Document Size:")
            .css({'position': 'relative',
                  'top': '-9px',
                  'display': 'inline-block',
                  'background-color': 'white'});
        
        d.SizeWidthDiv =
            $('<div>')
            .appendTo(d.SizeDiv)
            .css({'display':'table-row',
                  'margin': '5px'});
        d.SizeWidthLabel =
            $('<div>')
            .appendTo(d.SizeWidthDiv)
            .text("Width:")
            .css({'display':'table-cell',
                  'text-align': 'right',
                  'width': '6em'});
        d.SizeWidthInput =
            $('<input type="number">')
            .appendTo(d.SizeWidthDiv)
            .val('1900')
            .css({'display':'table-cell',
                  'width': '100px',
                  'margin': '5px'})
            .change(function () {SizeWidthChanged();});
        
        d.SizeWidthUnits =
            $('<div>')
            .appendTo(d.SizeWidthDiv)
            .text("Inches")
            .css({'display':'table-cell',
                  'text-align': 'left'});
        
        d.SizeHeightDiv =
            $('<div>')
            .appendTo(d.SizeDiv)
            .css({'display':'table-row',
                  'margin': '5px'});
        d.SizeHeightLabel =
            $('<div>')
            .appendTo(d.SizeHeightDiv)
            .text("Height:")
            .css({'display':'table-cell',
                  'text-align': 'right'});
        d.SizeHeightInput =
            $('<input type="number">')
            .appendTo(d.SizeHeightDiv)
            .val('1900')
            .css({'display':'table-cell',
                  'width': '100px',
                  'margin': '5px'})
            .change(function () {SizeHeightChanged();});
        
        d.SizeHeightUnits =
            $('<div>')
            .appendTo(d.SizeHeightDiv)
            .text("Inches")
            .css({'display':'table-cell',
                  'text-align': 'left'});
        
        d.SizeResDiv =
            $('<div>')
            .appendTo(d.SizeDiv)
            .css({'display':'table-row',
                  'margin': '5px'});
        d.SizeResLabel =
            $('<div>')
            .appendTo(d.SizeResDiv)
            .text("Resolution:")
            .css({'display':'table-cell',
                  'text-align': 'right'});
        d.SizeResInput =
            $('<input type="number">')
            .appendTo(d.SizeResDiv)
            .val('72')
            .css({'display':'table-cell',
                  'width': '100px',
                  'margin': '5px'})
            .change(function () {ResChanged();});
        
        d.SizeResUnits =
            $('<div>')
            .appendTo(d.SizeResDiv)
            .text("Pixels/Inch")
            .css({'display':'table-cell',
                  'text-align': 'left'});
        
        
        d.ProportionsDiv = 
            $('<div>')
            .appendTo(d.Body)
            .css({'margin': '15px',
                  'padding-left': '5px'});
        d.ProportionsLabel =
            $('<div>')
            .appendTo(d.ProportionsDiv)
            .text("Constrain Proportions:")
            .css({'display':'inline'});
        d.ProportionsCheckbox =
            $('<input type="checkbox">')
            .appendTo(d.ProportionsDiv)
            .css({'display':'inline'})
            .prop('checked', true);


        d.StackDiv =
            $('<div>')
            .appendTo(d.Body)
            .css({'margin': '15px',
                  'padding-left': '5px'})
            .hide();
        d.StackLabel =
            $('<div>')
            .appendTo(d.StackDiv)
            .text("All stack sections:")
            .css({'display':'inline'});
        d.StackCheckbox =
            $('<input type="checkbox">')
            .appendTo(d.StackDiv)
            .css({'display':'inline'})
            .prop('checked', false);


        d.AspectRatio = 1.0;


        // A dialog to cancel the download before we get all the tiles
        // needed to render thie image.
        d = new SAM.Dialog(CancelDownloadCallback);
        DOWNLOAD_WIDGET.CancelDialog = d;
        d.Title.text('Processing');

        d.WaitingImage = $('<img>')
            .appendTo(d.Body)
            .attr("src", SA.ImagePathUrl+"circular.gif")
            .attr("alt", "waiting...")
            .css({'width':'40px'});

        d.StackMessage = $('<div>')
            .appendTo(d.Body)
            .text("Downloading multiple images.  Turn off browser's prompt-on-download option.")
            .hide();

        d.ApplyButton.text("Cancel");

    }

    function PxWidthChanged () {
        var d = DOWNLOAD_WIDGET.DimensionDialog;
        var pixelsPerInch = parseInt(d.SizeResInput.val());
        var width = parseInt(d.PxWidthInput.val());
        d.SizeWidthInput.val((width/pixelsPerInch).toFixed(2));
        if (d.ProportionsCheckbox.prop('checked')) {
            var height = width / d.AspectRatio;
            d.PxHeightInput.val(height.toFixed());
            d.SizeHeightInput.val((height/pixelsPerInch).toFixed(2));
        } else {
            var height = parseInt(d.PxHeightInput.val());
            d.AspectRatio = width / height;
        }
    }

    function PxHeightChanged () {
        var d = DOWNLOAD_WIDGET.DimensionDialog;
        var pixelsPerInch = parseInt(d.SizeResInput.val());
        var height = parseInt(d.PxHeightInput.val());
        d.SizeHeightInput.val((height/pixelsPerInch).toFixed(2));
        if (d.ProportionsCheckbox.prop('checked')) {
            var width = height * d.AspectRatio;
            d.PxWidthInput.val(width.toFixed());
            d.SizeWidthInput.val((width/pixelsPerInch).toFixed(2));
        } else {
            var width = parseInt(d.PxWidthInput.val());
            d.AspectRatio = width / height;
        }
    }

    function SizeWidthChanged () {
        var d = DOWNLOAD_WIDGET.DimensionDialog;
        var pixelsPerInch = parseInt(d.SizeResInput.val());
        var width = parseInt(d.SizeWidthInput.val());
        d.PxWidthInput.val((width*pixelsPerInch).toFixed());
        if (d.ProportionsCheckbox.prop('checked')) {
            var height = width / d.AspectRatio;
            d.SizeHeightInput.val(height.toFixed(2));
            d.PxHeightInput.val((height*pixelsPerInch).toFixed());
        } else {
            var height = parseInt(d.SizeHeightInput.val());
            d.AspectRatio = width / height;
        }
    }

    function SizeHeightChanged () {
        var d = DOWNLOAD_WIDGET.DimensionDialog;
        var pixelsPerInch = parseInt(d.SizeResInput.val());
        var height = parseInt(d.SizeHeightInput.val());
        d.PxHeightInput.val((height*pixelsPerInch).toFixed());
        if (d.ProportionsCheckbox.prop('checked')) {
            var width = height * d.AspectRatio;
            d.SizeWidthInput.val(width.toFixed(2));
            d.PxWidthInput.val((width*pixelsPerInch).toFixed());
        } else {
            var width = parseInt(d.SizeWidthInput.val());
            d.AspectRatio = width / height;
        }
    }

    function ResChanged () {
        var d = DOWNLOAD_WIDGET.DimensionDialog;
        var pixelsPerInch = parseInt(d.SizeResInput.val());
        var height = parseInt(d.SizeHeightInput.val());
        var width = parseInt(d.SizeWidthInput.val());
        d.PxHeightInput.val((height*pixelsPerInch).toFixed());
        d.PxWidthInput.val((width*pixelsPerInch).toFixed());
    }

    return DownloadImage;
})();


// Create a selection list of sessions.
// This does not belong here.
SA.InitSlideSelector = function(parent) {
    $('<div>')
        .appendTo(parent)
        .css({
            'background-color': 'white',
            'border-style': 'solid',
            'border-width': '1px',
            'border-radius': '5px',
            'position': 'absolute',
            'top' : '35px',
            'left' : '35px',
            'width' : '500px',
            'height' : '700px',
            'overflow': 'auto',
            'z-index': '4',
            'color': '#303030',
            'font-size': '20px' })
        .attr('id', 'sessionMenu').hide()
        .mouseleave(function(){$(this).fadeOut();});
    $('<ul>').appendTo('#sessionMenu').attr('id', 'sessionMenuSelector');

    // Create a selector for views.
    $('<div>')
        .appendTo(parent)
        .css({
            'background-color': 'white',
            'border-style': 'solid',
            'border-width': '1px',
            'border-radius': '5px',
            'position': 'absolute',
            'top' : '135px',
            'left' : '135px',
            'width' : '500px',
            'height' : '700px',
            'overflow': 'auto',
            'z-index': '4',
            'color': '#303030',
            'font-size': '20px' })
        .attr('id', 'viewMenu').hide()
        .mouseleave(function(){$(this).fadeOut();});
    $('<ul>').appendTo('#viewMenu').attr('id', 'viewMenuSelector'); // <select> for drop down

    SA.SlideInformation = new ImageInformationDialog(parent, SA.Edit);
}

function ImageInformationDialog (parent, editable) {
    var self = this;

    this.Editable = editable;

    this.Body = $('<div>')
        .appendTo(parent)
        .css({
            'background-color': 'white',
            'border-style': 'solid',
            'border-width': '1px',
            'border-radius': '5px',
            'position': 'absolute',
            'top' : '30%',
            'left' : '30%',
            'width': '40%',
            'height': '40%',
            'overflow': 'auto',
            'padding': '10px',
            'z-index': '4',
            'color': '#303030',
            'font-size': '20px'})
        .hide()
        .mouseleave(function(){self.Close();});

    this.TitleInput =
        $('<div>')
        .css({'width':'100%',
              'cursor':'text',
              'white-space':'nowrap',
              'margin-bottom':'5px'})
        .appendTo(this.Body)
        .keypress(function(event) { return event.keyCode != 13; });
    if (editable) {
        this.TitleInput
            .attr('contenteditable', 'true')
            .css({'background':'#f0f0ff'});
    }

    this.CopyrightDiv =
        $('<div>')
        .css({'width':'100%',
              'display':'inline-block'})
        .appendTo(this.Body)
        .addClass("sa-view-annotation-modal-div");
    this.CopyrightLabel =
        $('<div>')
        .appendTo(this.CopyrightDiv)
        .text("Copyright:");
    this.CopyrightInput =
        $('<div>')
        .css({'width':'300px',
              'cursor':'text'})
        .appendTo(this.CopyrightDiv)
        .keypress(function(event) { return event.keyCode != 13; });
    if (editable) {
        this.CopyrightInput
            .attr('contenteditable', 'true')
            .css({'background':'#f0f0ff'});
    }

    this.ResolutionDiv =
        $('<div>')
        .appendTo(this.Body)
        .addClass("sa-view-annotation-modal-div");
    this.ResolutionLabel =
        $('<div>')
        .appendTo(this.ResolutionDiv)
        .text("Resolution:")
        .addClass("sa-view-annotation-modal-input-label");
    this.ResolutionInput =
        $('<div>')
        .appendTo(this.ResolutionDiv);
    this.ResolutionUnitsInput =
        $('<div>')
        .appendTo(this.ResolutionDiv);
    if (editable) {
        this.ResolutionInput
            .attr('contenteditable', 'true')
            .css({'background':'#f0f0ff',
                  'cursor':'text'})
            .keypress(function(event) { return event.keyCode != 13; });
        this.ResolutionUnitsInput
            .attr('contenteditable', 'true')
            .css({'background':'#f0f0ff',
                  'cursor':'text'})
            .attr('contenteditable', 'true')
            .keypress(function(event) { return event.keyCode != 13; });
    }

    // Non editable strings.
    this.FileNameDiv =
        $('<div>')
        .appendTo(this.Body)
        .addClass("sa-view-annotation-modal-div");
    this.CreatedDiv =
        $('<div>')
        .appendTo(this.Body)
        .addClass("sa-view-annotation-modal-div");
    this.DimensionsDiv =
        $('<div>')
        .appendTo(this.Body)
        .addClass("sa-view-annotation-modal-div");
    this.LevelsDiv =
        $('<div>')
        .appendTo(this.Body)
        .addClass("sa-view-annotation-modal-div");
}

ImageInformationDialog.prototype.Open = function(imageObj, viewer) {
    this.Viewer = viewer;

    // Save so we can modify it on close.
    this.ImageObj = imageObj;
    this.TitleInput.text(imageObj.label);
    this.FileNameDiv.text("File Name: " + imageObj.filename);
    this.CreatedDiv.text("Created: " + imageObj.uploaded_at);
    this.DimensionsDiv.text("Dimensions: " +
                            imageObj.dimensions[0] + ", "+
                            imageObj.dimensions[1]);
    this.LevelsDiv.text("Levels: " + imageObj.levels);
    this.CopyrightInput.text(imageObj.copyright);

    var spacing;
    if (imageObj.units) {
        spacing = {value: imageObj.spacing[0],
                   units: imageObj.units};
    } else {
        spacing = {value: 0.25,
                   units: "\xB5m"}; // um / micro meters
    }

    SAM.ConvertForGui(spacing);
    this.ResolutionInput.text(spacing.value.toString());
    this.ResolutionUnitsInput.text(spacing.units.toString());

    this.Body.show();
}

ImageInformationDialog.prototype.Close = function() 
{
    if (this.Editable) {
        this.ImageObj.label = this.TitleInput.text();
        this.ImageObj.copyright = this.CopyrightInput.text();
        var spacing = {value: parseFloat(this.ResolutionInput.text()),
                       units: this.ResolutionUnitsInput.text()};
        SAM.ConvertToMeters(spacing);
        this.ImageObj.spacing[0] = this.ImageObj.spacing[1] = spacing.value;
        this.ImageObj.units = spacing.units;
    }

    this.Body.fadeOut();

    if ( ! this.Editable) {
        return;
    }

    if (this.ImageObj.dimensions.length < 3) {
        this.ImageObj.dimensions.push(1);
    }

    var imageObj = {
        _id       : this.ImageObj._id,
        database  : this.ImageObj.database,
        label     : this.ImageObj.label,
        copyright : this.ImageObj.copyright,
        spacing   : this.ImageObj.spacing,
        units     : this.ImageObj.units};

    // Save the image meta data.
    var self = this;
    $.ajax({
        type: "post",
        url: "webgl-viewer/saveimagedata",
        data: {"metadata" : JSON.stringify(imageObj)},
        success: function(data,status) {
            if (self.Viewer) {self.Viewer.EventuallyRender();}
        },
        error: function() { SA.Debug( "AJAX - error() : saveimagedata" ); },
    });

}

    SA.ViewEditMenu = ViewEditMenu;

})();
