from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that reads the access token from
    httpOnly cookies if the standard Authorization header is not present.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get("access_token")
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        # This will raise InvalidToken if the token is expired or invalid,
        # triggering the appropriate 401 response.
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
