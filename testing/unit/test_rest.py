# DJ's command line for testing
# (export SLIDEATLAS_CONFIG_PATH=/home/dhan/projects/slideatlas-config-kitware/localhost/site_slideatlas.py ; python test_rest.py  APIv1_Tests.testDatabaseInfo )

import sys
from json import loads
import json
import os
sys.path.append(os.path.abspath("../.."))
import slideatlas
from slideatlas import models
from slideatlas.security.views.common import login_user
import unittest
# from slideatlas.security import login_user
# from slideatlas import models

class APIv1_Tests(unittest.TestCase):
    def setUp(self):
        # Creates app and gets a client to it
        self.app1 = slideatlas.create_app()
        self.app1.testing = True
        self.app = self.app1.test_client()

    def login_viewer(self):
        # Posts login and password for demo database access
        # demo_user = models.PasswordUser.objects.get(email='all_demo')
        # login_user(demo_user)
        demo_user = models.PasswordUser.objects.get(email='all_demo')
        with self.app:
            login_user(demo_user)


    def login_admin(self):
        # Posts admin access
        # admin_user = models.PasswordUser.objects.get(email='all_demo')
        # return login_user(demo_user)

        # TODO: this should use site configuration
        # with self.app1.test_request_context("/"):
        with self.app.request_context():
            admin_user = models.PasswordUser.objects.get(email='all_bev1_admin')
            login_user(admin_user)
        # data = dict(
        #     username="all_bev1_admin",
        #     passwd="MAmanage"
        # )

        # self.app.post('/login', data=data , follow_redirects=True)

    def logout(self):
        return self.app.get('/logout', follow_redirects=True)

    def testRestURLs(self):
        urls_to_pass = [  "/apiv1/5074589002e31023d4292d83/sessions",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views/5074589002e31023d4292d83",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/attachments",
                                    "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/attachments/5074589002e31023d4292d83",
                                    "/apiv1/users/5074589002e31023d4292d83",
                                    "/apiv1/databases",
                                    "/apiv1/databases/507619bb0a3ee10434ae0827",
                                    "/apiv1/rules/5074589002e31023d4292d83"]

        urls_to_fail = ["/apiv1/somethingelse"]
        self.logout()

        for aurl in urls_to_pass:
            print "Testing: ",
            rv = self.app.get(aurl)
            print rv.status_code, " ", aurl
            self.failUnless(rv.status_code == 401, aurl)

        # Now test for urls that should not pass
        for aurl in urls_to_fail:
            print "Testing failure of: ", aurl
            rv = self.app.get(aurl)
            self.failUnless(rv.status_code == 404, aurl)

    def testLoginWithUser(self):
        """ Any URL should not return without logging in
        """
        user_url = "/apiv1/5074589002e31023d4292d83/sessions/5074589002e31023d4292d83/views"
        admin_url = "/apiv1/databases/5074589002e31023d4292d83"

        self.logout()

        # expact 401
        rv = self.app.get(user_url)
        print "Before login: ", rv.status_code, " ", user_url
        assert rv.status_code == 401

        rv = self.app.get(admin_url)
        print "Before login: ", rv.status_code, " ", admin_url
        assert rv.status_code == 401

        # Sign in for user access
        self.login_viewer()

        rv = self.app.get(user_url)
        print "After user login : ", rv.status_code, " ", user_url
        assert rv.status_code == 200

        rv = self.app.get(admin_url)
        print "After user login : ", rv.status_code, " ", admin_url
        assert rv.status_code == 401

        # Sign in for admin access
        self.login_admin()
        rv = self.app.get(user_url)
        print "After admin login : ", rv.status_code, " ", user_url
        assert rv.status_code == 200

        rv = self.app.get(admin_url)
        print "After admin login : ", rv.status_code, " ", admin_url
        assert rv.status_code == 405

    def testDatabaseInfo(self):
        """
        Test if the server returns database information correctly
        """
        # TODO: Fix this

        # self.login_viewer()
        self.login_admin()

        obj = self.parseResponse("/apiv1/databases")
        self.failUnless(obj.has_key("databases"), "No database in the results")

        firstdb = obj["databases"][0]

        # Now test a particular DB
        obj = self.parseResponse("/apiv1/databases/" + str(firstdb["_id"]))
        self.failUnless(obj.has_key("label"), "No label in the database in the results")


    def testDatabasePost(self):
        """
        Adding the new database to
        """
        # Sign in for admin access
        self.login_admin()
        newdb = dict(insert={
                              "label" : "Database for DJ",
                              "host" : "127.0.0.1",
                              "dbname" : "dj1",
                              "copyright" : "All rights reserved by DJ 2013"}
                            )

        obj = self.parseResponse("/apiv1/databases", newdb, method="post")

        # Query it back and check
        obj2 = self.parseResponse("/apiv1/databases/" + str(obj["_id"]))
        self.failUnlessEqual(obj['_id'], obj2["_id"])

        obj2["label"] = "Modified"

        obj3 = self.parseResponse("/apiv1/databases/" + str(obj2["_id"]), obj2, method="put")

        # Query it back and check if the label if actually modified
        obj4 = self.parseResponse("/apiv1/databases/" + str(obj2["_id"]))
        self.failUnlessEqual(obj2["label"], obj4["label"])

        # Now test if the database record can be deleted
        obj3 = self.parseResponse("/apiv1/databases/" + str(obj["_id"]), method="delete")

        # This should fail
        rv = self.app.get("/apiv1/databases/" + str(obj["_id"]))
        self.failUnless(rv.status_code == 405, 'Status code is %d' % rv.status_code)


    def testAdminDBModifyUsingPost(self):
        """
        Tests post operation for partially modifying database in admin databases
        """
        # Sign in for admin access
        self.login_admin()

        newdb = dict(insert={
                              "label" : "Database for DJ Test Partial update",
                              "host" : "127.0.0.1",
                              "dbname" : "dj2",
                              "copyright" : "All rights reserved by DJ 2013"}
                            )

        obj = self.parseResponse("/apiv1/databases", newdb, method="post")

        modification = dict(modify={
                              "host" : "127.0.0.1:27017" }
                            )

        # Query it back and check
        obj2 = self.parseResponse("/apiv1/databases/" + str(obj["_id"]), modification, method="post")
        print "Returned object: ", obj2

        self.failUnlessEqual(obj['_id'], obj2["_id"])
        self.failUnless(obj2["host"] == modification["modify"]["host"])
        self.failUnless(obj2["label"] == obj["label"])

        # Now delete the database
        obj3 = self.parseResponse("/apiv1/databases/" + str(obj["_id"]), method="delete")

        # Not testing delete

    def testRenameSessionUsingPost(self):
        """
        Tests post operation for renaming session
        """
        # Sign in for admin access
        self.login_admin()
        self.login_viewer()
        newsession = dict(insert={
                      "label" : "New Session for DJ rename test"
                      }
                    )

        obj = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions", newsession, method='post')
        self.failIf(obj.has_key("error"))

        modification = dict(modify={"label" : "Some"})
        # Query it back and check
        obj2 = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions/" + str(obj["_id"]), modification, method="post")
        self.failUnlessEqual(obj['_id'], obj2["_id"])

        self.failUnlessEqual(obj2['label'], modification["modify"]["label"])

        # delete the test session
        obj3 = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions/" + str(obj["_id"]), method="delete")

        # Not testing delete


    def testAdminDBItems(self):
        """
        Test generic api for databases users rules in admindb
        """
        self.login_admin()

        for item in ["databases", "users", "rules"]:
            obj = self.parseResponse("/apiv1/" + item)
            self.failUnless(obj.has_key(item), "No " + item + "in the results")

        # Test databases
        obj = self.parseResponse("/apiv1/databases/507619bb0a3ee10434ae0827")
        self.failUnless(obj.has_key("label"), "No label in the database in the results")

        # Test rules
        obj = self.parseResponse("/apiv1/rules/507619bb0a3ee10434ae0828")
        self.failUnless(obj.has_key("label"), "No label in the rule in the results")

    def testUserNoPasswd(self):
        # User should have label and should not have password
        self.login_admin()

        obj = self.parseResponse("/apiv1/users/510b43f4d6364703a2380fa6")
        self.failUnless(obj.has_key("label"), "No label in the database in the results")
        self.failIf(obj.has_key("passwd"), "Should not return password ever")

        obj = self.parseResponse("/apiv1/users")
        self.failUnless(obj.has_key("users"), "No list of users returned")

        for auser in obj["users"]:
            self.failIf(auser.has_key("passwd"), "Should not return password ever")

    def testAPISessionList(self):
        self.login_viewer()
        obj = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions")
        self.failUnless(obj.has_key("sessions"))

    def testAPISingleSession(self):
        self.login_viewer()
        obj = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions/4ecbbc6d0e6f7d7a56000000")
        self.failUnless(obj.has_key("images"))

    def testAPICreateSession(self):
        self.login_viewer()
        newsession = dict(insert={
                      "label" : "New Session for DJ"
                      }
                    )

        obj = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions", newsession, method='post')
        self.failIf(obj.has_key("error"))

    def testAPIPurgeSession(self):
        self.login_admin()
        newsession = dict(insert={
                      "label" : "New Session for DJ"
                      }
                    )
        self.fail("Not implemented")

