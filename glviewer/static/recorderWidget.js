// This "widget" implements undo and redo as well as saving states in the database for a recording of a session.
// I save the recording state as a cookie so that the user can change slides or even sessions.
// I am going to have a separate recording collection.
// Each recording will be a single object.
// They will be tagged with start time, end time, user ID and a name (autogenerated or entered by user).


// NOTES:
//I will have to think about this ...
//save state vs. save delta state.
//State is simple .... Supports undo better .... Start with this.

// Maybe students can link to the instructor recording session.  The could add notes which are added to the recording.

// It might be nice to know where the mouse is pointing at all times.  We need a pointing tool. That is many events though.  LATER....

// Design issue:
// Should I save the state at the end of a move or the beginning?  I chose end.  Although beginning is easier,
// I like just popping the last state off the TIME_LINE and pushing to the REDO_STACK


//------------------------------------------------------------------------------
// Records are now being used for notes.  Since page record may contain
// information about current note, I am using ViewerRecord as a shared object.

var RECORDER_WIDGET = null;

function ViewerRecord () {
    this.AnnotationVisibility = 0;
    this.Annotations = [];
}

// For copy slide in presentatations.  Serialize / load messup image.
ViewerRecord.prototype.DeepCopy = function(source) {
    this.AnnotationVisibility = source.AnnotationVisibility;
    this.Annotations = JSON.parse(JSON.stringify(source.Annotations));
    this.Camera = new Camera();
    this.Camera.DeepCopy(source.Camera);
    this.Image = source.Image;
    this.OverviewBounds = source.OverviewBounds.slice(0);
}

// I am still trying to figure out a good pattern for loading
// objects from mongo.
// Cast to a ViewerObject by setting its prototype does not work on IE
ViewerRecord.prototype.Load = function(obj) {
    if ( ! obj.Camera) {
        var bds = obj.Image.bounds;
        if (bds) {
            obj.Camera = {FocalPoint: [(bds[0]+bds[1])/2, (bds[2]+bds[3])/2],
                          Height: bds[3]-bds[2],
                          Width: bds[1]-bds[0],
                          Roll: 0};
        }
    }

    for (ivar in obj) {
        this[ivar] = obj[ivar];
    }

    if ( this.Camera.Width === undefined) {
        this.Camera.Width = this.Camera.Height * 1.62;
    }

    // Stuck with Overview because it is in the database.
    if (! this.OverviewBounds) {
        this.OverviewBounds = this.Image.bounds;
    }

    if (this.Annotations) {
        for (var i = 0; i < this.Annotations.length; ++ i) {
            var a = this.Annotations[i];
            if (a && a.color) {
                a.color = ConvertColor(a.color);
            }
        }
    }

    if (this.Transform) {
        var t = new PairTransformation;
        t.Load(this.Transform);
        this.Transform = t;
    }
}


ViewerRecord.prototype.CopyViewer = function (viewer) {
  var cache = viewer.GetCache();
  if ( ! cache) {
    this.Camera = null;
    this.AnnotationVisibility = false;
    this.Annotations = [];
    return;
  }


  this.OverviewBounds = viewer.GetOverViewBounds();

  this.Image = cache.Image;
  this.Camera = viewer.GetCamera().Serialize();

  this.AnnotationVisibility = viewer.GetAnnotationVisibility();
  this.Annotations = [];
  for (var i = 0; i < viewer.WidgetList.length; ++i) {
    this.Annotations.push(viewer.WidgetList[i].Serialize());
  }
}

// For stacks.  A reduced version of copy view. 
ViewerRecord.prototype.CopyAnnotations = function (viewer) {
    this.Annotations = [];
    for (var i = 0; i < viewer.WidgetList.length; ++i) {
        var o = viewer.WidgetList[i].Serialize();
        if (o) {
            this.Annotations.push(o);
        }
    }
}

// I am not sure we need to serialize.  
// The annotations are already in database form.
// Possibly we need to restrict which ivars get into the database.
ViewerRecord.prototype.Serialize = function () {
  rec = {};
  rec.Image = this.Image._id;
  rec.Database = this.Image.database;
  rec.NumberOfLevels = this.Image.levels;
  rec.Camera = this.Camera;
  // deep copy
  if ( this.Annotations) {
    rec.Annotations = JSON.parse(JSON.stringify(this.Annotations));
  }
  rec.AnnotationVisibility = this.AnnotationVisibility;

  if (this.OverviewBounds) {
     rec.OverviewBounds = this.OverviewBounds;
  }

  if (this.Transform) {
      rec.Transform = this.Transform.Serialize();
  }

  return rec;
}


