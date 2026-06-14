"""
SIA HMS — Khalti Payment Handler (ePayment v2)
Integrates payment initiation and lookup checks.
"""

import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def initiate_khalti_payment(amount_npr: float, invoice_number: str, return_url: str, customer_name: str = "HMS Guest", customer_phone: str = "") -> dict:
    """
    Initiates payment with Khalti API v2.
    Amount must be converted to paisa (NPR * 100).
    """
    secret_key = settings.KHALTI_SECRET_KEY
    url = f"{settings.KHALTI_API_URL}/epayment/initiate/"
    
    headers = {
        "Authorization": f"Key {secret_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "return_url": return_url,
        "website_url": "http://localhost:3000",
        "amount": int(amount_npr * 100),  # Convert to paisa
        "purchase_order_id": invoice_number,
        "purchase_order_name": f"HMS Room Bill {invoice_number}",
        "customer_info": {
            "name": customer_name,
            "phone": customer_phone or "9800000000"
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Khalti initiate failed: {response.status_code} - {response.text}")
            return {}
    except Exception as e:
        logger.error(f"Khalti initiate request exception: {e}")
        return {}


def verify_khalti_payment(pidx: str) -> dict:
    """
    Looks up payment status using the pidx transaction reference.
    """
    secret_key = settings.KHALTI_SECRET_KEY
    url = f"{settings.KHALTI_API_URL}/epayment/lookup/"
    
    headers = {
        "Authorization": f"Key {secret_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "pidx": pidx
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Khalti lookup failed: {response.status_code} - {response.text}")
            return {}
    except Exception as e:
        logger.error(f"Khalti lookup request exception: {e}")
        return {}
