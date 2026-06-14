"""
SIA HMS — eSewa Payment Handler (ePay v2)
Implements signature hashing and response verification.
"""

import hmac
import hashlib
import base64
from django.conf import settings


def generate_esewa_signature(total_amount: str, transaction_uuid: str) -> str:
    """
    Generates eSewa epay v2 signature string using HMAC-SHA256 and base64.
    Format: total_amount=X,transaction_uuid=Y,product_code=Z
    """
    secret_key = settings.ESEWA_SECRET_KEY
    product_code = settings.ESEWA_MERCHANT_CODE
    
    # Message format required by eSewa v2
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    
    # Generate HMAC-SHA256 signature
    key_bytes = secret_key.encode("utf-8")
    message_bytes = message.encode("utf-8")
    
    hmac_hash = hmac.new(key_bytes, message_bytes, hashlib.sha256).digest()
    signature = base64.b64encode(hmac_hash).decode("utf-8")
    
    return signature


def verify_esewa_response(encoded_response: str) -> dict:
    """
    Decodes the base64-encoded response parameters returned by eSewa,
    and returns a dictionary of values.
    """
    try:
        decoded_bytes = base64.b64decode(encoded_response)
        decoded_str = decoded_bytes.decode("utf-8")
        
        # Convert JSON string to dictionary
        import json
        return json.loads(decoded_str)
    except Exception:
        return {}


def verify_esewa_signature(data: dict, signature: str) -> bool:
    """
    Verifies that the signature in the callback matches our generated signature.
    """
    total_amount = data.get("total_amount")
    transaction_uuid = data.get("transaction_uuid")
    
    if not total_amount or not transaction_uuid:
        return False
        
    expected_sig = generate_esewa_signature(total_amount, transaction_uuid)
    return hmac.compare_digest(expected_sig, signature)
