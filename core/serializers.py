from rest_framework import serializers
from .models import Question ,Answer, Vote, Notification
from .models import Vote



class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        field = '_all_'

    def get_vote_count(self, obj):
        upvotes = obj.votes.filter(vote_type='up').count()
        downvotes = obj.votes.filter(vote_type='down').count()
        return {"up": upvotes, "down": downvotes}

class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = '__all__'

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = '__all__'
        read_only_fields = ['user']