#        obj = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions", newsession, method='post')
#        self.failIf(obj.has_key("error"))
#
#        # Query it back and check
#        obj2 = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions/" + str(obj["_id"]))
#        self.failUnlessEqual(obj['_id'], obj2["_id"])

#        obj2["label"] = "Modified"
#
#        obj3 = self.parseResponse("/apiv1/databases/" + str(obj2["_id"]), obj2, method="put")
#
#        # Query it back and check if the label if actually modified
#        obj4 = self.parseResponse("/apiv1/databases/" + str(obj2["_id"]))
#        self.failUnlessEqual(obj2["label"], obj4["label"])
#
        # Now test if the database record can be deleted
#        obj3 = self.parseResponse("apiv1/507619bb0a3ee10434ae0827/sessions/" + str(obj["_id"]), method="delete")
#
#        # This should fail
#        rv = self.app.get("apiv1/507619bb0a3ee10434ae0827/sessions/" + str(obj["_id"]))
#        self.failUnless(rv.status_code == 405, 'Status code is %d' % rv.status_code)

    def parseResponse(self, url, postdata=None, method="get"):
        if method == "get":
            rv = self.app.get(url)

        elif method == "post":
            rv = self.app.post(url,
                           # String conversion required, as the test client ifnores content_type and assumes it is a file
                           data=json.dumps(postdata),
                          content_type='application/json')

        elif method == "put":
            rv = self.app.put(url,
                           # String conversion required, as the test client ifnores content_type and assumes it is a file
                           data=json.dumps(postdata),
                          content_type='application/json')

        elif method == "delete":
            rv = self.app.delete(url)
        else:
            raise("method not supported")

        self.failUnless(rv.status_code == 200, "Http request did not return OK, status: %d, it returned: %s" % (rv.status_code, rv.data))

        try:
            obj = loads(rv.data)
        except:
            self.fail("Response not valid json")

        if "error" in obj:
            self.fail("Response retuns error : %s" % obj["error"])

        return obj

    def testDatabasePut(self):
        pass

if __name__ == "__main__":
    unittest.main()
