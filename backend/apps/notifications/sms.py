"""
SIA HMS — Sparrow SMS Client Integration
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(to, message):
    """
    Dispatches SMS via Sparrow SMS portal API endpoint.
    Fails silently in development to allow mock logs.
    """
    token = getattr(settings, "SPARROW_SMS_TOKEN", "mock-token")
    sender = getattr(settings, "SPARROW_SMS_FROM", "SIA_HMS")
    
    logger.info(f"Sending SMS to {to}: {message}")
    
    # If sandbox / mock token
    if token == "mock-token":
        logger.info("[Sparrow SMS Mock] Dispatch completed.")
        return True
        
    try:
        url = "http://api.sparrowsms.com/v2/sms/"
        payload = {
            "token": token,
            "from": sender,
            "to": to,
            "text": message
        }
        res = requests.post(url, data=payload, timeout=8)
        logger.info(f"Sparrow API response status code: {res.status_code}")
        return res.status_code == 200
    except Exception as e:
        logger.error(f"Sparrow SMS api failure: {e}")
        return False
