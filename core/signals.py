from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Answer, Notification
from django.contrib.auth.models import User

@receiver(post_save, sender=Answer)
def notify_question_owner(sender, instance, created, **kwargs):
    if created:
        question_owner = instance.question.author
        answer_author = instance.author
        if question_owner != answer_author:
            Notification.objects.create(
                user=question_owner,
                message=f"{answer_author.username} answered your question."
            )
