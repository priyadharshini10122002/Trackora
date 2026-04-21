#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trackora.settings.development')
django.setup()

from apps.users.models import User

# Check if admin exists
admin_email = "admin@trackora.local"
if User.objects.filter(email=admin_email).exists():
    print(f"✓ Admin user '{admin_email}' already exists")
else:
    admin = User.objects.create_superuser(
        email=admin_email,
        password="admin123456"
    )
    print(f"✓ Superuser created: {admin_email}")
    print(f"  Password: admin123456")

# Show all users
users = User.objects.all()
print(f"\n✓ Total users in database: {users.count()}")
for user in users:
    print(f"  - {user.email} (Staff: {user.is_staff}, SuperUser: {user.is_superuser})")
