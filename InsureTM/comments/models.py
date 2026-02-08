from django.db import models
from django.conf import settings

class Comment(models.Model):
    test_case = models.ForeignKey(
        'testCases.TestCase', 
        on_delete=models.CASCADE, 
        related_name='comments'
    )
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    attachment = models.FileField(upload_to='comment_attachments/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author} on {self.test_case}"
