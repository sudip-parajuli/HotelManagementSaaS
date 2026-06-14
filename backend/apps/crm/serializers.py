"""
SIA HMS — CRM Serializers
Defines GuestTagSerializer, GuestActivitySerializer, CampaignSerializer, and GuestProfilePortfolioSerializer.
"""

from rest_framework import serializers
from apps.bookings.models import GuestProfile
from .models import GuestTag, GuestActivity, Campaign


class GuestTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestTag
        fields = ["id", "name", "color", "created_at"]


class GuestActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(source="get_activity_type_display", read_only=True)

    class Meta:
        model = GuestActivity
        fields = ["id", "guest", "activity_type", "activity_type_display", "description", "created_at"]


class CampaignSerializer(serializers.ModelSerializer):
    campaign_type_display = serializers.CharField(source="get_campaign_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Campaign
        fields = "__all__"


class GuestProfilePortfolioSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    tags = GuestTagSerializer(many=True, read_only=True)
    loyalty_points = serializers.SerializerMethodField()
    loyalty_tier = serializers.SerializerMethodField()
    total_spend = serializers.SerializerMethodField()
    total_stays = serializers.SerializerMethodField()
    average_stay_nights = serializers.SerializerMethodField()

    class Meta:
        model = GuestProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "nationality",
            "id_type",
            "id_number",
            "date_of_birth",
            "address",
            "notes",
            "dietary_restrictions",
            "preferences",
            "is_blacklisted",
            "blacklist_reason",
            "tags",
            "loyalty_points",
            "loyalty_tier",
            "total_spend",
            "total_stays",
            "average_stay_nights",
            "created_at",
            "updated_at",
        ]

    def get_loyalty_points(self, obj):
        try:
            return obj.loyalty_account.points_balance
        except Exception:
            return 0

    def get_loyalty_tier(self, obj):
        try:
            return obj.loyalty_account.get_tier_display()
        except Exception:
            return "Bronze"

    def get_total_spend(self, obj):
        from apps.billing.models import Invoice
        invoices = Invoice.objects.filter(reservation__guest=obj)
        return sum(inv.paid_amount for inv in invoices)

    def get_total_stays(self, obj):
        return obj.reservations.exclude(status__in=["cancelled", "no_show"]).count()

    def get_average_stay_nights(self, obj):
        reservations = obj.reservations.exclude(status__in=["cancelled", "no_show"])
        count = reservations.count()
        if count == 0:
            return 0.0
        total_nights = 0
        for res in reservations:
            nights = (res.check_out_date - res.check_in_date).days
            total_nights += max(nights, 1)
        return round(total_nights / count, 1)
