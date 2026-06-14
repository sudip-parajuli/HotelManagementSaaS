"""
SIA HMS — Custom Exception Handler
Returns consistent error format: {error, code, detail}
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler.
    Returns errors in the format:
    {
        "error": "Human-readable message",
        "code": "ERROR_CODE",
        "detail": {...}  // validation errors or additional info
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_code = "API_ERROR"
        error_message = "An error occurred."
        error_detail = {}

        if hasattr(exc, "default_code"):
            error_code = exc.default_code.upper()

        if response.status_code == status.HTTP_400_BAD_REQUEST:
            error_code = "VALIDATION_ERROR"
            error_message = "Validation failed. Please check your input."
            error_detail = response.data
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            error_code = "AUTHENTICATION_ERROR"
            error_message = "Authentication credentials were not provided or are invalid."
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            error_code = "PERMISSION_DENIED"
            error_message = str(exc.detail) if hasattr(exc, "detail") else "You do not have permission to perform this action."
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            error_code = "NOT_FOUND"
            error_message = "The requested resource was not found."
        elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            error_code = "RATE_LIMITED"
            error_message = "Too many requests. Please slow down."
        elif response.status_code >= 500:
            error_code = "SERVER_ERROR"
            error_message = "An internal server error occurred."
        else:
            error_message = str(response.data) if response.data else error_message

        response.data = {
            "error": error_message,
            "code": error_code,
            "detail": error_detail,
        }

    return response
