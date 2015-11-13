// Interface for ViewerSet
// GetNumberOfViewers();

// Does not have to abide.
// SetNumberOfViewers(n);

// GetViewer(idx);




// Create and repond to the dual / single view toggle button.
// How the window is derived between viewer1 and viewer1.
// Default: viewer1 uses all available space.


// TODO: Get rid of these gloabal variable.
var VIEWERS = [];
var VIEWER1;
var VIEWER2;


function DualViewWidget(parent) {
    var self = this;
    this.Viewers = [];

    // Rather than getting the current note from the NotesWidget, keep a
    // reference here.  SlideShow can have multiple "displays".
    // We might consider keep a reference in the dua
    this.Note = null;

    this.Parent = parent;
    parent.addClass('sa-dual-viewer');

    // This parent used to be CANVAS.
    var width = parent.innerWidth();
    var height = parent.innerHeight();
    var halfWidth = width/2;

    for (var i = 0; i < 2; ++i) {
        var viewerDiv = $('<div>')
            .appendTo(parent)
            .saViewer({overview:true, zoomWidget:true});
        this.Viewers[i] = viewerDiv[0].saViewer;
        // TODO: Get rid of this.
        // I beleive the note should sets this, and we do not need to do it
        // here..
        this.Viewers[i].RecordIndex = i;
    }

    // TODO: Get rid of these.
    VIEWERS = this.Viewers;
    VIEWER1 = this.Viewers[0];
    VIEWER2 = this.Viewers[1];

    this.DualView = false;
    this.Viewer1Fraction = 1.0;
    // It would be nice to integrate all animation in a flexible utility.
    this.AnimationLastTime = 0;
    this.AnimationDuration = 0;
    this.AnimationTarget = 0;

    if ( ! MOBILE_DEVICE) {
        // Todo: Make the button become more opaque when pressed.
        $('<img>')
            .appendTo(parent)
            .addClass("sa-view-dualview-div")
            .attr('id', 'dualWidgetLeft')
            .attr('src',"webgl-viewer/static/dualArrowLeft2.png")
            .click(function(){self.ToggleDualView();})
            .attr('draggable','false')
            .on("dragstart", function() {
                return false;});

        $('<img>').appendTo(parent)
            .hide()
            .addClass("sa-view-dualview-img")
            .attr('id', 'dualWidgetRight')
            .attr('src',"webgl-viewer/static/dualArrowRight2.png")
            .click(function(){self.ToggleDualView();})
            .attr('draggable','false')
            .on("dragstart", function() {
                return false;});

        this.Viewers[0].AddGuiElement("#dualWidgetLeft", "Top", 0, "Right", 20);
        this.Viewers[0].AddGuiElement("#dualWidgetRight", "Top", 0, "Right", 0);

        // DualViewer is the navigation widgets temporary home.
        // SlideShow can have multiple nagivation widgets so it is no
        // longer a singlton.
        // This is for moving through notes, session views and stacks.
        // It is not exactly related to dual viewer. It is sort of a child
        // of the dual viewer.
        this.NavigationWidget = new NavigationWidget(parent,this);
    }
}

DualViewWidget.prototype.GetNote = function () {
    return this.Note;
}

// Astracting the saViewer class to support dual viewers and stacks.
DualViewWidget.prototype.ProcessArguments = function (args) {
    if (args.note) {
        // TODO: DO we need both?
        this.saNote = args.note;
        args.note.DisplayView(this);
        this.Parent.attr('sa-note-id', args.note.Id || args.note.TempId);
    }

    for (var i = 0; i < this.Viewers.length; ++i) {
        var viewer = this.Viewers[i];

        // TODO:  Handle zoomWidget options
        if (args.overview !== undefined) {
            viewer.SetOverViewVisibility(args.overview);
        }
        if (args.navigation !== undefined) {
            this.NavigationWidget.SetVisibility(args.navigation);
        }
        if (args.zoomWidget !== undefined) {
            viewer.SetZoomWidgetVisibility(args.zoomWidget);
        }
        if (args.drawWidget !== undefined) {
            viewer.SetAnnotationWidgetVisibility(args.drawWidget);
        }
        // The way I handle the viewer edit menu is messy.
        // TODO: Find a more elegant way to add tabs.
        // Maybe the way we handle the anntation tab shouodl be our pattern.
        if (args.menu !== undefined) {
            if ( ! viewer.Menu) {
                viewer.Menu = new ViewEditMenu(viewer, null);
            }
            viewer.Menu.SetVisibility(args.menu);
        }

        if (args.hideCopyright) {
            viewer.CopyrightWrapper.hide();
        }
        if (args.interaction !== undefined) {
            viewer.SetInteractionEnabled(args.interaction);
        }
    }
}

// API for ViewerSet
DualViewWidget.prototype.GetNumberOfViewers = function() {
    if (this.DualView) {
        return 2;
    }

    return 1;
}

// API for ViewerSet
DualViewWidget.prototype.GetViewer = function(idx) {
    return this.Viewers[idx];
}

// Called programmatically. No animation.
DualViewWidget.prototype.SetNumberOfViewers = function(numViews) {
    this.DualView = (numViews > 1);

    if (this.DualView) {
        this.Viewer1Fraction = 0.5;
    } else {
        this.Viewer1Fraction = 1.0;
    }

    this.UpdateSize();
    this.UpdateGui();
}