ViewerRecord.prototype.Apply = function (viewer) {
    // If a widget is active, then just inactivate it.
    // It would be nice to undo pencil strokes in the middle, but this feature will have to wait.
    if (viewer.ActiveWidget) {
        // Hackish way to deactivate.
        viewer.ActiveWidget.SetActive(false);
    }

    var cache = viewer.GetCache();
    if ( ! cache || this.Image._id != cache.Image._id) {
        var newCache = FindCache(this.Image);
        viewer.SetCache(newCache);
    }

    viewer.SetOverViewBounds(this.OverviewBounds);

    if (this.Camera !== undefined && this.Transform === undefined) {
        var cameraRecord = this.Camera;
        viewer.GetCamera().Load(cameraRecord);
        if (viewer.OverView) {
            viewer.OverView.Camera.Roll = cameraRecord.Roll;
            viewer.OverView.Camera.ComputeMatrix();
        }
        viewer.UpdateZoomGui();
        viewer.UpdateCamera();
    }

    // TODO: Get rid of this hack.
    if (viewer.AnnotationWidget && this.AnnotationVisibility != undefined) {
        viewer.AnnotationWidget.SetVisibility(this.AnnotationVisibility);
    }
    if (this.Annotations != undefined) {
        // TODO: Fix this.  Keep actual widgets in the records / notes.
        // For now lets just do the easy thing and recreate all the annotations.
        viewer.WidgetList = [];
        viewer.ShapeList = [];
        for (var i = 0; i < this.Annotations.length; ++i) {
            var widget = viewer.LoadWidget(this.Annotations[i]);
            // Until we do the above todo.  This is the messy way of removing
            // empty widgets (widgets that did not load properly).
            if (widget.Type == "sections" && widget.IsEmpty()) {
                this.Annotations.splice(i,1);
                --i;
            }
        }
    }

    // fit the canvas to the div size.
    viewer.UpdateSize();
}

// This is a helper method to start preloading tiles for an up coming view.
ViewerRecord.prototype.LoadTiles = function (viewport) {
    var cache = FindCache(this.Image);
    // TODO:  I do not like the fact that we are keeping a serialized
    // version of the camera in the record object.  It should be a real 
    // camera that is serialized when it is saved.
    var cam = new Camera();
    cam.Load(this.Camera);
    cam.SetViewport(viewport);
    cam.ComputeMatrix();

    // Load only the tiles we need.
    var tiles = cache.ChooseTiles(cam, 0, []);
    for (var i = 0; i < tiles.length; ++i) {
        LoadQueueAddTile(tiles[i]);
    }
}


function GetTrackingData(){
  $.ajax({
    type: "get",
    url: "/webgl-viewer/gettrackingdata",
    success: function(data,status){
               if (status == "success") {
                 LoadTrackingCallback(data);
               } else { saDebug("ajax failed - get tracking data"); }
             },
    error: function() { saDebug( "AJAX - error() : gettrackingdata" ); },
    });
}

function LoadTrackingCallback(data){
  alert(data);
}

// legacy
function RecordState() {
    if (RECORDER_WIDGET) {
        RECORDER_WIDGET.RecordState();
    }
}

// display is a set of viewers (like DualViewWidet)
var RecorderWidget = function(display) {
    if ( ! RECORDER_WIDGET) {
        RECORDER_WIDGET = this;
    }
    
    var self = this;
    this.Display = display;
    this.RecordTimerId = 0;
    this.Records;

    this.TimeLine = [];
    this.RedoStack = [];
    this.Recording = true;
    this.RecordingName = "";

    // The recording button indicates that recording is in
    // progress and also acts to stop recording.
    this.RecordButton = $('<img>')
        .appendTo('body')
        .css({
            'opacity': '0.5',
            'position': 'absolute',
            'height': '20px',
            'bottom' : '120px',
            'right' : '20px',
            'z-index': '1'})
        .attr('src','webgl-viewer/static/stopRecording2.png')
        .hide()
        .click(function () {self.RecordingStop()});

    // Optional buttons.  Exposed for testing.
    // Undo (control z) and redo (control y) keys work,
    this.UndoButton = $('<img>').appendTo('body')
        .css({
            'opacity': '0.5',
            'position': 'absolute',
            'height': '30px',
            'bottom' : '5px',
            'right' : '100px',
            'z-index': '1'})
        .attr('src','webgl-viewer/static/undo.png')
        .hide()
        .click(function(){alert("undo");});
    this.RedoButton = $('<img>').appendTo('body').css({
        'opacity': '0.5',
        'position': 'absolute',
        'height': '30px',
        'bottom' : '5px',
        'right' : '70px',
        'z-index': '1'})
        .attr('src','webgl-viewer/static/redo.png')
        .hide()
        .click(function(){alert("REDO");});

    this.RecordingName = getCookie("SlideAtlasRecording");
    if (this.RecordingName != undefined && this.RecordingName != "false") {
        this.Recording = true;
        this.UpdateGUI();
    }

    // We have to start with one state (since we are recording states at the end of a move).
    this.RecordState();
}

