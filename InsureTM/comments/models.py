from django.db import models
from django.conf import settings

class Comment(models.Model):
    test_case = models.ForeignKey(
        'testCases.TestCase', 
        on_delete=models.CASCADE, 
        related_name='comments',
        null=True, blank=True
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages',
        null=True, blank=True
    )
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='authored_comments')
    message = models.TextField(blank=True)
    attachment = models.FileField(upload_to='comment_attachments/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.test_case:
            return f"Comment by {self.author} on {self.test_case}"
        return f"DM from {self.author} to {self.recipient}"
