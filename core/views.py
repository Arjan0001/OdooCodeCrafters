from rest_framework import viewsets, permissions, filters
from .models import Question, Answer, Vote, Notification
from .serializers import QuestionSerializer, AnswerSerializer, VoteSerializer, NotificationSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from .serializers import AnswerSerializer
from rest_framework import serializers


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all().order_by('-created_at')
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filtre_backend = [filters.SearchFilter]
    search_fields = ['title', 'description', 'tags']


    def get_queryset(self):
        queryset = super().get_queryset()

        unanswered = self.request.query_params.get('unanswered')
        if unanswered == 'true':
            queryset = queryset.annotate(answer_count=Count('answers')).filter(answer_count=0)

        return queryset
    
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def unanswered(self, request):
        unanswered_qs = self.queryset.filter(answer__isnull=True)
        serializer = self.get_serializer(unanswered_qs, many=True)
        return Response(serializer.data)

class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [permissions.IsAuthenticated]

def perform_create(self, serializer):
        serializer.save(author=self.request.user)

@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
def accept(self, request, pk=None):
        answer = self.get_object()
        question = answer.question

        if question.author != request.user:
            return Response({'detail': 'Only the question author can accept an answer.'}, status=403)

        # Un-accept any previously accepted answer
        question.answers.filter(is_accepted=True).update(is_accepted=False)

        # Accept this one
        answer.is_accepted = True
        answer.save()

        return Response({'detail': 'Answer accepted successfully ✅'}, status=200)   

class VoteViewSet(viewsets.ModelViewSet):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer
    permission_classes = [permissions.IsAuthenticated]

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]



class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        return Response({"message": "User registered successfully."}, status=status.HTTP_201_CREATED)

permission_classes = [permissions.IsAuthenticated]


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
     serializer.save(author=self.request.user)


class VoteViewSet(viewsets.ModelViewSet):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Ensure vote is updated if it already exists
        vote, created = Vote.objects.update_or_create(
            user=self.request.user,
            answer=serializer.validated_data['answer'],
            defaults={'vote_type': serializer.validated_data['vote_type']}
        )
        return vote
    
class AnswerSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = '__all__'

    def get_vote_count(self, obj):
        upvotes = obj.votes.filter(vote_type='up').count()
        downvotes = obj.votes.filter(vote_type='down').count()
        return {"up": upvotes, "down": downvotes}