// Should we name a recording?
RecorderWidget.prototype.UpdateGUI = function() {
    if (this.Recording) {
        this.RecordButton.show();
    } else {
        this.RecordButton.hide();
    }
}

// Should we name a recording?
RecorderWidget.prototype.RecordingStart = function() {
    if (this.Recording) { return; }
    this.Recording = true;
    // Generate a recording name as a placeholder.
    // User should be prompted for a name when recording stops.
    var d = new Date();
    this.RecordingName = "Bev" + d.getTime();
    setCookie("SlideAtlasRecording",this.RecordingName,1);
    this.UpdateGUI();
    // Create a new recording object in the database.
    this.RecordState();
}

RecorderWidget.prototype.RecordingStop = function() {
    if ( ! this.Recording) { return; }
    this.Recording = false;
    setCookie("SlideAtlasRecording","false",1);
    this.UpdateGUI();
    
    // Prompt for a name and if the user want to keep the recording.
}

RecorderWidget.prototype.RecordStateCallback = function() {
    if (this.Display.GetNumberOfViewers() == 0) {return;}

    // Timer called this method.  Timer id is no longer valid.
    this.RecordTimerId = 0;
    // Redo is an option after undo, until we save a new state.
    this.RedoStack = [];

    // Create a new note.
    var note = new Note();
    // This will probably have to be passed the viewers.
    note.RecordView(this.Display);

    // The note will want to know its context
    // The stack viewer does not have  notes widget.
    if (SA.NotesWidget) {
        parentNote = SA.NotesWidget.GetCurrentNote();
        if ( ! parentNote.Id) {
            //  Note is not loaded yet.
            // Wait some more
            this.RecordState();
            return;
        }
        // ParentId should be depreciated.
        note.ParentId = parentNote.Id;
        note.SetParent(parentNote);
    }
    // Save the note in the admin database for this specific user.
    $.ajax({
        type: "post",
        url: "/webgl-viewer/saveusernote",
        data: {"note": JSON.stringify(note.Serialize(false)),
               "col" : "tracking",
               "type": "Record"},
        success: function(data,status) {
            note.Id = data;
        },
        error: function() {
            //saDebug( "AJAX - error() : saveusernote" );
        },
    });

    this.TimeLine.push(note);
}


// Create a snapshot of the current state and push it on the TIME_LINE stack.
// I still do not compress scroll wheel zoom, so I am putting a timer event
// to collapse recording to lest than oner per second.
RecorderWidget.prototype.RecordState = function() {
    if (this.Display.GetNumberOfViewers() == 0) {return;}
    // Delete the previous pending record timer
    if (this.RecordTimerId) {
        clearTimeout(this.RecordTimerId);
        this.RecordTimerId = 0;
    }
    // Start a record timer.
    var self = this;
    this.RecordTimerId = setTimeout(
        function(){ self.RecordStateCallback();}, 
        1000);
}

RecorderWidget.prototype.GetRecords = function() {
    var self = this;
    $.ajax({
        type: "get",
        url: "/webgl-viewer/getfavoriteviews",
        data: {"col" : "tracking"},
        success: function(data,status) {
            self.Records = data.viewArray;
        },
        error: function() {
            saDebug( "AJAX - error() : get records" );
        },
    });
}


// Create a snapshot of the current state and push it on the TIME_LINE stack.
// I still do not compress scroll wheel zoom, so I am putting a timer event
// to collapse recording to lest than oner per second.
RecorderWidget.prototype.RecordState = function() {
    // Delete the previous pending record timer
    if (this.RecordTimerId) {
        clearTimeout(this.RecordTimerId);
        this.RecordTimerId = 0;
    }
    // Start a record timer.
    var self = this;
    this.RecordTimerId = setTimeout(function(){self.RecordStateCallback();}, 1000);
}


// Move the state back in time.
RecorderWidget.prototype.UndoState = function () {
    if (this.TimeLine.length > 1) {
        // We need at least 2 states to undo.  The last state gets removed,
        // the second to last get applied.
        var recordNote = this.TimeLine.pop();
        this.RedoStack.push(recordNote);

        // Get the new end state
        recordNote = this.TimeLine[this.TimeLine.length-1];
        // Now change the page to the state at the end of the timeline.
        recordNote.DisplayView();
    }
}

// Move the state forward in time.
RecorderWidget.prototype.RedoState = function() {
    if (this.RedoState.length == 0) {
        return;
    }
    var recordNote = this.RedoStack.pop();
    this.TimeLine.push(recordNote);

    // Now change the page to the state at the end of the timeline.
    recordNote.DisplayView();
}
