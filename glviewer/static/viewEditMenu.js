// Todo There are two viewer menues for dual view.  
// I do not think we handle this well.


var HISTORY_MENU_ITEM;
function ToggleHistory() {
  $('#viewEditMenu').hide();
  var viewer = EVENT_MANAGER.CurrentViewer;
  if ( ! viewer) { return; }

  viewer.HistoryFlag = ! viewer.HitoryFlag;
  if (viewer.HistoryFlag) {
    HISTORY_MENU_ITEM.text("History Off")
  } else {
    HISTORY_MENU_ITEM.text("History On")
  }
  eventuallyRender();
}

// Legacy  get rid of this.
// Used wrongly in textWidget.js
// Stub it out until we fix this.
function ComparisonSaveAnnotations() {}


// Record the viewer into the current note and save into the database.
function SaveView() {
  var note = NOTES_WIDGET.GetCurrentNote(); 
  note.SnapShotCallback();
  NOTES_WIDGET.SaveCallback();
  $('#viewEditMenu').hide();
}

function GetViewerBounds (viewer) {
  var cam = viewer.GetCamera();
  var fp = cam.GetFocalPoint(); 
  var halfWidth = cam.GetWidth()/2;
  var halfHeight = cam.GetHeight()/2;
  return [fp[0]-halfWidth, fp[0]+halfWidth, fp[1]-halfHeight, fp[1]+halfHeight];
}

// Add bounds to view to overide image bounds.
function SetViewBounds() {
  var viewer = EVENT_MANAGER.CurrentViewer;
  var bounds = GetViewerBounds(viewer);
  var note = NOTES_WIDGET.GetCurrentNote();
  // Which view record?  Hack.
  var viewerRecord = note.ViewerRecords[0];
  if (viewer == VIEWER2) {
    var viewerRecord = note.ViewerRecords[1];
  }
  viewerRecord.OverviewBounds = bounds;
  // Set the image bounds so the new bounds are used immediately.
  viewerRecord.Image.bounds = viewerRecord.OverviewBounds;
  viewer.OverView.Camera.SetFocalPoint((bounds[0]+bounds[1])/2, (bounds[2]+bounds[3])/2);
  viewer.OverView.Camera.SetHeight(bounds[3]-bounds[2]);
  viewer.OverView.Camera.ComputeMatrix();
  eventuallyRender();

  // Save automatically if user has permission.
  if (EDIT) {
    // I cannot do this because it first sets the viewer record and bounds are lost.
    //NOTES_WIDGET.SaveCallback();
    // Lets try just setting this one note.
    var noteObj = JSON.stringify(note.Serialize(false));
    var d = new Date();
    $.ajax({
      type: "post",
      url: "/webgl-viewer/saveviewnotes",
      data: {"note" : noteObj,
             "db"   : GetSessionDatabase(),
             "date" : d.getTime()},
      success: function(data,status) {},
      error: function() { alert( "AJAX - error() : saveviewnotes (bounds)" ); },
    });

  }
  $('#viewEditMenu').hide();
}

// Add bounds to view to overide image bounds.
function SetImageBounds() {
  var viewer = EVENT_MANAGER.CurrentViewer;
  var imageDb = viewer.GetCache().Image.database;
  var imageId = viewer.GetCache().Image._id;
  var bounds = GetViewerBounds(viewer);

  // Set the image bounds so the new bounds are used immediately.
  viewer.GetCache().Image.bounds = bounds;
  viewer.OverView.Camera.SetFocalPoint((bounds[0]+bounds[1])/2, (bounds[2]+bounds[3])/2);
  viewer.OverView.Camera.SetHeight(bounds[3]-bounds[2]);
  viewer.OverView.Camera.ComputeMatrix();
  eventuallyRender();

  var data = JSON.stringify(bounds);
  $.ajax({
    type: "post",
    url: "/webgl-viewer/set-image-bounds",
    data: {"img" : imageId,
           "db"  : imageDb,
           "bds" : JSON.stringify(bounds)},
    success: function(data,status) {},
    error: function() {
      alert( "AJAX - error() : saveusernote 1" );
    },
  });


  $('#viewEditMenu').hide();
}


//==============================================================================
// Create and manage the menu to edit dual views.


function ShowViewEditMenu(x, y) {
    // Viewers have independent annotation visibility (which could be annoying.
    var viewer = EVENT_MANAGER.CurrentViewer;
    if ( ! viewer) { return; }

    var color = "#A0A0A0";
    if (viewer.WidgetList.length > 0) {
      color = "#000000";
    }

    $('#viewEditMenu').css({'top': y-15, 'left':x-15}).show();
}


function ShowViewerEditMenu(viewer) {
    EVENT_MANAGER.CurrentViewer = viewer;
    var viewport = viewer.GetViewport();
    $('#viewEditMenu').css({'top': viewport[1]+viewport[3]-180,
                            'left': viewport[0]+viewport[2]-230})
                      .show();
}


