"""
SIA HMS — CRM App Views
Defines GuestTagViewSet, GuestActivityViewSet, CampaignViewSet, and GuestPortfolioViewSet.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.permissions import IsPropertyManager, IsAnyStaff
from apps.bookings.models import GuestProfile
from .models import GuestTag, GuestActivity, Campaign
from .serializers import (
    GuestTagSerializer,
    GuestActivitySerializer,
    CampaignSerializer,
    GuestProfilePortfolioSerializer,
)


class GuestTagViewSet(viewsets.ModelViewSet):
    """
    CRUD for Guest segmentation tags.
    """
    queryset = GuestTag.objects.all()
    serializer_class = GuestTagSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class GuestActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for Guest Activities. Filtered by guest.
    """
    queryset = GuestActivity.objects.select_related("guest").all()
    serializer_class = GuestActivitySerializer
    permission_classes = [IsAnyStaff]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["guest", "activity_type"]
    ordering_fields = ["created_at"]


class CampaignViewSet(viewsets.ModelViewSet):
    """
    CRUD for marketing campaigns.
    """
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    @action(detail=True, methods=["post"])
    def dispatch(self, request, pk=None):
        """
        Simulates dispatching SMS/email campaigns to targeted guest groups.
        """
        campaign = self.get_object()
        if campaign.status == "sent":
            return Response({"error": "Campaign has already been sent."}, status=status.HTTP_400_BAD_REQUEST)

        # In real-world, connect to SparrowSMS or any standard Nepal SMS API gateway.
        # Here we mock the delivery and update the status.
        campaign.status = "sent"
        campaign.save()

        # Log guest activity for targeted profiles
        # For simplicity, log for guests tagged or all guests if no filters apply
        # Mock active dispatch tracking
        guests = GuestProfile.objects.filter(is_blacklisted=False)[:5]  # Target some sample guests
        for guest in guests:
            GuestActivity.objects.create(
                guest=guest,
                activity_type="profile_update",
                description=f"Received marketing SMS campaign: {campaign.name}",
            )

        return Response(
            {
                "message": f"Campaign '{campaign.name}' successfully sent to {guests.count()} guests.",
                "campaign": CampaignSerializer(campaign).data,
            },
            status=status.HTTP_200_OK,
        )


class GuestPortfolioViewSet(viewsets.ModelViewSet):
    """
    View set for viewing Guest Profile portfolios with spend summaries and loyalty badges.
    """
    queryset = GuestProfile.objects.prefetch_related("tags", "loyalty_account").all()
    serializer_class = GuestProfilePortfolioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_blacklisted", "tags"]
    search_fields = ["first_name", "last_name", "phone", "email"]
    ordering_fields = ["created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAnyStaff()]
        return [IsPropertyManager()]

    @action(detail=True, methods=["post"])
    def tag_guest(self, request, pk=None):
        """
        Tags a guest profile with a segmentation tag.
        """
        guest = self.get_object()
        tag_id = request.data.get("tag_id")
        if not tag_id:
            return Response({"error": "tag_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tag = GuestTag.objects.get(pk=tag_id)
        except GuestTag.DoesNotExist:
            return Response({"error": "Tag not found."}, status=status.HTTP_404_NOT_FOUND)

        tag.guests.add(guest)
        # Audit log activity
        GuestActivity.objects.create(
            guest=guest,
            activity_type="profile_update",
            description=f"Tagged as {tag.name}",
        )

        return Response(GuestProfilePortfolioSerializer(guest).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def untag_guest(self, request, pk=None):
        """
        Removes a segmentation tag from a guest profile.
        """
        guest = self.get_object()
        tag_id = request.data.get("tag_id")
        if not tag_id:
            return Response({"error": "tag_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tag = GuestTag.objects.get(pk=tag_id)
        except GuestTag.DoesNotExist:
            return Response({"error": "Tag not found."}, status=status.HTTP_404_NOT_FOUND)

        tag.guests.remove(guest)
        GuestActivity.objects.create(
            guest=guest,
            activity_type="profile_update",
            description=f"Removed tag: {tag.name}",
        )

        return Response(GuestProfilePortfolioSerializer(guest).data, status=status.HTTP_200_OK)
