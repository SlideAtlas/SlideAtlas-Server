__author__ = 'dhanannjay.deo'

import flask
from flask import request

import os
import logging

from common_utils import get_max_depth

logger = logging.getLogger('slideatlas')
app = flask.Flask(__name__)

@app.route('/')
def index():

    # return "Helllo"
    return flask.send_from_directory("static","index.html")


# ##############################3
# # for loading tiles

# import pymongo

# app.config.from_object("config")
# # Connection settings for local demo database for testing (VM)
# conn = pymongo.MongoClient(app.config["MONGO_SERVER"], tz_aware=False, auto_start_request=False)
# admindb = conn["admin"]
# imgdb = conn["demo"]
# colImage = imgdb["531656dea86480a4e608caf9"]

# if app.config["LOGIN_REQUIRED"]:
#     admindb.authenticate(app.config["USERNAME"], app.config["PASSWORD"])

# from common_utils import get_tile_name_slideatlas
# blank = open("blank_512.jpg","rb").read()

# @app.route("/tile_mongo")
# def tile_mongo():
#     # Get variables
#     x = int(request.args.get('x', 0))
#     y = int(request.args.get('y', 0))
#     z = int(request.args.get('z', 0))

#     # Locate the tilename from x and y
#     locx = x * 512
#     locx = x * 512

#     docImage = colImage.find_one({'name': get_tile_name_slideatlas(x,y,z)})
#     logger.error(get_tile_name_slideatlas(x, y, z))
#     if docImage == None:
#         return flask.Response(blank, mimetype="image/jpeg")
#     return flask.Response(str(docImage['file']), mimetype="image/jpeg")


os.environ['PATH'] = os.path.dirname(__file__) + ';' + os.environ['PATH']

# # myfname = "d:\\data\\phillips\\20140313T180859-805105.ptif"
# myfname = "/home/dhan/data/phillips/20140313T180859-805105.ptif"

import StringIO

from reader_cache import make_reader


@app.route("/apiv1/slides/<fname>/<x>/<y>/<z>")
def tile_ptiff(fname,x,y,z):
    """
    Serves tiles for fname at zoom level z and tiles col / row x, y
    """

    # Get variables
    x = int(x)
    y = int(y)
    z = int(z)

    tiffpath = os.path.join(app.config["FILES_ROOT"], fname)

    reader = make_reader({"fname" : tiffpath, "dir" : z})
    logger.info('Viewing fname: %s', fname)

    # Locate the tilename from x and y
    locx = x * reader.tile_width + 5
    locy = y * reader.tile_height + 5


    fp = StringIO.StringIO()
    r = reader.dump_tile(locx,locy, fp)

    try:
        r = reader.dump_tile(locx,locy, fp)
        if r > 0:
            logger.error('Read %d bytes', r)
        else:
            raise Exception("Tile not read")

    except Exception as e:
        #docIma ge = colImage.find_one({'name': get_tile_name_slideatlas(x,y,z)})
        logger.error('Tile not loaded: %s', e.message)
        fp.close()
        return flask.Response("Tile not available", 404)

    # s = fp.getvalue()
    # logger.error('Got %d bytes in buffer', len(s))
    # fp2 = open("test_output.jpg","wb")
    # fp2.write(fp.getvalue())
    # fp2.close()
    return flask.Response(fp.getvalue(), mimetype="image/jpeg")

from werkzeug.routing import BaseConverter

class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]

import base64
app.url_map.converters['regex'] = RegexConverter

@app.route('/apiv1/slides/<fname>/<regex("(label|macro)"):itype>/')
def example(fname, itype):
    """
    Returns label or macro image from associated file
    """
    # See if label name exists
    tiffpath = os.path.join(app.config["FILES_ROOT"], fname)
    oimagepath = tiffpath + "." + itype + ".jpg"

    logger.info('Getting fname: %s, itype: %s', fname, itype)

    if not os.path.exists(oimagepath):
        logger.info('Computing fname: %s, itype: %s', fname, itype)
        reader = make_reader({"fname" : tiffpath, "dir" : 0})
        reader.set_input_params({ "fname" : tiffpath })
        fout = open(oimagepath, "wb")
        fout.write(base64.b64decode(reader.get_embedded_image(itype)))
        fout.close()

    fin = open(oimagepath,"rb")
    return flask.Response(fin.read(), mimetype="image/jpeg")

import glob
@app.route('/apiv1/slides')
def slidelist():
    """
    return a json list describing files in FILES_ROOT
    """
    slides = []
    searchpath = os.path.join(app.config["FILES_ROOT"], "*.ptif")
    logger.info(searchpath)
    for aslide in glob.glob(searchpath):
        barcodepath = aslide + "." + "bc"
        # logger.info('Getting fname: %s, itype: %s', aslide, 'barcode')

        if not os.path.exists(barcodepath):
            # logger.info('Computing fname: %s, itype: %s', aslide, itype)
            reader = make_reader({"fname" : aslide, "dir" : 0})
            reader.set_input_params({ "fname" : aslide })
            reader.parse_image_description()
            fout = open(barcodepath, "w")
            fout.write(reader.barcode)
            fout.close()

        fin = open(barcodepath,"r")


        obj = {}
        obj["name"] = os.path.split(aslide)[1]
        obj["barcode"] = fin.read()
        slides.append(obj)

    return flask.jsonify({"slides" : slides})

@app.route('/ptiff-viewer')
def viewer():
    """
    Creates meta information for the viewer
    """

    fname = request.args.get('image', '')

    tiffpath = os.path.join(app.config["FILES_ROOT"], fname)
    logger.info('Viewing fname: %s', fname)

    if not os.path.exists(tiffpath):
        logger.info('Unknown file: %s', fname)
        return flask.Response('Unknown image, please click here to go <a href="/"> back </a>', 403)

    reader = make_reader({ "fname" : tiffpath , "dir" : 0})
    meta = {}
    meta["height"] = reader.height
    meta["width"] = reader.width
    meta["levels"] = get_max_depth(reader.width, reader.height, tilesize=reader.tile_width)
    meta["name"] = fname
    meta["tilesize"] = reader.tile_width

    return flask.render_template("viewer.html", meta=meta)
