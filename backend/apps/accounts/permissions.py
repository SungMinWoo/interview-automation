from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Object-level permission that only allows the owner of an object to access it.

    Expects the model instance to have an attribute named `user` or `owner`
    that points to the owning User.
    """

    def has_object_permission(self, request, view, obj):
        # Check common owner attribute names
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        return False
