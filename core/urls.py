from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, AnswerViewSet, VoteViewSet, NotificationViewSet
from .views import (
    QuestionViewSet,
    AnswerViewSet,
    VoteViewSet,
    NotificationViewSet,
    RegisterView, 
)


router = DefaultRouter()
router.register(r'questions', QuestionViewSet)
router.register(r'answers', AnswerViewSet)
router.register(r'votes', VoteViewSet)
router.register(r'notifications', NotificationViewSet)



urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', RegisterView.as_view(), name='register'),
    

]
