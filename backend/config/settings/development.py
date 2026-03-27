from .base import *  # noqa: F401, F403

DEBUG = True

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Allow all hosts in dev
ALLOWED_HOSTS = ['*']

# CORS allow all in dev
CORS_ALLOW_ALL_ORIGINS = True
