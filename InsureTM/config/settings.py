from pathlib import Path
import environ
import os
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True, # Recommandé pour la sécurité
    'BLACKLIST_AFTER_ROTATION': True,
}
# 1. Définition de BASE_DIR en premier (Indispensable)
BASE_DIR = Path(__file__).resolve().parent.parent
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# 2. Initialisation d'environ
env = environ.Env(
    DEBUG=(bool, False)
)

# 3. Lecture du fichier .env
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# 2. Ensuite seulement, appeler la variable
SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

# 5. Application Definition (Ajout de tes apps métier)
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Librairies tierces
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
     'rest_framework_simplejwt.token_blacklist',

    
    # Tes applications iSureTM
    
    'users',
    'campaigns',
    'core',
    'anomalies',
    'comments',
    'testCases',
    'Project',
    'notifications',

]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}
# 6. Middleware (Ajout de CorsMiddleware au début)
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Indispensable pour React
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ROOT_URLCONF = 'config.urls'

# 7. Configuration de la Base de données (via .env)
# Si DATABASE_URL n'est pas dans le .env, il utilisera SQLite par défaut
DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR}/db.sqlite3')
}

# 8. Modèle utilisateur personnalisé pour Lloyd Assurances
AUTH_USER_MODEL = 'users.User'

# 9. Reste de la configuration standard
LANGUAGE_CODE = 'fr-fr' # Changé en français pour ton rapport
TIME_ZONE = 'Africa/Tunis' # Localisé pour ton environnement
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_USER')
EMAIL_HOST_PASSWORD = env('EMAIL_PASSWORD')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
CORS_ALLOW_ALL_ORIGINS = True