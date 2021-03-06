"""
rest api for administrative interface
refer to documentation
"""
from flask import Blueprint, render_template, request, Response, abort, current_app
from flask.views import MethodView
from bson import ObjectId
from slideatlas.common_utils import jsonify
from gridfs import GridFS
from slideatlas import models, security

mod = Blueprint('api', __name__,
                url_prefix="/apiv1",
                template_folder="templates",
                static_folder="static",
                )

# The url valid for databases, rules and users with supported queries
class AdminDBAPI(MethodView):
    decorators = []

    @security.AdminSiteRequirement.protected
    def get(self, restype, resid=None):
        """
        Get restype with resid ['users'], if resid is not supplied, returns a list
        """
        admin_db = models.ImageStore._get_db()
        # Restype has to be between allowed ones or the request will not come here
        if resid == None:
            objs = admin_db[restype].find()
            # TODO: need to paginate in near future
            objarray = list()
            for anobj in objs:
                # Filter the list with passwd if type is user
                if restype == "users":
                    if "passwd" in anobj:
                        del anobj["passwd"]
                objarray.append(anobj)
            return jsonify({ restype : objarray})
        else:
            obj = admin_db[restype].find_one({"_id" : ObjectId(resid)})
            if obj :
                if restype == "users":
                    if "passwd" in obj:
                        del obj["passwd"]

                return jsonify(obj)
            else:
                return Response("{\"error\" : \"resource not found\"}" , status=405)


# The urls for getting users for rules, posting grant / revoke etc
class AdminDBItemsAPI(MethodView):
    decorators = []

    @security.AdminSiteRequirement.protected
    def get(self, restype, resid, listtype):
        admin_db = models.ImageStore._get_db()
        # Restype has to be between allowed ones or the request will not come here
        # only rules and users is supported now

        # create a new user
        result = {}
        result["query"] = { "restype" : restype, "resid" : resid, "listtype" : listtype}

        if restype not in ["rules"] or listtype not in ["users"]:
            return Response("{\"error\" : \"Only restype itemtype supported is rules, users\"}" , status=405)

        # ruleobj or dbobj
        objarray = list()
        for anobj in admin_db[listtype].find({"rules" : ObjectId(resid)}):
            if "passwd" in anobj:
                del anobj["passwd"]
            objarray.append(anobj)
        result[listtype] = objarray
        return jsonify(result)

    def post(self, restype, resid, listtype):
        # create a new user
        obj = {}
        obj["query"] = { "restype" : restype, "resid" : resid, "listtype" : listtype}

        return jsonify(obj)

# The url valid for databases, rules and users with supported queries

class DatabaseAPI(AdminDBAPI):
    decorators = [security.AdminSiteRequirement.protected]

    def delete(self, resid):
        obj = models.ImageStore.objects.with_id(ObjectId(resid))

        if obj :
            obj.delete()
            return Response("{}", status=200)
        else:
            # Invalid request if the object is not found
            return Response("{\"error\" : \"Id Not found: %s\"} "%(resid), status=405)


    def post(self, resid=None):
        # post requires admin access

        # Parse the data in json format
        data = request.json

        # Unknown request if no parameters
        if data == None:
            abort(400)

        # Only insert command is supported
        if data.has_key("insert"):
            # Create the database object from the supplied parameters

            try:
                if resid is not None:
                    raise Exception("Trying to create new resource at existing resource")

                database = models.ImageStore(
                    label=data["insert"]["label"],
                    host=data["insert"]["host"],
                    dbname=data["insert"]["dbname"],
                    copyright=data["insert"]["copyright"]
                )
                database.save()
            except Exception as inst:
                # If valid database object cannot be constructed it is invalid request
                return Response("{\"error\" : \"%s\"}" % str(inst), status=405)

            return jsonify(database.to_mongo())
        elif data.has_key("modify"):
            # Resid must be supplied
            if resid is None :
                return Response("{\"error\" : \"No resource id supplied for modification\"}" , status=405)

            try:
                # Locate the resource
                database = models.ImageStore.objects.with_id(resid)
                if database == None:
                    raise Exception(" Resource %s not found" % (resid))
            except Exception as inst:
                # If valid database object cannot be constructed it is invalid request
                return Response("{\"error\" : \"%s\"}" % str(inst), status=405)

            # Now update
            try:
                for akey in data["modify"]:
                    if akey == "_id":
                        return Response("{\"error\" : \"Cannot modify _id \"}" , status=405)

                    # Update other keys
                    if akey in database:
                        try:
                            setattr(database, akey, data["modify"][akey])
                        except AttributeError:
                            pass

                    database.save()
            except Exception as inst:
                # If valid database object cannot be constructed it is invalid request
                return Response("{\"error\" : \"%s\"}" % str(inst), status=405)

            return jsonify(database.to_mongo())

        elif data.has_key("sync"):
            """
            supported for ptiffstore
            """

            if resid is None :
                return Response("{\"error\" : \"No store id supplied for synchronization\"}" , status=405)

            # Locate the resource
            obj = models.ImageStore.objects.with_id(ObjectId(resid))

            if obj == None:
                # Invalid request if the object is not found
                return Response("{\"error\" : \"Id Not found: %s\"} "%(resid), status=405)

            if obj._cls != "ImageStore.MultipleDatabaseImageStore.PtiffImageStore":
                return Response("{\"error\" : \"Sync for %s is not defined\"} "%(obj._cls), status=405)

            resp = {}
            if "re" in data and data["re"]:
                resp["syncresults"] = obj.resync()
            else:
                resp["syncresults"] = obj.sync()
            resp["database"] = obj.to_mongo()

            return jsonify(resp)

        else:
            # Only insert and modify commands supported so far
            abort(400)


    def put(self, resid):
        # put requires admin access

        # Get json supplied
        data = request.json

        # Check for valid parameters
        # Check if no parameters
        if data is None:
            return Response("{\"error\" : \"No parameters ? \"}", status=405)

        # See if id matches the resource being modified
        try:
            if data["_id"] != resid:
                raise Exception(1)
        except:
            return Response("{\"error\" : \"_id mismatch with the location in the url \"}", status=405)

        # The object should exist
        for anobj in models.ImageStore.objects:
            current_app.logger.debug('%s %s', anobj.label, anobj.id)

        database = models.ImageStore.objects.with_id(ObjectId(data["_id"]))

        current_app.logger.debug('ID: %s %s', data['_id'], ObjectId(data['_id']))
        # Unknown request if no parameters
        if database == None:
            return Response("{\"error\" : \"Resource _id: %s  doesnot exist\"}" % (resid), status=403)

        # Create the database object from the supplied parameters
        try:
            database.label = data["label"]
            database.host = data["host"]
            database.dbname = data["dbname"]
            database.copyright = data["copyright"]
            database.username = data["username"]
            database.password = data["password"]
            if database._cls == "TileStore.Database.PtiffTileStore":
                database.root_path = data["root_path"]

            # Add additional fields
            if "_cls" in data:
                current_app.logger.debug('%s', data['_cls'])

            database.save()
        except Exception as inst:
            # If valid database object cannot be constructed it is invalid request
            return Response("{\"error\" : %s}" % str(inst), status=405)



        return jsonify(database.to_mongo())

