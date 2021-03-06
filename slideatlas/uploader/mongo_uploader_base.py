# base_uploader

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../..")
from slideatlas import create_app
from slideatlas.models import Collection, Session, View

import logging
logger = logging.getLogger('slideatlas')

import pymongo
from bson.objectid import ObjectId, InvalidId

from slideatlas.ptiffstore import PilReader
from slideatlas.ptiffstore.reader_factory import ReaderFactory

# Construct image factory
# Possibly belongs during worker creation and not here
factory = ReaderFactory()


# Create teh application objects
__all__ = ('MongoUploader', )


class MongoUploader(object):
    """
    Define common interface to interact with slide-atlas models
    Subclasses define
    """
    def __init__(self, args):
        """
        Common initialization
        """

        """ Id of the image collection to write to. It is not set initially
            but the init process will set it according to input parameter
        """
        self.imageid = None
        self.args = args
        self.flaskapp = create_app()
        self.upload()

    def upload(self):
        """
        Implements basic workflow for interpreting arguments and uploading
        """

        # Locate the destination
        try:
            if self.args["mongo_collection"]:
                # Remove any image object and collection of that name
                self.imageid = ObjectId(self.args["mongo_collection"])
                logger.info('Using specified ImageID: %s', self.imageid)
            else:
                self.imageid = ObjectId()
                logger.info('Using new ImageID: %s', self.imageid)

        except InvalidId:
            logger.error('Invalid ObjectID for mongo collection: %s',
                         self.args['mongo_collection'])

        # Load image store
        self.setup_destination()

        # Check whether image exists already
        image_name = os.path.split(self.args["input"])[1]
        image_doc = self.db["images"].find_one({"filename": image_name})

        if image_doc is not None:
            logger.info('Image exists already')

            # Should we cleanup the image_store ?
            if not self.args["overwrite"]:
                logger.info('Image will be skipped')
                return
            else:
                logger.info('Image will be remove')
                self.imagestore.remove_image(image_doc["_id"])
        else:
            logger.info('Image will be uploaded')

        # Load reader
        self.reader = self.make_reader()

        # Insert image record
        self.insert_metadata()

        # Upload base / level
        self.upload_base()

        # build pyramid
        self.update_collection()

        # Done !
    def update_collection(self):
        """
        Update the collection

        i.e. Create a view, add the view to the session
        expects imagestore and db to be setup
        """

        if self.args["dry_run"]:
            logger.info('Dry run .. not updating collection record')
            return

        # Update the session
        with self.flaskapp.app_context():
            # Create and insert view
            self.new_view = View(ViewerRecords=[{'Image': ObjectId(self.imageid), 'Database': self.imagestore.id}])
            self.new_view.save()

            # Insert the view at the top of current views
            self.session.views.insert(0, self.new_view.id)
            self.session.save()

    def make_reader(self):
        """
        Will not be implemented in the base uploader class
        """
        #todo: choose the reader here
        reader = factory.open(self.args["input"], self.args["extra"])
        if reader is not None:
            return reader
        else:
            raise Exception("Unknown file format")

    def upload_base(self):
        """
        Will not be implemented in the base uploader class
        """
        logger.error('upload_base is NOT implemented')
        sys.exit(-1)

    def setup_destination(self):
        """
            Get the destination session in the collection
        """
        with self.flaskapp.app_context():
            # Locate the session

            self.coll = Collection.objects.get(id=ObjectId(self.args["collection"]))
            # logger.info('collection: %s', self.coll.to_son())

            self.imagestore = self.coll.image_store
            # logger.info('imagestore: %s', self.imagestore.to_son())

            self.session = Session.objects.get(id=ObjectId(self.args["session"]))
            # logger.info('session: %s', self.session.to_son())

        # Create the pymongo connection, used for image
        # For view use View
        try:
            if self.imagestore.replica_set:
                conn = pymongo.ReplicaSetConnection(self.imagestore.host, replicaSet=self.imagestore.replica_set)
            else:
                conn = pymongo.MongoClient(self.imagestore.host)

            self.db = conn[self.imagestore.dbname]
            self.db.authenticate(self.imagestore.username, self.imagestore.password)
            self.destination = self.db[str(self.imageid)]
        except Exception as e:
            logger.error('Unable to connect to imagestore for inserting tiles: %s', e.message)
            sys.exit(-1)

    def insert_metadata(self):
        """
        Inserts the created image metadata object if the flags permit
        and connection established

        Expects self.imagestore and self.reader to be set
        """

        if self.imagestore is None:
            logger.error('Imagestore not set')
            sys.exit(-1)

        with self.flaskapp.app_context():
            with self.imagestore:
                # For now use pymongo
                image_doc = {}
                image_doc["filename"] = self.reader.name
                image_doc["label"] = self.reader.name
                image_doc["origin"] = self.reader.origin
                image_doc["spacing"] = self.reader.spacing
                image_doc["dimensions"] = [self.reader.width, self.reader.height]
                image_doc["levels"] = self.reader.num_levels
                image_doc["components"] = self.reader.components
                image_doc["TileSize"] = self.args["tilesize"]

                paddedHeight = 256 << (image_doc["levels"]-1)
                image_doc["bounds"] = [0, image_doc["dimensions"][0], paddedHeight-image_doc["dimensions"][1], paddedHeight]

                image_doc["metadataready"] = True
                image_doc["_id"] = self.imageid

                if self.args["dry_run"]:
                    logger.info('Dry run .. not creating image record: %s', image_doc)
                else:
                    self.db["images"].insert(image_doc)
