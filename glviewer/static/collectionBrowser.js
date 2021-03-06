// TODO: 
// Changing from /session-save to /webgl-viewer/moveview because partial
// (session_save can be slow) saves dropped views.
// Leaving undo as /session-save for now.


// BUG: Notes now have a sessionId so the navigation widget will work when
// a note is loaded in issolation.  We are not updating this reference when
// the view is moved.

// Scroll when dragged to the bottom or top of the screen.


// Verify save lock works.
// Undo button.
// delete button.
// Indicate last selected with boundary/ background
//   hover exit should set values back to state of view.

// Shift for range selection.
// (maybe) Right click menu.
// View names should be editable.
// Drop position indicator could be improved.


// I am not so sure I like this closure pattern.
// I am trying to hide helper object, but
// I could just declare them inside the contructor.
// This pattern does not make any of the methods
// private.  I do not think it makes any instance
// variables private either.


// Closure namespace 
CollectionBrowser = (function (){

    var PROGRESS_COUNT = 0;

    var PushProgress = function() {
        $('body').css({'cursor':'progress'});
        PROGRESS_COUNT += 1;
    }

    var PopProgress = function() {
        PROGRESS_COUNT -= 1;
        if (PROGRESS_COUNT <= 0) {
            $('body').css({'cursor':'default'});
        }
    }


    //==============================================================================
    // History for undo
    // Note: I can only support a single undo because copy will orphan views.
    // Copy created views in trash so undo will work once, but a second undo
    // will not have the copied view and it will be orphaned.

    // History
    // TODO: Add hooks to record history
    // TODO: Add ctrl -z binding to undo.
    // TODO: Add undo button.
    // TODO: Handle deleting new items.
    var HISTORY = [];
    var UNDO_BUTTON;

    function HistoryNewRecord() {
        HISTORY = [];
    }

    function HistoryAddSession(sessionObj) {
        var sessionItem = {session: sessionObj,
                           viewObjects: []};
        // Deep copy of the view objects.
        for (var i = 0; i < sessionObj.ViewObjects.length; ++i) {
            viewObj = new ViewObject().Copy(sessionObj.ViewObjects[i]);
            sessionItem.viewObjects.push(viewObj);
        }
        HISTORY.push(sessionItem);
        if (  ! UNDO_BUTTON) {
            UNDO_BUTTON = $('<div>')
                .appendTo(GALLERY1.OptionBar)
                .css({'position':'absolute',
                      'left':'20px',
                      'top' :'0px',
                      'height':'20x',
                      'color':'#FFF',
                      'background-color':'#7AF',
                      'border-radius':'8px',
                      'padding-left':'10px',
                      'padding-right':'10px'})
                .text("Undo (control-z)")
                .click(HistoryUndo);
        }
        UNDO_BUTTON.show();
    }

    function HistoryUndo() {
        if (HISTORY.length == 0) {
            return;
        }
        ClearSelected();
        for (var i = 0; i < HISTORY.length; ++i) {
            var sessionItem = HISTORY[i];
            sessionItem.session.ViewObjects = sessionItem.viewObjects;
            sessionItem.session.Modified();
        }
        LIBRARY_OBJ.Save();
        UpdateGUI();
        UNDO_BUTTON.hide();
        HISTORY = [];
    }

    //==============================================================================
    // Global functions

    // For syncronizing data objects and GUI.
    var TIME_COUNT = 1;
    // Library singleton
    var LIBRARY_OBJ = undefined;
    // Special trash sesison
    var TRASH_SESSION = undefined;
    var TRASH_SESSION_ID = "54d0e7a2dd98b5122dfc73f9";

    function RequestLibraryData(callback) {
        if (!LIBRARY_OBJ) {
            // Just creating the library starts the load request.
            LIBRARY_OBJ = new LibraryObject();
        }

        // Incase the library is already loaded
        if (LIBRARY_OBJ.Loaded) {
            if (callback) {
                callback(LIBRARY_OBJ);
            }
        }

        // Waiting: Add the callback.
        if (callback) {
            LIBRARY_OBJ.LoadCallbacks.push(callback)
        }
    }

    document.body.addEventListener(
        "keydown",
        function(e) {
            if (e.keyCode == 90 && e.ctrlKey) {
                // control-z
                HistoryUndo();
            }
            return false; },
        false);
                                  

    document.body.addEventListener(
        "keydown",
        function(e) {
            if (e.keyCode == 46) {
                // Delete just moves the selected to the trash session.
                TRASH_SESSION.DropSelected(0, false, false);
            }
            return false; },
        false);




    //==============================================================================
    function LibraryObject() {
        this.LoadCallbacks = [];
        this.Loaded = false;
        this.CollectionObjects = [];
        // Make the request.
        var self = this;
        PushProgress();
        $.get("/sessions?json=true",
              function(data,status){
                  if (status == "success") {
                      PopProgress();
                      self.Load(data);
                  } else {
                      PopProgress();
                      console.log("ajax failed.");
                  }
              });   
    }

    LibraryObject.prototype.Load = function (data) {
        // The first "sessions" list in data is actually a list of
        // collections.
        for (var i = 0; i < data.sessions.length; ++i) {
            this.CollectionObjects.push(new CollectionObject(data.sessions[i]));
        }
        this.Loaded = true;
        for (var i = 0; i < this.LoadCallbacks.length; ++i) {
            this.LoadCallbacks[i](this);
        }
    }

    // This appears to be a legacy method that is now only called when the undo
    // button is pressed.
    LibraryObject.prototype.Save = function () {
        for (var i = 0; i < this.CollectionObjects.length; ++i)
            {
                this.CollectionObjects[i].Save();
            }
    }



    //==============================================================================
    // Collection data object
    function CollectionObject(data) {
        this.Label = data.rule;
        this.SessionObjects = [];
        for (var i = 0; i < data.sessions.length; ++i) {
            this.SessionObjects.push(new SessionObject(data.sessions[i]));
        }
    }

    // This appears to be a legacy method that is now only called when the undo
    // button is pressed.
    CollectionObject.prototype.Save = function () {
        for (var i = 0; i < this.SessionObjects.length; ++i)
            {
                this.SessionObjects[i].Save();
            }
    }




    //==============================================================================
    INITIALIZED = 0;
    WAITING = 1;
    LOADED = 2;
    SAVING = 3;
    function SessionObject(data) {
        this.Id = data.sessid;
        this.Label = data.label;
        // A separate request is required to get the view data.
        this.ViewObjects = [];
        this.LoadCallbacks = [];


        this.State = INITIALIZED;
        this.ModifiedTime = this.SavedTime = TIME_COUNT;

        if (this.Label == "Trash") {
            TRASH_SESSION = this;
            this.RequestViewData();
        }
    }


    SessionObject.prototype.GetViewIdPosition = function(viewId) {
        for (idx = 0; idx < this.ViewObjects.length; ++idx) {
            if (this.ViewObjects[idx].Id == viewId) {
                return idx;
            }
        }
        console.log("Error: could not find viewId in session.")
        return 0;
    }


    SessionObject.prototype.RequestViewData = function(sucessCallback,
                                                       errorCallback) {
        if (this.State == LOADED) {
            sucessCallback(this);
        }
        this.LoadCallbacks.push(sucessCallback);
        if (this.State == WAITING) {
            return;
        }
        this.State == WAITING;
        // Make the request to populate the view list.
        var self = this;
        this.State = WAITING

        PushProgress();
        $.ajax({
            type: "get",
            url: "/webgl-viewer/getsess",
            data: {'sessid': this.Id},
            success: function(data) {
                PopProgress();
                self.LoadViewData(data);
            },
            error: function() {
                PopProgress();
                if (errorCallback) {
                    (errorCallback)();
                }
                console.log("ajax failed: sessions?json=1");
            }});

        /*
        $.get("/sessions?json=1&sessid="+this.Id,
              function(data,status){
                  if (status == "success") {
                      self.LoadViewData(data);
                  } else {
                      if (errorCallback) {
                          (errorCallback)();
                      }
                      console.log("ajax failed: sessions?json=1"); }
              });
              */
    }

    SessionObject.prototype.LoadViewData = function(data) {
        this.State = LOADED;
        this.ViewObjects = [];
        // Why did i modify?  Did I intend to doe the opposite?
        //this.Modified();
        this.ModifiedTime = this.SavedTime = 1;
        for (var i = 0; i < data.views.length; ++i) {
            viewObject = new ViewObject(this).LoadData(data.views[i]);
            //viewObject.Label = data.images[i].label;
            viewObject.Source = "/thumb?db="+data.views[i].ImageDb+"&img="+data.views[i].ImageId;
            this.ViewObjects.push(viewObject);
        }
        for (var i = 0; i < this.LoadCallbacks.length; ++i) {
            if (this.LoadCallbacks[i]) {
                this.LoadCallbacks[i](this);
            }
        }
        this.LoadCallbacks = [];
    }


    // Move all the selected views into this session.
    // This does handle copying if the viewObj.Copy flag is set.
    // It inserts the views at the index.
    // Keep selected flag indicates that the moved views remain selected.
    SessionObject.prototype.DropSelected = function(index, copy, keepSelected) {
        if (SELECTED.length == 0) {
            return;
        }
        if (this.State != LOADED) {
            ClearSelected();
            alert("Destintation is not finished loading (or saving).");
            return;
        }

        console.log("Drop " + SELECTED.length + " selected views into " + this.Label);
      
        // We have to deal with viewObjects because copies have no view GUIs
        var selectedViewObjects = [];

        // This is a bit of a pain.  Because we want an undo to put
        // copies in the trash, copies have to originate in the trash
        // before we save the history.
        for (var i = 0; i < SELECTED.length; ++i) {
            var view = SELECTED[i];
            // Hack to get rid of selected color when copying.
            // Force a gui change
            // Wait, I may not need this anymore.
            view.Session.UpdateTime = -1;
            var viewObj = view.ViewData;
            if (copy) {
                viewObj.Selected = false;
                viewObj = new ViewObject().Copy(viewObj);
                console.log("copy view " + viewObj.Label);
                viewObj.Selected = keepSelected;
                viewObj.CopyFlag = true;
                TRASH_SESSION.InsertViewObject(viewObj, i);
            }
            selectedViewObjects.push(viewObj);
        }
        ClearSelected();

        HistoryNewRecord();
        // Figure out which session should be recorded for undo.
        // The destination session
        HistoryAddSession(this);
        // Now find the source sessions.
        for (var i = 0; i < selectedViewObjects.length; ++i) {
            var viewObj = selectedViewObjects[i];
            // Move modifies the source session.
            var sessionObj = viewObj.SessionObject;
            if (sessionObj.SavedTime > 0 ) {
                // misuse of the SavedTime variable to put the session
                // in the history only once.
                sessionObj.SavedTime = -1;
                HistoryAddSession(sessionObj);
            }
        }

        // Everything is a move now (copy, move from trash).
        // Using an index causes a problem when moving to
        // the same session.  Removing the object causes
        // The index to point to the wrong location.
        // Duplicate the object temporarily

        // Add the selected.
        tmp = selectedViewObjects;
        selectedViewObjects = []
        for (var i = 0; i < tmp.length; ++i) {
            var viewObj = tmp[i];
            // We have to be careful. If the destination session is the
            // same as the source destination.  Make a copy of the viewObj
            // so it will not be removed when trying to remove the
            // original.  Shallow copy so we do not need to duplicate the gui.
            viewObj = new ViewObject().Copy(viewObj);
            viewObj.Selected = keepSelected;
            // Insert
            this.InsertViewObject(viewObj, index);
            selectedViewObjects.push(viewObj);
            // Put them in order (hack)
            index++;
        }
        // Remove the placeholders.
        for (var i = 0; i < tmp.length; ++i) {
            var viewObj = tmp[i];
            var sessionObj = viewObj.SessionObject;
            sessionObj.RemoveViewObject(viewObj);
        }

        // Sanity check for debugging.
        // Make sure the new session has all the "selected" views.
        for (var i = 0; i < selectedViewObjects.length; ++i) {
            var viewObj = selectedViewObjects[i];
            // Make sure the views are in the new session.
            var found = false;
            for (j = 0; j < this.ViewObjects.length; ++j) {
                if (this.ViewObjects[j].Id == viewObj.Id) {
                    found = true;
                    break;
                }
            }
            if ( ! found) {
                HistoryUndo();
                alert("Sanity check failed. Lost: " + viewObj.Label);
                return;
            }
            // Make sure the views are removed from the previous session.
            if ( ! copy) {
                var sessionObj = viewObj.SessionObject;
                if (this.Id != sessionObj.Id) {
                    for (var j = 0; j < sessionObj.ViewObjects.length; ++j) {
                        if(sessionObj.ViewObjects[j].Id == viewObj.Id) {
                            HistoryUndo();
                            alert("Sanity check failed. Move did not remove: " + viewObj.Label);
                            return;
                        }
                    }
                }
            }
        }

        // Leave all the previous mess for updating the GUI (it works).
        // Use the structure to move the views in the data base.
        // Note: I do not think the api works when called multiple times quickly.
        // Serialize it.
        this.SaveMovedViews(selectedViewObjects);
    }

    // Actually send the messages to the server to make the moves (one at a time)
    // This is recursive.  It only sends one, but is called again from the ajax return.
    SessionObject.prototype.SaveMovedViews = function(viewObjs) {
        this.State = SAVING;
        if (viewObjs.length == 0) {
            // waiting is actually not an idling state. Loaded is.
            this.State = LOADED;
            // NOTE: TODO: We should not update the GUI unless Save returns successfully.
            // I am not sure that the GUI stuff belongs in this method.
            // Update GUI will repopulate this array.
            ClearSelected();
            // Save modified sessions.
            // LIBRARY_OBJ.Save();
            UpdateGUI();
            return;
        }

        // This appears to be making a copy of the list (but destroying the original)
        let remainingViewObjs = viewObjs.splice(0);
        let viewObj = remainingViewObjs.pop();
      
        var self = this;
        var viewId = viewObj.Id;
        var sessId = this.Id;
        var index = this.GetViewIdPosition(viewObj.Id);
        var copyFlag = viewObj.CopyFlag;
        // If to and from are the same session, index is relative to
        // session after the view was removed.

        console.log(remainingViewObjs.length.toString() + ": move " + viewObj.Label + " (" +
                    viewId + ") to " + this.Label + " (" + sessId + "), idx = " + index)  
        $.ajax({
            type: "post",
            url: "/webgl-viewer/move-view",
            data: {"view" : viewId,
                   "to"   : sessId,
                   "idx"  : index,
                   "copy" : copyFlag},
            success : function(data,status) {
                if (data.toLowerCase().substr(0,5) == "error") {
                    window.alert(data);
                    return;
                }
                if (copyFlag) {
                    viewObj.SessionObject.ViewObjects[index].Id = data;
                }
                self.SaveMovedViews(remainingViewObjs);                
            },
            error: function() {
                alert("AJAX - error() : undo delete view" );
            }});
    }

    // This appears to be a legacy method that is now only called when the undo
    // button is pressed.
    SessionObject.prototype.Save = function() {
        if ( this.SavedTime >= this.ModifiedTime) {
            return;
        }
        this.SavedTime = this.ModifiedTime;

        if (this.State != LOADED) {
            console.log("Error Save: Session not loaded.");
            return;
        }

        var views = [];
        for (var i = 0; i < this.ViewObjects.length; ++i) {
            var viewObj = this.ViewObjects[i];
            var view = {
                'label' : viewObj.Label,
                'imgdb' : viewObj.ImageDb,
                'img'   : viewObj.ImageId,
                'view'  : viewObj.Id,
                'copy'  : viewObj.CopyFlag
            };
            if (viewObj.CopyFlag) {
                this.SaveLock = true;
            }

            views.push(view);
        }

        // Save the new order in the database.
        // Python will have to detect if any view objects have to be deleted.
        var args = {};
        args.views = views;
        args.session = this.Id;
        args.label = this.Label;

        var self = this;
        PushProgress();
        $.ajax({
            type: "post",
            url: "/session-save",
            data: {"input" :  JSON.stringify( args )},
            success: function(data) {
                PopProgress();
                // If copy, view ids have changed.
                self.UpdateViewIds(data);
                self.SaveLock = false;
            },
            error:   function() {
                PopProgress();
                console.log( "AJAX - error: session-save (collectionBrowser)" );
            }
        });

    }

    // When views are copied, we need to set new ids.
    SessionObject.prototype.UpdateViewIds = function(data) {
        for (var i = 0; i < this.ViewObjects.length; ++i) {
            var viewObj = this.ViewObjects[i];
            if (viewObj.CopyFlag) {
                viewObj.Id = data.views[i];
                viewObj.CopyFlag = false;
            }
        }
    }

    SessionObject.prototype.RemoveViewObject = function(viewObj) {
        // Move: remove the view from the session.
        var idx = this.ViewObjects.indexOf(viewObj);
        if (idx > -1) {
            this.ViewObjects.splice(idx,1);
            this.Modified();
        }
    }

    SessionObject.prototype.InsertViewObject = function(viewObj, index) {
        this.ViewObjects.splice(index,0,viewObj);
        this.Modified();
        viewObj.SessionObject = this;
    }

    SessionObject.prototype.Modified = function() {
        this.ModifiedTime = ++TIME_COUNT;
    }


//==============================================================================
    function ViewObject(sessionObj) {
        this.CopyFlag = false;
        this.SessionObject = sessionObj;
        // I have to put this here so UpdateGUI will work
        this.Selected = false;
    }
    // A work around for overloading constructors
    ViewObject.prototype.LoadData = function(data) {
        this.Id = data.Id;
        this.ImageId = data.ImageId;
        this.ImageDb = data.ImageDb;
        this.Label = data.Label.replace("|AC34","");
        this.CopyFlag = false;
        this.Source = "";
        return this;
    }
    ViewObject.prototype.Copy = function(viewObj) {
        this.Id = viewObj.Id;
        this.ImageId = viewObj.ImageId;
        this.ImageDb = viewObj.ImageDb;
        this.Label = viewObj.Label;
        this.Source = viewObj.Source;
        this.SessionObject = viewObj.SessionObject;
        // Hidden here, but it makes sense.
        // this.CopyFlag = true;
        // I am using this for a shallow copy to avoid
        // confusion between the original and new when
        // source and destination are the same.
        this.CopyFlag = viewObj.CopyFlag;
        return this;
    }


// Issues:
// - When we update a sessionObject, how do we get the sessionGui objects to update?
//   - Keep sync times, gui points to sessionObject. Loop through gui in update.
// - How do gui callbacks link back to sessionObject objects?
//      Set DOM instance variable to point to the viewObj

// Session GUI objects can simply have pointer to session data object.
//********
// View gui Objectects must point to session GUI object and viewobj
// Maybe create javascript view gui objects.  Have them indexable?


//==============================================================================
//==============================================================================
    // GUI objects.
    // I am going to leave SELECTED as an array of GUI objects because
    // it is difficult to get to the GUI objects from the data objects. 

    function UpdateGUI() {
        for (var i = 0; i < BROWSERS.length; ++i) {
            BROWSERS[i].UpdateGUI();
        }
    }

    function AddSelected(view) {
        for (var i = 0; i < SELECTED.length; ++i) {
            if (view.ViewData == SELECTED[i].ViewData) {
                return;
            }
        }
        SELECTED.push(view);
        view.Item.addClass("sa-view-browser-item sa-selected");
        view.ViewData.Selected = true;
    }

    // Removes a specific view from the SELECTED array.  (i.e. unselect).
    function RemoveSelected(view) {
        view.ViewData.Selected = false;
        view.Item.removeClass("sa-view-browser-item sa-selected");
        // Remove the item from the selected list.
        var index = SELECTED.indexOf(view);
        if (index > -1) {
            // Remove selected.
            SELECTED.splice(index, 1);
        }
    }

    // Sets the SELECTED list to empty and removes highlighting from items.
    function ClearSelected() {
        for (var i = 0; i < SELECTED.length; ++i) {
            SELECTED[i].Item.removeClass("sa-view-browser-item sa-selected");
            SELECTED[i].ViewData.Selected = false;
        }
        SELECTED = [];
    }

    var SELECTED = [];
    // Needed for shift select range.
    var LAST_SELECTED = undefined;
    var CLONES = [];
    var BROWSERS = [];
    var MESSAGE = 
        $('<div>').appendTo('body')
              .hide()
              .text("Move")
              .addClass("sa-view-browser-message");

    $('body')[0].oncontextmenu = function () {return false;};

    function CollectionBrowser () {
        // I am keeping a tree down to the view "leaves".
        // I need to keep the view "tree index" so the view li knows its position.
        BROWSERS.push(this);

        var self = this;
        this.Div = $('<div>')
            .css({'height': '100%'});
        this.OptionBar = $('<div>')
            .appendTo(this.Div)
            .addClass("sa-view-browser-div");
        
        this.Collections = [];

        this.CollectionItemList = $('<ul>')
            .appendTo(this.Div)
            .addClass("sa-view-browser-list");
        
        this.DefaultCollectionLabel = "";
        this.SelectedSession = undefined;
        this.Initialize();        
    }


    CollectionBrowser.prototype.Initialize = function() {
        var self = this;
        RequestLibraryData(
            function(library) {
                self.LoadLibrary(library)
            });
    }


    CollectionBrowser.prototype.AppendTo = function(parent) {
        this.Div.appendTo(parent);
    }


    CollectionBrowser.prototype.HandleResize = function() {
        return;
        // We need a dynamic resize
        var height = window.innerHeight - 2;
        var width = window.innerWidth - 2;
        var pos = this.Div.position();
        var top = pos.top + 15;
        var left = pos.left + 15;
        this.Div.css({"height":(height-top),
                      "width":(width-left)});
    }
    
    // Called after request returns with data from the server.
    CollectionBrowser.prototype.LoadLibrary = function(library) {
        // Populate the collection menu.
        var defaultCollection = undefined;
        // The first "sessions" list is actually collections.
        for (var i = 0; i < library.CollectionObjects.length; ++i) {
            var collectionObject = library.CollectionObjects[i];
            // Note: data.sessions is actually a list of collections.
            var collection = new Collection(collectionObject,this);
            // Which collection should be open.
            if (collectionObject.Label == this.DefaultCollectionLabel) {
                defaultCollection = collection;
            }
            this.Collections.push(collection);
        }
        if (defaultCollection) {
            defaultCollection.ToggleSessionList();
            // Now scroll to put the collection at the top.
            var scrollDiv = this.CollectionItemList;
            // Why won't it scroll if call directly?
            setTimeout(function () {var offset = defaultCollection.ListItem.offset();
                                    scrollDiv.scrollTop(offset.top);},
                       100);
        }
    }

    CollectionBrowser.prototype.UpdateGUI = function() {
        for (var i = 0; i < this.Collections.length; ++i) {
            this.Collections[i].UpdateGUI();
        }
    }
    

//==============================================================================

    function Collection(collectionObject, browser) {
        var ul = browser.CollectionItemList;

        this.ListItem = $('<li>')
            .appendTo(ul)
            .addClass("sa-view-browser-item");
        this.OpenCloseIcon = $('<img>')
            .appendTo(this.ListItem)
            .attr('src',"/webgl-viewer/static/"+"plus.png")
            .addClass("sa-view-icon");
        this.SessionLabel = $('<span>')
            .appendTo(this.ListItem)
            .text(collectionObject.Label);
        this.SessionList = $('<ul>')
            .appendTo(this.ListItem)
            .addClass("sa-view-browser-session-list")
            .hide();
        this.SessionListOpen = false;

        var self = this;
        this.OpenCloseIcon.click(function(){self.ToggleSessionList();});
        this.SessionLabel.click(function(){self.SelectAll();});

        // Populate the sessions list.
        this.Sessions = [];
        for (var i = 0; i < collectionObject.SessionObjects.length; ++i) {
            var session = new Session(collectionObject.SessionObjects[i], this);
            this.Sessions.push(session);
        }
    }

    Collection.prototype.SelectAll = function() {
        ClearSelected();
        if ( ! this.Views) {
            return;
        }
        for (var idx = 0; idx < this.Views.length; ++idx){
            AddSelected(this.Views[idx]);
            // Not sure what this anchor is .....
            LAST_SELECTED = this.Views[idx];
        }
    }
      
    Collection.prototype.ToggleSessionList = function() {
        if (this.SessionListOpen) {
            this.SessionListOpen = false;
            this.SessionList.slideUp();
            this.OpenCloseIcon.attr('src',"/webgl-viewer/static/"+"plus.png")
            for (var i = 0; i < this.Sessions.length; ++i) {
                var session = this.Sessions[i];
                RemoveDropTarget(session);
            }
        } else {
            this.SessionListOpen = true;
            this.SessionList.slideDown();
            this.OpenCloseIcon.attr('src',"/webgl-viewer/static/"+"minus.png")
            for (var i = 0; i < this.Sessions.length; ++i) {
                var session = this.Sessions[i];
                AddDropTarget(session);
                // Important for dropping / saving.
                session.RequestMetaData();

                if (this.LoadState == LOAD_INITIAL) {
                    session.RequestMetaData();
                }
            }
        }
    }

    Collection.prototype.UpdateGUI = function() {
        for (var i = 0; i < this.Sessions.length; ++i) {
            this.Sessions[i].UpdateGUI();
        }
    }

//==============================================================================
    function View(viewObject, session) {
        this.ViewData = viewObject;
        this.Session = session;

        var self = this;

        // Make a draggable list item
        this.Item = $('<li>')
            .appendTo(session.ViewList)
            .css({'position':'relative'})
            .addClass("sa-view-browser-view-item");
        this.DeleteButton = $('<img>')
            .appendTo(this.Item)
            .attr("src", "/webgl-viewer/static/"+"deleteSmall.png")
            .css({'height':'14px',
                  'position':'absolute',
                  'top':'0px',
                  'right':'0px'})
            .hide()
            .hover(function () {$(this).addClass("sa-active");},
                   function () {$(this).removeClass("sa-active");})
            .click(function () {
                ClearSelected();
                AddSelected(self); //(self.View);
                TRASH_SESSION.DropSelected(0, false, false);
            });
        
        this.Item
            .hover(
                function () {
                    $(this).addClass("sa-active");
                    self.DeleteButton.show();
                },
                function () {
                    $(this).removeClass("sa-active");
                    self.DeleteButton.hide();
                })
            .mousedown(
                function(event){
                    if (PROGRESS_COUNT) { return true;}
                    event.preventDefault();
                    // If we leave with the mouse pressed, then a drag
                    // is started.
                    if (self.SaveLock) {
                        // Not the best feedback
                        //alert("Wait for copy to finish");
                        // The order of a session cannot change until
                        // the lock is released.  We cannot save a
                        // session (use viewIds) until lock is released.
                    } else {
                        $(this).mouseleave(leaveHandler);
                    }
                    return false;
                })
            .mouseup(
                function(event){
                    if (PROGRESS_COUNT) { return true;}
                    var view = this.View;
                    event.preventDefault();
                    view.Item.unbind('mouseleave', leaveHandler);
                    
                    // Unselect previously selected views when control is not pressed
                    if ( ! event.ctrlKey) {
                        ClearSelected();
                    }

                    if ( event.shiftKey) {
                        // If the anchor is not in the same session,
                        // just start from the begining.
                        if (LAST_SELECTED === undefined ||
                            LAST_SELECTED.ViewData.SessionObject !=
                            view.ViewData.SessionObject) {
                            LAST_SELECTED = view.Session.Views[0];
                        }
                        // Now select the range
                        var session = view.Session;
                        var start = session.Views.indexOf(LAST_SELECTED);
                        var end = session.Views.indexOf(view);
                        if (start > end) {
                            var tmp = start;
                            start = end;
                            end = tmp;
                        }
                        for (var i = start; i <= end; ++i) {
                            AddSelected(session.Views[i]);
                        }
                    } else if ( view.ViewData.Selected ) {
                        // Control toggles views in selected list.
                        // This is the way it works in ms windows.
                        // Even unselecting sets the anchor.
                        LAST_SELECTED = view;
                        // unselect this view.
                        RemoveSelected(view);
                    } else {
                        // Select this view.
                        view.ViewData.Selected = true;
                        AddSelected(view);
                        LAST_SELECTED = view;
                    }
                });
        if (viewObject.Selected) {
            AddSelected(this);
        }
                        
        var labelDiv = $('<div>')
            .appendTo(this.Item)
            .text(viewObject.Label)
            .addClass("sa-view-browser-view-label");
        // Stuff I used to save in data
        // My hack to have the dom events call View menthod.
        this.Item[0].View = this;
    }

//==============================================================================
    // State of loading a session.
    // The session name and id are loaded by default.
    // Collection has not been opened.
    var LOAD_INITIAL = 0;
    // A request has been made for the meta data.
    var LOAD_METADATA_WAITING = 1;
    // The meta data has arrived.
    // Collection is open, but the session is not.
    var LOAD_METADATA_LOADED = 2;
    // The images have been requested.
    var LOAD_IMAGES = 3;
    
    function Session(sessionObject, collection) {
        this.SessionData = sessionObject;
        this.Views = [];

        this.UpdateTime = -1;
        var ul = collection.SessionList;

        this.Id = sessionObject.Id;
        this.Body = $('<li>')
            .appendTo(ul);
        this.OpenCloseIcon = $('<img>')
            .appendTo(this.Body)
            .attr('src',"/webgl-viewer/static/"+"plus.png")
            .addClass("sa-view-icon")
        this.SessionLabel = $('<span>')
            .appendTo(this.Body)
            .text(sessionObject.Label);

        this.Label = sessionObject.Label;

        this.ViewList = $('<ul>')
            .appendTo(this.Body)
            .addClass("sa-view-browser-view-list")
            .hide();
        this.ViewListOpen = false;
        
        var self = this;
        this.OpenCloseIcon.click(function(){self.ToggleViewList();});
        
        // Delay loading
        this.LoadState = LOAD_INITIAL;

        // If we are copying views in a session,
        // stop editing until the view ids are set properly.
        this.SaveLock = false;
    }

    
    Session.prototype.RequestMetaData = function() {
        this.LoadState = LOAD_METADATA_WAITING;

        var self = this;
        this.SessionData.RequestViewData(
            function(sessObject){
                // sucess callback
                self.LoadViewData(sessObject);
            },
            function() {
                // Error callback
                // Get rid of the loding image.
                self.ViewList.find('.sa-view-browser-waiting')
                    .attr("src", "/webgl-viewer/static/"+"brokenImage.png")
                    .attr("alt", "error");
            });
    }

    // This is called when the mouse leaves an item and a mouse button is pressed.
    // Leaving triggers a drag (when mouse is pressed).
    var leaveHandler = function(event){
        var view = this.View;
        // Mouse leave is sort of like mouse up.
        view.Item.unbind('mouseleave', leaveHandler);
        if ( ! view.ViewData.Selected ) {
            // Mouse down and drag out.  Select is set on mouse up.
            if ( ! event.ctrlKey) {
                ClearSelected();
            }
            // Select this view.
            view.ViewData.Selected = true;
            AddSelected(view);
        }

        // This is only called when the mouse is pressed.
        // Sanity check.
        if (event.which == 1 || event.which == 3) {
            // Startdragging.
            HideImagePopup();
            StartViewDrag(event);
        }
        return false;
    }
    
    Session.prototype.LoadViewData = function(sessionObject) {
        var self = this;

        this.LoadState = LOAD_METADATA_LOADED;
        this.UpdateGUI();        
    }

    Session.prototype.UpdateGUI = function () {
        if (this.UpdateTime >= this.SessionData.ModifiedTime) {
            return;
        }

        this.Views = [];
        this.ViewList.empty();

        if (this.LoadState <= LOAD_METADATA_WAITING) {
            // Throw a waiting icon until the meta data arrives.
            // This is removed when UpdateGUI gets called again and
            // this.ViewList.empty() is called.
            var listItem = $('<li>')
                .appendTo(this.ViewList)
                .css({'display':'block'})
                .addClass("sa-view-browser-view-item");
            var image = $('<img>')
                .appendTo(listItem)
                .attr("src", "/webgl-viewer/static/"+"circular.gif")
                .attr("alt", "waiting...")
                .addClass("sa-view-browser-waiting");
            $('<div>')
                .appendTo(this.ViewList)
                .css('clear','both');

            return;
        }

        this.UpdateTime = this.SessionData.ModifiedTime;
        this.LoadState = LOAD_METADATA_LOADED;
        for (var i = 0; i < this.SessionData.ViewObjects.length; ++i) {
            var viewObject = this.SessionData.ViewObjects[i];
            this.Views.push(new View(viewObject, this));
        }
        $('<div>')
            .appendTo(this.ViewList)
            .css('clear','both');

        if (this.ViewListOpen) {
            // View list was opened before we got the metadata.
            // Load the images too.
            this.RequestImages();
        }
    }
    

    Session.prototype.RequestImages = function() {
        if (this.LoadState != LOAD_METADATA_LOADED) { return; }
        this.LoadState = LOAD_IMAGES;
        
        for (var i = 0; i < this.Views.length; ++i) {
            var view = this.Views[i];
            var image = $('<img>')
                .appendTo(view.Item)
                .css({'height':'32px'})
                .attr("src", view.ViewData.Source)
                .attr("alt", view.ViewData.Label)
                .mouseenter(
                    function (event) {
                        if (event.which == 0) {
                            // Show larger image after about 1 second.
                            ScheduleImagePopup($(this));
                            
                        }
                    })
                .mouseleave(
                    function () {
                        // Cancel if the popup has not displayed yet.
                        ClearPendingImagePopup();
                    });            

        }
    }

    
    Session.prototype.ToggleViewList = function() {
        if (this.ViewListOpen) {
            this.ViewListOpen = false;
            this.ViewList.slideUp();
            this.OpenCloseIcon.attr('src',"/webgl-viewer/static/"+"plus.png");
        } else {
            // Needed to display the waiting gif.
            this.UpdateGUI();
            // It is not necessary to request meta data because opening the
            // collection already requests session metadata.  However,
            // This method does nothing if the request has already been made,
            // And someone might call this directly.
            if (this.LoadState == LOAD_INITIAL) {
                // This should not be necessary
                this.RequestMetaData();
            }
            this.RequestImages();

            this.ViewListOpen = true;
            this.ViewList.slideDown();
            this.OpenCloseIcon.attr('src',"/webgl-viewer/static/"+"minus.png")
        }
    }

    // Value: boolean on, or false=>off
    Session.prototype.HighlightDropTargetItem = function(on) {
        if ( ! this.DropTargetItem) { return; }
        if (this.DropTargetItem == this.SessionLabel[0]) {
            if ( on ) {
                $(this.DropTargetItem).css({'background-color':'#BBF'});
            } else {
                $(this.DropTargetItem).css({'background-color':'#FFF'});
            }
            return;
        }
        if ( on ) {
            if (this.DropTargetBefore) {
                $(this.DropTargetItem).css({'border-left-color':'#333',
                                            'border-left-width':'4px'});
            } else {
                $(this.DropTargetItem).css({'border-right-color':'#333',
                                            'border-right-width':'4px'});
            }

        } else {
            $(this.DropTargetItem).css({'border-color':'#CCC',
                                     'border-width':'2'});
        }
    }

    Session.prototype.SetDropTargetItem = function(item, index, before) {
        // the item object changes.
        if (item) { item = item[0]; }

        if (this.DropTargetItem === item &&
            this.DropTargetBefore == before &&
            this.DropTargetIndex == index) {
            return;
        }

        this.HighlightDropTargetItem(false);
        this.DropTargetItem = item;
        this.DropTargetBefore = before;
        this.DropTargetIndex = index;
        this.HighlightDropTargetItem(true);
    }

    // Sets DropTargetItem and DropTargetBefore.
    // It also handles highlighting the drop target.
    // Returns true if drop target was found.
    Session.prototype.UpdateDropTarget = function(x,y) {
        // Check to see if the mouse is in the body
        var pos = this.Body.offset();
        var width = this.Body.innerWidth();
        if (width == 0) {
            // I cannot figure out why it is happening.
            return;
        }
        var height = this.Body.innerHeight();
        var rx = x - pos.left;
        var ry = y - pos.top;
        if (rx < 0 || ry < 0 || rx > width || ry > height) {
            // Mouse leaves the session.
            // Turn off the previous target.
            this.SetDropTargetItem();
            return false;
        }

        // Check for a drop in the session name.
        // This should fix the empty session bug (unable to drop).
        var pos = this.SessionLabel.offset();
        if (y > pos.top) {
            var bottom = pos.top + this.SessionLabel.innerHeight();
            if (y < bottom) {
                this.SetDropTargetItem(this.SessionLabel, 0);
                return true;
            }
        }

        // Now check the list items (views)
        // Find the closest item.
        var bestDist = 1000000;
        var bestItem;
        var bestIndex;
        var bestBefore = true;

        if (this.ViewListOpen) {
            this.ViewList.children('li').each(
                function (index, item) {
                    var pos = $(item).offset();
                    var dist = 0;
                    if (x < pos.left) { dist += pos.left - x; }
                    if (y < pos.top) { dist += pos.top - y; }
                    var right = pos.left + $(item).innerWidth();
                    var bottom = pos.top + $(item).innerHeight();
                    if (x > right) { dist += x - right; }
                    if (y > bottom) { dist += y - bottom; }
                    if ( ! $(item).data("selected") && dist < bestDist ) {
                        bestDist = dist;
                        bestItem = $(item);
                        bestBefore = x < (pos.left+right)*0.5;
                        bestIndex = index;
                        if ( ! bestBefore) { ++bestIndex;}
                    }
                });
        }

        // Planning on getting rid of the DropTargetBefore instance variable.
        // The index works, but how to determine highlighting?
        // The border is a bit of a hack. I should just put an item in the ul.
        this.SetDropTargetItem(bestItem, bestIndex, bestBefore);
        return true;
    }

    // Check to see if the session is the drop target.
    // Makes the drop if yes. (I could change this to "DropCheck".
    // This is called for every session in the browser.  It will fail for all but one.
    Session.prototype.Drop = function(x,y, copy) {
        if (this.UpdateDropTarget(x,y)) {
            console.log("Drop " + CLONES.length + " clones into " + this.Label);
            // Delete the clones
            for (var i = 0; i < CLONES.length; ++i) {
                var clone = CLONES[i];
                clone.remove();
            }
            CLONES = [];
            MESSAGE.hide();
            
            // Actually do the move
            this.SessionData.DropSelected(this.DropTargetIndex, copy, true);

            // Get rid of the thick border indicator of where the
            // drop will take place.
            this.SetDropTargetItem();

            return true;
        }
        return false;
    }

    // This appears to be a legacy method that is now only called when the undo
    // button is pressed. Actually, I do not think this is called at all.
    // Copy is set as a data in the <li> items
    Session.prototype.Save = function() {
        console.log("Session.Save:  a method I thought was depreciated was called.")
        if ( ! this.Modified) {
            return;
        }
        this.modified = false;

        if (this.LoadState != LOAD_METADATA_LOADED &&
            this.LoadState != LOAD_IMAGES ) {
            alert("Error Save: Session not loaded.");
            return;
        }

        var views = [];
        this.ViewList.children('li').each(function () {
            var view = {
                'label' : $('div',this).text(),
                'imgdb' : $(this).data('imgdb'),
                'img'   : $(this).data('imgid'),
                'view'  : $(this).data('viewid'),
                'copy'  : $(this).data('copy')
            };
            if (view.copy) {
                this.SaveLock = true;
            }

            var viewId = $(this).attr('view');
            if (viewId && viewId != "") {
                view.view = viewId;
            }
            views.push(view);
        });

        // Save the new order in the database.
        // Python will have to detect if any view objects have to be deleted.
        var args = {};
        args.views = views;
        args.session = this.Id;
        args.label = this.SessionLabel.text();

        var self = this;
        PushProgress();
        $.ajax({
            type: "post",
            url: "/session-save",
            data: {"input" :  JSON.stringify( args )},
            success: function(data) {
                PopProgress();
                // If copy, view ids have changed.
                self.UpdateViewIds(data);
                self.SaveLock = false;
            },
            error:   function() {
                PopProgress();
                console.log( "AJAX - error: session-save (collectionBrowser)" );
            }
        });

        // Update the other browser.
        var collectionIdx = this.Collection.CollectionIndex;
        // Browser index is different, but al the others are the same.
        var browserIdx = (this.Collection.Browser.BrowserIndex+1)%2;
        var otherSession = 
            BROWSERS[browserIdx].Collections[collectionIdx].Sessions[this.SessionIndex];
        if (otherSession.LoadState == LOAD_METADATA_WAITING ||
            otherSession.LoadState == LOAD_METADATA_LOADED) {
            // What to do?
            otherSession.RequestMetaData();
        } if (otherSession.LoadState == LOAD_IMAGES) {
            otherSession.RequestMetaData();
            /* this messed up the layout for some reason  needs a clear.
            // Lets just copy / clone this session
            otherSession.ViewList.empty();
            this.ViewList.children('li').each(function () {
                viewItem = $(this).clone(true);
                viewItem
                    .data("browserIdx", browserIdx)
                    .appendTo(otherSession.ViewList);
            });
            */
        }
    }

    
//==============================================================================
    var DROP_TARGETS = [];
    // This is called to start dragging the selected views.
    // The selected views have been stored in the global "SELECTED"
    // It sets up the clone items that follow the mouse.
    function StartViewDrag(event) {
        var copy = (event.which == 3) || event.ctrlKey;

        if (SELECTED.length == 0) {
            return;
        }
        console.log("StartDrag with " + SELECTED.length + " items")
      
        var x = event.clientX;
        var y = event.clientY;

        // Gray out the selected items and make clones for dragging.
        for (var i = 0; i < SELECTED.length; ++i) {
            var source = SELECTED[i].Item;
            var clone = source
                .clone(false)
                .appendTo('body')
                .css({'position':'fixed',
                      'left': (x - 10*i),
                      'top' : (y - 10*i),
                      'margin': 0});
            CLONES.push(clone);

            // Change the original div to a placeholder.
            if ( ! copy) {
                source.children().css({'opacity':'0.2'});
            }
        }
        if (copy) {
            MESSAGE.text("Copy");
        } else {
            MESSAGE.text("Move");
        }
        MESSAGE.show()
            .css({'left': (x-40),
                  'top' : (y-40)});


        // Setup the events for dragging.
        $('body')
            .mousemove(
                function(event) {
                    event.preventDefault();
                    ViewDrag(event);
                    return false;
                })
            .mouseup(
                function(event) {
                    event.preventDefault();
                    $(this).unbind('mousemove');
                    $(this).unbind('mouseup');
                    $(this).unbind('mouseleave');
                    $(this).unbind('oncontextmenu');
                    ViewDrop(event);
                    SCROLLING_BODY = null;
                    return false;
                })
            .mouseleave(
                function(event) {
                    $(this).unbind('mousemove');
                    $(this).unbind('mouseup');
                    $(this).unbind('mouseleave');
                    $(this).unbind('oncontextmenu');
                    ViewDrop(event);
                    SCROLLING_BODY = null;
                    return false;
                });

        ClearPendingImagePopup();
        return false;
    }

    function ViewDrag(event) {
        var copy = (event.which == 3) || event.ctrlKey;
        if (copy) {
            MESSAGE.text("Copy");
        } else {
            MESSAGE.text("Move");
        }

        var x = event.clientX;
        var y = event.clientY;
        for (var i = 0; i < CLONES.length; ++i) {
            var clone = CLONES[i];
            clone
                .css({'left': x-20 - 10*i,
                      'top' : y-20 - 10*i});
        }
        MESSAGE
            .css({'left': x-40,
                  'top' : y-40});

        ManageDragScroll(x,y);

        // Indicate where the items would be dropped.
        for (var i = 0; i < DROP_TARGETS.length; ++i) {
            DROP_TARGETS[i].UpdateDropTarget(x, y);
        }
    }

    var SCROLLING_BODY = null;
    var SCROLLING_DIRECTION = 0;
    var SCROLLING_INTERVAL = null;
    var SCROLLING_HEIGHT = 80;
    function ManageDragScroll(x, y) {
        // Which browser is the mouse over?
        var pos, found = null;
        for (var i = 0; i < BROWSERS.length && ! found; ++i) {
            var body = BROWSERS[0].CollectionItemList;
            pos = body.offset();
            if (x > pos.left && y > pos.top) {
                if (x < pos.left + body.width() &&
                    y < pos.top + body.height()) {
                    found = body;
                }
            }
        }
        x = x - pos.left;
        y = y - pos.top;

        // Handle choosing the direction.
        SCROLLING_DIRECTION = 0;
        if (found) {
            if (y < SCROLLING_HEIGHT) {
                SCROLLING_DIRECTION = y-SCROLLING_HEIGHT;
            } else if (y > found.height() - SCROLLING_HEIGHT) {
                SCROLLING_DIRECTION = y-found.height()+SCROLLING_HEIGHT;
            } else {
                found = null;
            }
        }

        if (SCROLLING_BODY == found) {
            // Nothing has changed.
            return;
        }
        SCROLLING_BODY = found;

        if (SCROLLING_BODY &&  ! SCROLLING_INTERVAL) {
            // Add a new scrolling interval.
            SCROLLING_INTERVAL = setInterval(function() {
                if (SCROLLING_BODY) {
                    var y = SCROLLING_BODY.scrollTop();
                    SCROLLING_BODY.scrollTop(y+SCROLLING_DIRECTION);
                } else {
                    clearInterval(SCROLLING_INTERVAL);
                    SCROLLING_INTERVAL = null;
                }
            }, 100);
            return;
        }
    }



    function ViewDrop(event) {
        var copy = (event.which == 3) || event.ctrlKey;
        var x = event.clientX;
        var y = event.clientY;
        // Look through all open sessions to see if we dropped in one.
        for (var i = 0; i < DROP_TARGETS.length; ++i) {
            var destinationSession = DROP_TARGETS[i];
            if (destinationSession.Drop(x, y, copy)) {
                // Found the drop session.  Drop does all the shuffling.
                return true;
            }
        }
        // No drop destination, undo the drag / move.
        for (var i = 0; i < CLONES.length; ++i) {
            var clone = CLONES[i];
            clone.remove();
        }
        CLONES = [];
        MESSAGE.hide();
        for (var i = 0; i < SELECTED.length; ++i) {
            SELECTED[i].Item.children().css({'opacity':'1.0'});
        }
        console.log("Could not find drop target.");    
        return false;
    }

    function AddDropTarget(dropTarget) {
        DROP_TARGETS.push(dropTarget);
    }

    function RemoveDropTarget(dropTarget) {
        var idx = DROP_TARGETS.indexOf(dropTarget);
        if (idx > -1) {
            DROP_TARGETS.splice(idx,1);
        }
    }


//==============================================================================
    var POPUP_TIMER_ID = 0;
    var POPUP_IMAGE = undefined;
    var POPUP_SOURCE_IMAGE;
    function ScheduleImagePopup(img) {
        // Clear any previous timer
        HideImagePopup();
        POPUP_TIMER_ID = window.setTimeout(function(){ShowImagePopup(img);}, 2000);
    }
    function ClearPendingImagePopup() {
        if (POPUP_TIMER_ID) {
            window.clearTimeout(POPUP_TIMER_ID);
            POPUP_TIMER_ID = 0;
        }
    }
    function HideImagePopup () {
        ClearPendingImagePopup();
        if (POPUP_IMAGE) {
            //POPUP_IMAGE.css({'height':'32px'});
            POPUP_IMAGE.remove();
            POPUP_IMAGE = undefined;
        }
    }
    function ShowImagePopup (img) {
        POPUP_SOURCE_IMAGE = img;
        var pos = img.offset();
        POPUP_IMAGE = img.clone(false);
        POPUP_IMAGE
            .appendTo('body')
            .hide()
            .css({
                'z-index':'500',
                'position':'fixed',
                'height': img[0].naturalHeight,
                'left' : pos.left,
                'top' : pos.top,
                'border': '2px solid #CCC'});
        POPUP_IMAGE
            .slideDown()
            .mouseleave(
                function () {
                    HideImagePopup();
                })
            .mousemove(
                function (event) {
                    var height = POPUP_SOURCE_IMAGE.height();
                    var width = POPUP_SOURCE_IMAGE.width();
                    if (event.offsetX < 0 || event.offsetY < 0 ||
                        event.offsetX > width || event.offsetY > height) {
                        HideImagePopup();
                    }

                });

    }





    // Export this CollectionBrowser object.
    return CollectionBrowser;
})(); // End of closure namespace