DualViewWidget.prototype.ToggleDualView = function () {
    this.DualView = ! this.DualView;

    if (this.DualView) {
        // If there is no image in the second viewer, copy it from the first.
        if ( ! this.Viewers[1].GetCache()) {
            this.Viewers[1].SetCache(this.Viewers[0].GetCache());
            this.Viewers[1].GetCamera().DeepCopy(this.Viewers[0].GetCamera());
        }
        this.AnimationCurrent = 1.0;
        this.AnimationTarget = 0.5;
        // Edit menu option to copy camera zoom between views.
        // I do not call update gui here because I want
        // the buttons to appear at the end of the animation.
        $('#dualViewCopyZoom').show();
        // Animation takes care of switching the buttons
    } else {
        this.AnimationCurrent = 0.5;
        this.AnimationTarget = 1.0;
        this.UpdateGui();
    }

    RecordState();

    this.AnimationLastTime = new Date().getTime();
    this.AnimationDuration = 1000.0;
    this.AnimateViewToggle();
}

DualViewWidget.prototype.UpdateGui = function () {
    // Now swap the buttons.
    if (this.DualView) {
        $('#dualWidgetLeft').hide();
        $('#dualWidgetRight').show();
        this.Viewers[1].ShowGuiElements();
        // Edit menu option to copy camera zoom between views.
        $('#dualViewCopyZoom').show();
    } else {
        $('#dualWidgetRight').hide();
        $('#dualViewCopyZoom').hide();
        this.Viewers[1].HideGuiElements();
        $('#dualWidgetLeft').show();
        // Edit menu option to copy camera zoom between views.
    }
}

DualViewWidget.prototype.AnimateViewToggle = function () {
    var timeStep = new Date().getTime() - this.AnimationLastTime;
    if (timeStep > this.AnimationDuration) {
        // end the animation.
        this.Viewer1Fraction = this.AnimationTarget;
        this.UpdateSize();
        this.UpdateGui();
        // this function is defined in init.js
        this.Draw();
        return;
    }

    var k = timeStep / this.AnimationDuration;

    // update
    this.AnimationDuration *= (1.0-k);
    this.Viewer1Fraction += (this.AnimationTarget - this.Viewer1Fraction) * k;

    this.UpdateSize();
    // 2d canvas does not draw without this.
    this.Draw();
    var self = this;
    requestAnimFrame(function () { self.AnimateViewToggle()});
}


DualViewWidget.prototype.CreateThumbnailImage = function(height) {
    var canvas = document.createElement("canvas"); //create
    var ctx = canvas.getContext("2d");
    var img1 = this.Viewers[0].MainView.CaptureImage();
    var scale = height / img1.height;
    var width1 = Math.round(img1.width * scale);
    var height1 = Math.round(img1.height * scale);
    if (this.DualView) {
        var img2 = this.Viewers[2].MainView.CaptureImage();
        var width2 = Math.round(img2.width * scale);
        var height2 = Math.round(img2.height * scale);
        canvas.width = width1 + width2;
        canvas.height = Math.max(height1, height2);
        ctx.drawImage(img2, 0, 0, img2.width, img2.height,
                      width1, 0, width2, height2);
    } else {
        canvas.width = width1;
        canvas.height = height1;
    }
    ctx.drawImage(img1, 0, 0, img1.width, img1.height,
                  0, 0, width1, height1);

    var url = canvas.toDataURL('image/jpeg', 0.8);
    var thumb = document.createElement("img"); //create
    thumb.src = url;

    return thumb;
}


DualViewWidget.prototype.ShowImage = function (img) {
    alert("Do not depricate DualViewWidget.ShowIMage(img)");

    /* I do not think this does anything
    //document.body.appendChild(img);
    var disp =
        $('<img>').appendTo(parent)
        .addClass("sa-active")
        .attr('src',img.src);
    */
}

DualViewWidget.prototype.Draw = function () {
    if (GL) {
      GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    }

    // This just changes the camera based on the current time.
    if (this.Viewers[0]) {
        this.Viewers[0].Animate();
        if (this.DualView) { this.Viewers[1].Animate(); }
        this.Viewers[0].Draw();
    }
    if (this.Viewers[1] && this.DualView) { this.Viewers[1].Draw(); }
}


DualViewWidget.prototype.UpdateSize = function () {
    var height = this.Parent.height();
    var width = this.Parent.width();

    var width1 = width * this.Viewer1Fraction;
    var width2 = width - width1;


    if (width2 <= 10) {
        this.Viewers[1].Hide();
    } else {
        this.Viewers[1].Show();
    }

    // GL was odd because both viewer wer pu in the same canvas.

    // TODO: Let css handle positioning the viewers.
    //       This call positions the overview and still affect the main view.
    if (this.Viewers[0]) {
        // this should call UpdateSize
        this.Viewers[0].SetViewport([0, 0, width1, height]);
        this.Viewers[0].EventuallyRender(false);
    }
    if (this.Viewers[1]) {
        // this should call UpdateSize
        this.Viewers[1].SetViewport([width1, 0, width2, height]);
        this.Viewers[1].EventuallyRender(false);
    }
}


DualViewWidget.prototype.AnnotationWidgetOn = function() {
    for (var i = 0; i < this.Viewers.length; ++i) {
        this.Viewers.AnnotationWidgetOn();
    }
}

DualViewWidget.prototype.AnnotationWidgetOff = function() {
    for (var i = 0; i < this.Viewers.length; ++i) {
        this.Viewers.AnnotationWidgetOff();
    }
}

