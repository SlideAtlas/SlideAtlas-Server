# coding=utf-8

from functools import partial, wraps
from itertools import chain

from flask.ext.principal import Permission as Requirement
from flask.ext.principal import AnonymousIdentity, Identity, PermissionDenied, \
    identity_loaded

from flask.ext.security import current_user
from flask.ext.security.core import _on_identity_loaded as security_on_identity_loaded
from werkzeug.exceptions import Forbidden, Unauthorized

from slideatlas import models

################################################################################
# TODO: populate __all__
__all__ = ('AdminSiteRequirement', 'AdminCollectionRequirement',
           'AdminSessionRequirement', 'AdminRequirement',
           'EditCollectionRequirement', 'EditSessionRequirement',
           'ViewSessionRequirement', 'UserRequirement')


################################################################################
UserPermission = partial(models.Permission, *('be', 'user'))


################################################################################
class ModelProtectionMixin(object):
    model_type = None

    @classmethod
    def protected(cls, f):
        @wraps(f)
        def _decorated(*args, **kwargs):
            if cls.model_type:
                found_args = list()
                for arg in chain(args, kwargs.itervalues()):
                    if isinstance(arg, cls.model_type):
                        found_args.append(arg)
                if len(found_args) != 1:
                    raise TypeError('A "%s.protected" decorator must be used on a view which requires a single parameter of type %s.' % (cls.__name__, cls.model_type))
                permission = cls(found_args[0])
            else:
                permission = cls()
            with permission.require():
                return f(*args, **kwargs)

        return _decorated


################################################################################
class AdminSiteRequirement(Requirement, ModelProtectionMixin):
    model_type = None

    def __init__(self):
        super(AdminSiteRequirement, self).__init__(
            models.AdminSitePermission(),
        )


class AdminCollectionRequirement(Requirement, ModelProtectionMixin):
    model_type = models.Collection

    def __init__(self, collection):
        super(AdminCollectionRequirement, self).__init__(
            models.AdminSitePermission(),
            models.AdminCollectionPermission(collection.id),
        )


class AdminSessionRequirement(Requirement, ModelProtectionMixin):
    model_type = models.Session

    def __init__(self, session):
        super(AdminSessionRequirement, self).__init__(
            models.AdminSitePermission(),
            models.AdminCollectionPermission(session.collection.id),
            models.AdminSessionPermission(session.id),
        )


class AdminRequirement(Requirement, ModelProtectionMixin):
    """
    A special requirement that allows an identity with admin access to any resource.
    """
    model_type = None

    def allows(self, identity):
        for permission in identity.provides:
            if permission.operation >= models.Operation.admin:
                return True
        return False

    def reverse(self):
        raise NotImplementedError()

    def union(self, other):
        raise NotImplementedError()

    def difference(self, other):
        raise NotImplementedError()

    def issubset(self, other):
        raise NotImplementedError()


class EditCollectionRequirement(Requirement, ModelProtectionMixin):
    model_type = models.Collection

    def __init__(self, collection):
        super(EditCollectionRequirement, self).__init__(
            models.AdminSitePermission(),
            models.AdminCollectionPermission(collection.id),
            models.EditCollectionPermission(collection.id),
        )


class EditSessionRequirement(Requirement, ModelProtectionMixin):
    model_type = models.Session

    def __init__(self, session):
        super(EditSessionRequirement, self).__init__(
            models.AdminSitePermission(),
            models.AdminCollectionPermission(session.collection.id),
            models.AdminSessionPermission(session.id),
            models.EditCollectionPermission(session.collection.id),
            models.EditSessionPermission(session.id),
        )


class ViewSessionRequirement(Requirement, ModelProtectionMixin):
    model_type = models.Session

    def __init__(self, session):
        super(ViewSessionRequirement, self).__init__(
            models.AdminSitePermission(),
            models.AdminCollectionPermission(session.collection.id),
            models.AdminSessionPermission(session.id),
            models.EditCollectionPermission(session.collection.id),
            models.EditSessionPermission(session.id),
            models.ViewCollectionPermission(session.collection.id),
            models.ViewSessionPermission(session.id),
        )


class UserRequirement(Requirement, ModelProtectionMixin):
    model_type = models.User

    def __init__(self, user):
        super(UserRequirement, self).__init__(
            models.AdminSitePermission(),
            UserPermission(user.id),
        )


################################################################################
def identity_loader():
    # unlike the Flask-Security identity loader, this always returns an identity,
    #   even if it's an AnonymousIdentity
    if isinstance(current_user._get_current_object(), models.User):
        return Identity(current_user.id)
    return AnonymousIdentity()


################################################################################
def on_identity_loaded(app, identity):
    if isinstance(current_user._get_current_object(), models.User):
        identity.provides.add(UserPermission(current_user.id))
        identity.provides.update(current_user.effective_permissions)
    else:  # Anonymous
        identity.provides.update(permission_document.to_permission()
                                 for permission_document
                                 in models.PublicGroup.get.permissions)
    identity.user = current_user


################################################################################
def on_permission_denied(error):
    # TODO: consider calling "Permission.require" to raise an HTTP exception
    #   directly, so that this error handler can be registered for all such
    #   access control-related HTTP exceptions
    if current_user.is_authenticated():
        return Forbidden()  # 403
    else:
        # TODO: redirect to login page if this is a non-JSON GET request
        return Unauthorized()  # 401


################################################################################
def register_principal(app, security):
    principal = security.principal

    # remove the default loader for Identity, as it does not cause an
    #   on_identity_loaded signal to be sent for AnonymousIdentity
    principal.identity_loaders.clear()
    principal.identity_loader(identity_loader)

    # remove the default function for populating Identity, as it creates
    #   RoleNeeds, which are not used here
    identity_loaded.disconnect(security_on_identity_loaded)
    identity_loaded.connect(on_identity_loaded, app)

    # disable authorization for static resources
    principal.skip_static = True

    app.register_error_handler(PermissionDenied, on_permission_denied)
