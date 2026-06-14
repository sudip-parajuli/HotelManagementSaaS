"""
SIA HMS — Loyalty Signals
Awards points to guests when invoices are paid and updates loyalty tiers.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.billing.models import Invoice, InvoiceStatus
from apps.crm.models import GuestActivity
from .models import LoyaltyAccount, LoyaltyTransaction, LoyaltyTier


@receiver(post_save, sender=Invoice)
def award_loyalty_points(sender, instance, **kwargs):
    """
    Listens for paid invoices to award loyalty points to guests (1 pt per NPR 100 spent).
    Automatically promotes guest loyalty tiers.
    """
    if instance.status == InvoiceStatus.PAID:
        # Check if invoice is linked to a reservation/guest
        if not instance.reservation:
            return

        guest = instance.reservation.guest

        # Get or create LoyaltyAccount for the guest
        account, created = LoyaltyAccount.objects.get_or_create(guest=guest)

        # Ensure points are not awarded twice for the same invoice
        desc = f"Earned points from Invoice #{instance.id} ({instance.invoice_number})"
        already_awarded = LoyaltyTransaction.objects.filter(
            account=account,
            transaction_type=LoyaltyTransaction.TransactionType.EARN,
            description__contains=f"Invoice #{instance.id}",
        ).exists()

        if not already_awarded:
            # 1 point per NPR 100 spent
            points = int(instance.total_amount // 100)
            if points > 0:
                # 1. Create LoyaltyTransaction
                LoyaltyTransaction.objects.create(
                    account=account,
                    points=points,
                    transaction_type=LoyaltyTransaction.TransactionType.EARN,
                    description=desc,
                )

                # 2. Update points balance
                account.points_balance += points

                # 3. Determine tier promotion
                new_tier = LoyaltyTier.BRONZE
                if account.points_balance >= 5000:
                    new_tier = LoyaltyTier.PLATINUM
                elif account.points_balance >= 1500:
                    new_tier = LoyaltyTier.GOLD
                elif account.points_balance >= 500:
                    new_tier = LoyaltyTier.SILVER

                tier_upgraded = False
                old_tier = account.tier
                if account.tier != new_tier:
                    account.tier = new_tier
                    tier_upgraded = True

                account.save()

                # 4. Log GuestActivity
                GuestActivity.objects.create(
                    guest=guest,
                    activity_type="loyalty_earn",
                    description=f"Earned {points} loyalty points from invoice {instance.invoice_number}",
                )

                if tier_upgraded:
                    GuestActivity.objects.create(
                        guest=guest,
                        activity_type="profile_update",
                        description=f"Loyalty tier upgraded from {old_tier.upper()} to {new_tier.upper()}",
                    )
