import datetime
import mongokit
from bson import ObjectId
import rule

class User(mongokit.Document):
    structure = {
        'type' : basestring,
        'name' : basestring,
        'label' : basestring,
        'rules' : [ObjectId],
        'last_login' : datetime.datetime
        }
    required_fields = ['type', 'name', 'label', 'rules', 'last_login']

    def update_last_login(self):
        self.__dict__["last_login"] = datetime.datetime.utcnow()

