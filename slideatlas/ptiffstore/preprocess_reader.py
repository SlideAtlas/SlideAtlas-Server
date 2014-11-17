# import sys
import os
# from base_reader import InvertedReader
# from common_utils import get_max_depth
tplpath = os.path.abspath(os.path.join(os.path.dirname(__file__), "tpl"))

# import openslide
from openslide_reader import OpenslideReader
import subprocess

__all__ = ("PreprocessReader", )

import logging
logger = logging.getLogger("PreprocessReader")
logger.setLevel(logging.ERROR)
from lockfile import LockFile

class PreprocessReader(OpenslideReader):

    def __init__(self):
        logger.info("PreprocessReader init")
        super(PreprocessReader, self).__init__()

    def pre_process(self, params):
        """
        Converts the files
        """
        raise NotImplementedError()

    def set_input_params(self, params):
        """
        Accepts the input file
        """
        params["oldfname"] = params["fname"]
        params["fname"] = self.pre_process(params)
        super(PreprocessReader, self).set_input_params(params)


class PreprocessReaderJp2(PreprocessReader):
    """
    uses kakadu if available or otherwise gdal to convert jp2
    files to tiled tiff which are then absorbed by OpenslideReader
    """

    def __init__(self, kakadu_dir=None):
        # logger.info("PreprocessReaderJp2 init")
        self.kakadu_dir = kakadu_dir
        super(PreprocessReaderJp2, self).__init__()

    def pre_process(self, params):
        """
        Converts the files

        First pass is to create striped tiff using kakadu if available
        and second pass is to convert to tiled tiff.

        A third file path is used for lock, if the lock can be acquired
        and the output is not ready then create it.  If the lock cannot
        be acquired then perhaps other process is processing it.

        TODO: Decide when to declare not possible ?
        """
        # Split the requested filename
        dirname, filename = os.path.split(params["fname"])
        _, ext = os.path.splitext(filename)

        # assert that ext is as expected
        assert ext in [".jp2", ".j2k"]

        output1 = os.path.join(dirname, filename + "_striped.tif")
        output2 = os.path.join(dirname, filename + "_tiled.tif")
        lock_path = os.path.join(dirname, filename + ".lock")

        lock = LockFile(lock_path)
        # logger.error("waiting for lock")
        lock.acquire()
        # If the file is missing then create it
        if not os.path.exists(output2):
            # Make sure the processing lock can be acquired
            logger.error("processing")

            logger.warning("# Convert to striped tiff")
            if self.kakadu_dir is None:
                params = ["gdal_translate", params["fname"], output1]
                subprocess.call(params)
            else:
                params = [self.kakadu_dir, "-i", params["fname"], "-o", output1]
                subprocess.call(params)

            logger.warning("# Convert to tiled tiff")
            params = ["gdal_translate", "-co", "TILED=YES", "-co", "COMPRESS=JPEG", output1, output2]
            subprocess.call(params)

            # Then remove output1
            os.remove(output1)
        lock.release()
        return output2

if __name__ == "__main__":
    reader = PreprocessReaderJp2()
    reader.set_input_params({"fname": "/home/dhan/Downloads/jp2/Bretagne2.j2k"})
    print reader.name
    # i = reader.get_tile(26000, 83000)
    # i.save("tile.jpg")