function InitViewEditMenus() {
    // Create the menu of edit options.
    $('<div>').appendTo('body').css({
        'background-color': 'white',
        'border-style': 'solid',
        'border-width': '1px',
        'border-radius': '5px',
        'position': 'absolute',
        'top' : '35px',
        'left' : '35px',
        'z-index': '2',
        'color': '#303030',
        'font-size': '20px'
    }).attr('id', 'viewEditMenu').hide()
      .mouseleave(function(){$(this).fadeOut();});

    var viewEditSelector = $('<ol>');
    viewEditSelector.appendTo('#viewEditMenu')
             .attr('id', 'viewEditSelector')
             .css({'width': '100%', 'list-style-type':'none'});
    $('<li>').appendTo(viewEditSelector)
             .text("Load Slide")
             .click(function(){ShowViewBrowser();});
    if (EDIT) {
      $('<li>').appendTo(viewEditSelector)
               .text("Save View")
               .click(function(){SaveView();});
    }
    $('<li>').appendTo(viewEditSelector)
             .text("Slide Info")
             .click(function(){ShowSlideInformation();});

    // Test for showing coverage of view histor.
    HISTORY_MENU_ITEM = $('<li>').appendTo(viewEditSelector)
             .text("History On")
             .click(function(){ToggleHistory();});

    // Hack until we have some sort of scale.
    $('<li>').appendTo(viewEditSelector)
             .attr('id', 'dualViewCopyZoom')
             .text("Copy Zoom")
             .hide()
             .click(function(){CopyZoom();});
    $('<li>').appendTo(viewEditSelector)
             .text("Flip Horizontal")
             .click(function(){FlipHorizontal();});
    // I need some indication that the behavior id different in edit mode.
    // If the user is authorized, the new bounds are automatically saved.
    if (EDIT) {
      $('<li>').appendTo(viewEditSelector)
               .text("Save View Bounds")
               .click(function(){SetViewBounds();});
    } else {
      $('<li>').appendTo(viewEditSelector)
               .text("Set View Bounds")
               .click(function(){SetViewBounds();});
    }
    // Create a selection list of sessions.
    $('<div>').appendTo('body').css({
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
        'z-index': '2',
        'color': '#303030',
        'font-size': '20px'
    }).attr('id', 'sessionMenu').hide()
        .mouseleave(function(){$(this).fadeOut();});
    $('<ul>').appendTo('#sessionMenu').attr('id', 'sessionMenuSelector');

    // Create a selector for views.
    $('<div>').appendTo('body').css({
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
        'z-index': '2',
        'color': '#303030',
        'font-size': '20px'
    }).attr('id', 'viewMenu').hide()
        .mouseleave(function(){$(this).fadeOut();});
    $('<ul>').appendTo('#viewMenu').attr('id', 'viewMenuSelector'); // <select> for drop down

    $('<div>').appendTo('body').css({
        'background-color': 'white',
        'border-style': 'solid',
        'border-width': '1px',
        'border-radius': '5px',
        'position': 'absolute',
        'top' : '30%',
        'left' : '30%',
        'width': '40%',
        'height': '40%',
        'z-index': '2',
        'color': '#303030',
        'font-size': '20px'
    }).attr('id', 'slideInformation').hide()
      .mouseleave(function(){$(this).fadeOut();});
}


function CopyZoom() {
  $('#viewEditMenu').hide();
  var viewer = EVENT_MANAGER.CurrentViewer;
  if ( ! viewer) { return; }

  var cam = viewer.GetCamera();
  var copyCam;
  if (viewer == VIEWER1) {
    var copyCam = VIEWER2.GetCamera();
  } else {
    var copyCam = VIEWER1.GetCamera();
  }

  viewer.AnimateCamera(cam.GetFocalPoint(), cam.Roll, copyCam.Height);
}

function ShowSlideInformation() {
  $('#viewEditMenu').hide();
  var viewer = EVENT_MANAGER.CurrentViewer;
  if ( ! viewer) { return; }

  imageObj = viewer.MainView.Section.Caches[0].Image;

  $('#slideInformation')
    .html("File Name: " + imageObj.filename
          + "<br>Dimensions: " + imageObj.dimensions[0] + ", "
                               + imageObj.dimensions[1]
          + "<br>Levels: " + imageObj.levels)
    .show();
}


function ShowSlideInformation() {
  $('#viewEditMenu').hide();
  var viewer = EVENT_MANAGER.CurrentViewer;
  if ( ! viewer) { return; }

  imageObj = viewer.MainView.Section.Caches[0].Image;

  $('#slideInformation')
    .html("File Name: " + imageObj.filename
          + "<br>Dimensions: " + imageObj.dimensions[0] + ", "
                               + imageObj.dimensions[1]
          + "<br>Levels: " + imageObj.levels)
    .show();
}


// Mirror image
function FlipHorizontal() {
    $('#viewEditMenu').hide();
    // When the circle button is pressed, create the widget.
    var viewer = EVENT_MANAGER.CurrentViewer;
    if ( ! viewer) { return; }

    var cam = viewer.GetCamera();
    viewer.ToggleMirror();
    viewer.SetCamera(cam.GetFocalPoint(), cam.GetRotation()+180.0, cam.Height);
    RecordState();
}


function SessionAdvance() {
// I do not have the session id and it is hard to get!
//    $.get(SESSIONS_URL+"?json=true&sessid="+$(obj).attr('sessid')+"&sessdb="+$(obj).attr('sessdb'),
//          function(data,status){
//            if (status == "success") {
//              ShowViewMenuAjax(data);
//            } else { alert("ajax failed."); }
//          });
}

function SessionAdvanceAjax() {
}






