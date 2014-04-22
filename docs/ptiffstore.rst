Pyramidal Tiff Store
====================

Slide atlas is able to access pyramidal tiles directly coming from Philips scanner.

The difference with MongoTileStore is

- Naming convention, the tiles in pyramidal tiff;s are rather accessed by x,y,zoom than in the format "tt.jpg". There is
conversion available though.

- A macro image can be downloaded from the store, also the label image can be created by combining with barcode

- The Store object AKA databases object contains additional fields such as last sync, and endpoint to fetch tiles



TileStore endpoint proposal
===========================

Tile servers should not go without authentication, but now they will.

Serves tiles from given imageid and tile-name or tile parameters.

.. warning::
    todo:
    A ptiffserver endponint will be included in the slideatlas source code. A separate run command might be able to run just the tile server
    API and not entire webapp.

 .. note::
    When the first request is arrived, checks whether the user is logged in by making an api call to the central server and whether the access


Pyramidal TIFF endpoint proposal
================================

A different run_ptiffserver.py is required for running the endpoint


Supports API for

- Resynchronize the database : Reads updated files, uses celery

- Gets a tile

-


The end point will support following api


Tile Store
==========

- Needs to know the location of the folder where its going to keep the incoming files
- Needs to know last sync
- Should be able to sychronize the files and remove records for non-existing ones
- Upload files there


Some other
----------


API documentation
=================

.. automodule:: slideatlas.ptiffstore.asset_store
  :members:
  :undoc-members: