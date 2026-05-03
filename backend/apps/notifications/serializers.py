from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'project', 'event_type', 'title', 'message', 'detail',
            'actor_id', 'actor_name', 'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = fields
