try:
    import simplejson as json
except ImportError:
    try:
        import json
    except ImportError:
        raise ImportError
import datetime
from bson.objectid import ObjectId
import itertools
import hashlib
import functools
from flask import Response


class MongoJsonEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        elif isinstance(obj, ObjectId):
            return unicode(obj)
        return json.JSONEncoder.default(self, obj)

def jsonify(*args, **kwargs):
    """ jsonify with support for MongoDB ObjectId
    """
    # TODO, if the arg is a ModelDocument, convert it with '.to_mongo()'
    return Response(json.dumps(dict(*args, **kwargs), cls=MongoJsonEncoder), mimetype='application/json')

class DBAccess(object):
    def __init__(self):
        self.db_admin = False
        self.can_see_all = False
        self.can_see = []
        self.can_admin = []

    def __str__(self):
        return str(self.__dict__)


## Generate a human readable 'random' password
## password  will be generated in the form 'word'+digits+'word'
## eg.,nice137pass
## parameters: number of 'characters' , number of 'digits'
## Pradeep Kishore Gowda <pradeep at btbytes.com >
## License : GPL
## Date : 2005.April.15
## Revision 1.2
## ChangeLog:
## 1.1 - fixed typos
## 1.2 - renamed functions _apart & _npart to a_part & n_part as zope does not allow functions to
## start with _

def nicepass(alpha=6,numeric=2):
    """
    returns a human-readble password (say rol86din instead of
    a difficult to remember K8Yn9muL )
    """
    import string
    import random
    vowels = ['a','e','i','o','u']
    consonants = [a for a in string.ascii_lowercase if a not in vowels]
    digits = string.digits

    ####utility functions
    def a_part(slen):
        ret = ''
        for i in range(slen):
            if i%2 ==0:
                randid = random.randint(0,20) #number of consonants
                ret += consonants[randid]
            else:
                randid = random.randint(0,4) #number of vowels
                ret += vowels[randid]
        return ret

    def n_part(slen):
        ret = ''
        for i in range(slen):
            randid = random.randint(0,9) #number of digits
            ret += digits[randid]
        return ret

    ####
    fpl = alpha/2
    if alpha % 2 :
        fpl = int(alpha/2) + 1
    lpl = alpha - fpl

    start = a_part(fpl)
    mid = n_part(numeric)
    end = a_part(lpl)

    return "%s%s%s" % (start,mid,end)


def reversed_enumerate(sequence):
    """
    An efficient equivalent of reversed(list(enumerate(sequence))).
    """
    # credit: http://stackoverflow.com/a/7722144
    return itertools.izip(
        reversed(xrange(len(sequence))),
        reversed(sequence),
    )


def file_sha512(file_path, buffer_size=65536):
    """
    Calculate the SHA512 checksum of a given file, returning the result as a
    hex-encoded string.
    """
    # empirically, a buffer size of 65536 provides optimal throughput
    sha512 = hashlib.sha512()
    with open(file_path, 'rb') as file_obj:
        read_func = functools.partial(file_obj.read, buffer_size)
        for chunk in iter(read_func, b''):
            sha512.update(chunk)
    return sha512.hexdigest()
