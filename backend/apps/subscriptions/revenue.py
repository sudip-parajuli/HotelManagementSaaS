"""Monthly recurring revenue uses contracted prices, never catalog estimates."""
from decimal import Decimal


def monthly_recurring_total(prices_and_cycles):
    return sum((Decimal(str(price or 0)) / (12 if cycle == "yearly" else 1) for price, cycle in prices_and_cycles), Decimal("0.00"))
