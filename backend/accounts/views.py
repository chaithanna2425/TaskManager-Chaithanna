from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
import json


@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)

        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not username or not password:
            return JsonResponse(
                {"error": "Username and password are required"},
                status=400
            )

        if User.objects.filter(username=username).exists():
            return JsonResponse(
                {"error": "Username already exists"},
                status=400
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        token, created = Token.objects.get_or_create(user=user)

        return JsonResponse({
            "message": "Registration successful",
            "username": user.username,
            "token": token.key
        }, status=201)

    except Exception as error:
        return JsonResponse({"error": str(error)}, status=400)


@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        data = json.loads(request.body)

        username = data.get("username", "").strip()
        password = data.get("password", "")

        user = authenticate(
            username=username,
            password=password
        )

        if user is None:
            return JsonResponse(
                {"error": "Invalid username or password"},
                status=401
            )

        token, created = Token.objects.get_or_create(user=user)

        return JsonResponse({
            "message": "Login successful",
            "username": user.username,
            "token": token.key
        })

    except Exception as error:
        return JsonResponse({"error": str(error)}, status=400)