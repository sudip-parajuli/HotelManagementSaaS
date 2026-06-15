"""
SIA HMS — Runtime Translation Helper
Provides a fallback dynamic translation dictionary for Windows environments
where GNU gettext tools are not installed.
"""

from django.utils.translation import get_language

NEPALI_CATALOG = {
    # Auth Errors
    "Invalid credentials.": "अवैध प्रमाणपत्रहरू।",
    "Invalid email or password.": "अमान्य इमेल वा पासवर्ड।",
    "Session expired.": "सत्र समाप्त भयो।",
    
    # Booking Validation
    "Room is not available for the selected dates.": "चयन गरिएका मितिहरूको लागि कोठा उपलब्ध छैन।",
    "Check-out date must be after check-in date.": "चेक-आउट मिति चेक-इन मिति भन्दा पछिको हुनुपर्छ।",
    
    # Common Status Labels
    "Pending": "पेन्डिङ",
    "Confirmed": "पुष्टि भयो",
    "Checked In": "चेक इन",
    "Checked Out": "चेक आउट",
    "Cancelled": "रद्द भयो",
    
    # Invoice Labels
    "Invoice": "बिल",
    "Total": "जम्मा",
    "Amount": "रकम",
    "Balance Due": "बाँकी रकम",
    
    # Payroll/Payslip Labels
    "Payslip": "तलब पर्ची",
    "Basic Salary": "आधारभूत तलब",
    "Gross Salary": "कुल आम्दानी",
    "Net Salary": "खुद तलब",
}

def translate(text: str) -> str:
    """
    Returns the translated string if language is 'ne' and translation exists,
    otherwise returns original string.
    """
    if not text:
        return text
    lang = get_language()
    if lang and lang.startswith("ne"):
        return NEPALI_CATALOG.get(text, text)
    return text

# Alias to mimic standard gettext
_ = translate
