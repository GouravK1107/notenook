from django.urls import path
from . import views

urlpatterns = [
    # Page views
    path('', views.homepage, name='homepage'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # AJAX endpoints
    path('api/notes/', views.get_notes, name='api_notes'),
    path('api/notes/create/', views.create_note, name='api_create_note'),
    path('api/notes/<int:note_id>/update/', views.update_note, name='api_update_note'),
    path('api/notes/<int:note_id>/delete/', views.delete_note, name='api_delete_note'),
    path('api/notes/<int:note_id>/favorite/', views.toggle_favorite, name='api_toggle_favorite'),
    path('api/categories/', views.get_categories, name='api_categories'),
]