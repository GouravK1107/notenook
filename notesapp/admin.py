from django.contrib import admin
from .models import CustomUser, Note, Favorite, Category

admin.site.register(CustomUser)
admin.site.register(Note)
admin.site.register(Favorite)
admin.site.register(Category)