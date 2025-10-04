from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('trips/', views.trip_list, name='trip_list'),
    path('trips/<int:trip_id>/', views.trip_detail, name='trip_detail'),
    path('calculate/', views.calculate_trip, name='calculate_trip'),
    path('trips/<int:trip_id>/route/', views.trip_route, name='trip_route'),
    path('trips/<int:trip_id>/logs/', views.trip_eld_logs, name='trip_eld_logs'),
]