mod.add_url_rule('/databases', view_func=DatabaseAPI.as_view("show_database_list"), methods=['post'])
mod.add_url_rule('/databases/<regex("[a-f0-9]{24}"):resid>', view_func=DatabaseAPI.as_view("show_database"), methods=['DELETE', 'put', 'post'])

mod.add_url_rule('/<regex("(databases|users|rules)"):restype>', defaults={"resid" : None}, view_func=AdminDBAPI.as_view("show_resource_list"), methods=['get'])
mod.add_url_rule('/<regex("(databases|users|rules)"):restype>/<regex("[a-f0-9]{24}"):resid>', view_func=AdminDBAPI.as_view("show_resource"))

mod.add_url_rule('/<regex("(databases|users|rules)"):restype>/<regex("[a-f0-9]{24}"):resid>/<regex("(users)"):listtype>', view_func=AdminDBItemsAPI.as_view("show_resource_list_or_post"), methods=["get", "post"])


# The url valid for databases, rules and users with supported queries
class DataSessionsAPI(MethodView):
    decorators = [security.login_required]
    def get_data_db(self, dbid):
        database = models.ImageStore.objects.with_id(dbid)
        if database == None:
            return None
        return database

    def get(self, dbid, sessid=None):
        """
        Gets details of a session if sessid is specified, or gets a list of sessions otherwise
        Also provides thumbnails if thumb=true in the query string
        """
        get_thumbs = bool(request.args.get("thumb","0"))

        database = self.get_data_db(dbid)
        if database == None:
            return Response("{ \"error \" : \"Invalid database id %s\"}" % (dbid), status=405)
        datadb = database.to_pymongo(raw_object=True)

        if sessid == None:
            sessionlist = list()
            sessions = models.Session.objects(image_store=database).exclude("images","attachments", "views")

            for asession in sessions:
                sessionlist.append(asession.to_mongo())

            if len(sessionlist) > 0:
                return jsonify({'sessions' : sessionlist})
            else:
                return jsonify({'sessions' : sessionlist, "error" : "You want You want a list of sessions in %s, but there are no sessions in it" %(dbid)})
        else:
            # Get and return a list of sessions from given database
            # TODO: Filter for the user that is requesting
            sessobj = models.Session.objects.with_id(sessid)
            if sessobj == None:
                return Response("{ \"error \" : \"Session %s does not exist in db %s\"}" % (sessid, dbid), status=405)

            views_response = list()
            # Dereference the views
            for aview in sessobj.views:
                viewdetails = datadb["views"].find_one({"_id" : aview})
                # Viewdetails might not be a view

                if type(viewdetails) == type({}):
                    if "img" in viewdetails:
                        # Do not dereference image as yet
                        viewdetails["image"] = viewdetails["img"]
                        imgobj =  datadb["images"].find_one({"_id" : viewdetails["img"]}, { "thumb" : 0})
                        if imgobj != None:
                            viewdetails["Title"] = imgobj["label"]
                    else:
                        if "ViewerRecords" in viewdetails:
                            if type(viewdetails["ViewerRecords"][0]["Image"]) == type({}):
                                viewdetails["image"] = viewdetails["ViewerRecords"][0]["Image"]["_id"]
                            else:
                                viewdetails["image"] = viewdetails["ViewerRecords"][0]["Image"]

                    views_response.append(dict(
                        details=viewdetails,
                        **(aview.to_mongo())
                    ))

            # Dereference the attachments
            attachments_response = []
            if sessobj.attachments:
                gfs = GridFS(datadb, "attachments")
                for anattach in sessobj.attachments:
                    fileobj = gfs.get(anattach["ref"])
                    attachments_response.append(dict(
                        details={'name': fileobj.name, 'length' : fileobj.length},
                        **(anattach.to_mongo())
                    ))

            session_response = sessobj.to_mongo()
            session_response['views'] = views_response
            session_response['attachments'] = attachments_response

            return jsonify(session_response)


    def delete(self, dbid, sessid=None):
        """
        cdGets details of a session if sessid is specified, or gets a list of sessions otherwise
        """
        database = self.get_data_db(dbid)
        if database == None:
            return Response("{ \"error \" : \"Invalid database id %s\"}" % (dbid), status=405)

        if sessid == None:
            return Response("{ \"error \" : \"No session to delete\"}", status=405)
        else:
            # TODO: Important, Not all users are allowed to delete
            sessobj = models.Session.objects.with_id(sessid)

            if sessobj:
                # Delete if empty
                empty = True

                if sessobj.images:
                    empty = False

                if sessobj.attachments:
                    empty = False

                if not empty:
                    return Response("{ \"error \" : \"Session %s in db %s not empty\"}" % (sessid, dbid), status=405)
                else:
                    # Perform the delete
                    try:
                        sessobj.delete()
                        current_app.logger.debug('DELETED from application')
                    except Exception as inst:
                        return Response("{\"error\" : %s}" % str(inst), status=405)
                    # TODO: How to return success?
                    return Response("{}")
            else:
                return Response("{ \"error \" : \"Session %s does not exist in db %s\"}" % (sessid, dbid), status=405)

    def post(self, dbid, sessid=None):
        # Parse the data in json format
        data = request.json

        # Unknown request if no parameters
        if data == None:
            abort(400)

        db = self.get_data_db(dbid)
        if data.has_key("insert"):
            # Create the database object from the supplied parameters
            try:
                newsession = models.Session(image_store=db, label=data["insert"]["label"])
                newsession.save()
            except Exception as inst:
                # If valid database object cannot be constructed it is invalid request
                return Response("{\"error\" : %s}" % str(inst), status=405)

            return jsonify(newsession)

        elif data.has_key("modify"):
            # Resid must be supplied
            if sessid == None :
                return Response("{\"error\" : \"No session _id supplied for modification\"}" , status=405)

            try:
                # Locate the resource
                newdb = models.Session.objects.with_id(sessid)
                if newdb == None:
                    raise Exception(" Resource %s not found" % (sessid))
            except Exception as inst:
                # If valid database object cannot be constructed it is invalid request
                return Response("{\"error\" : \"%s\"}" % str(inst), status=405)

            # Now update
            try:
                for akey in data["modify"]:
                    # Presently updating only label is supported
                    if akey != "label":
                        return Response("{\"error\" : \"Cannot modify %s \"}" % (akey) , status=405)

                    setattr(newdb, akey, data["modify"][akey])
                    newdb.save()
            except Exception as inst:
                # If valid database object cannot be constructed it is invalid request
                return Response("{\"error\" : \"%s\"}" % str(inst), status=405)

            return jsonify(newdb.to_mongo())

        else:
            # Only insert and modify commands are supported
            abort(400)


# For a list of resources within session
mod.add_url_rule('/<regex("[a-f0-9]{24}"):dbid>'
                                '/sessions'
                                '/<regex("[a-f0-9]{24}"):sessid>'
                                , view_func=DataSessionsAPI.as_view("show_session"),
                                methods=["get", "delete", "post"])

# For a list of resources within session
mod.add_url_rule('/<regex("[a-f0-9]{24}"):dbid>'
                                '/sessions'
                                , view_func=DataSessionsAPI.as_view("show_sessions"),
                                methods=["get", "post"])






# Specially for session

# Render admin template
@security.AdminSiteRequirement.protected
@mod.route('/admin')
def admin_main():
    """
    Single page application with uses this rest API to interactively do tasks
    """
    return Response(render_template("admin.html"))

@security.AdminSiteRequirement.protected
@mod.route('/mysessions')
def admin_main_sessions():
    """
    Single page application with uses this rest API to interactively do tasks
    """
    return Response(render_template("fullsessions.html"))
