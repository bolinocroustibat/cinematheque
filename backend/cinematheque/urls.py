"""
URL configuration for cinematheque project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI
from cinematheque.helpers import ORJSONRenderer
from cinematheque.settings import APP_NAME, DESCRIPTION, VERSION

from cinematheque_app.api import router

api = NinjaAPI(
    renderer=ORJSONRenderer(), title=APP_NAME, description=DESCRIPTION, version=VERSION
)

api.add_router("", router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]

admin.site.site_title = "Cinemathèque backend"  # the webpage title in the browser tab
admin.site.site_header = f"Cinemathèque backend v{VERSION}"
admin.site.index_title = "Admin"
