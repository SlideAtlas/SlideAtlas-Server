import os
import sys
import logging
from bson import ObjectId

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tests.ptiff")
logger.setLevel(logging.INFO)

slideatlaspath = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.append(slideatlaspath)

from slideatlas.ptiffstore.tiff_reader import TileReader

try:
    DATA_ROOT = os.environ["SLIDEATLAS_TEST_DATA_ROOT"]
except:
    logger.error("Fatal: SLIDEATLAS_TEST_DATA_ROOT not set")
    sys.exit(0)

def examine_ptif(path):
    reader = TileReader()
    reader.set_input_params({'fname' : path})
    reader.parse_image_description()
    logger.info("Width: %s"%reader.width)
    logger.info("Height: %s"%reader.height)
    logger.info("TileSize: %d"%reader.tile_width)
    logger.info("Barcode: %s"%reader.barcode)
    label = reader.get_embedded_image('label')
    if label == None:
        logger.info("NO Label")
    else:
        logger.info("Label found")

    macro = reader.get_embedded_image('macro')
    if label == None:
        logger.info("NO Macro")
    else:
        logger.info("Macro found")
    # logger.info("Components: %s"%reader.components)
    return reader


def test_ptif_from_philips():
    examine_ptif(DATA_ROOT + "/ptif-philips/20140721T182320-963749.ptif")


def test_tif_from_zeiss():
    examine_ptif(DATA_ROOT + "/ptif-zeiss/2014_07_01__0009-S09.tif")


def test_extract_tiles():
    reader = TileReader()
    reader.set_input_params({'fname': "/home/dhan/data/bif/1048676_2_1.bif"})
    reader.select_dir(2)
    reader.parse_image_description()
    logger.info("Width: %s" % reader.width)
    logger.info("Height: %s" % reader.height)
    logger.info("Tile Width: %d" % reader.tile_width)
    logger.info("Tile Height: %d" % reader.tile_height)
    # logger.info("Tile Rows: %s" % type(reader.tile_height) )
    logger.info("Tile Rows: %d" % (reader.height / reader.tile_height + 1))
    logger.info("Tile Cols: %d" % (reader.width / reader.tile_width + 1))


    # logger.info("Barcode: %s" % reader.barcode)
    # reader.extract_all_tiles()

if __name__ == "__main__":
    """
    Run few tests
    This class will be finally imported from tiff server
    """
    # test_tif_from_zeiss()
    # test_ptif_from_philips()

    import nose
    nose.run(defaultTest=__name__)

