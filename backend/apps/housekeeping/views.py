"""
SIA HMS — Housekeeping Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.accounts.permissions import IsHousekeeping, IsPropertyManager, IsAnyStaff
from apps.properties.models import Room, RoomStatus
from .models import HousekeepingTask, HousekeepingStatus, HousekeepingPriority, MaintenanceRequest
from .serializers import HousekeepingTaskSerializer, MaintenanceRequestSerializer


class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    queryset = HousekeepingTask.objects.all()
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsAuthenticated, IsHousekeeping | IsPropertyManager]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "board"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()

    @action(detail=True, methods=["put"])
    def status(self, request, pk=None):
        """
        Updates the operational status of a housekeeping task (pending, in_progress, done, skipped, issue_reported)
        """
        task = self.get_object()
        new_status = request.data.get("status")
        
        if new_status not in HousekeepingStatus.values:
            return Response(
                {"error": f"Invalid housekeeping status: {new_status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        with transaction.atomic():
            task.status = new_status
            if new_status == HousekeepingStatus.IN_PROGRESS and not task.started_at:
                task.started_at = timezone.now()
            elif new_status == HousekeepingStatus.DONE:
                task.completed_at = timezone.now()
                # Auto update room to available on completion
                room = task.room
                room.status = RoomStatus.AVAILABLE
                room.save()
            task.save()
            
            self._broadcast_task_update(task, "task_status_updated")
            
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """
        Completes a housekeeping task with notes, optional completion photo.
        Automatically sets the associated room status to available.
        """
        task = self.get_object()
        photo = request.data.get("completion_photo", "")
        notes = request.data.get("notes", "")
        
        with transaction.atomic():
            task.status = HousekeepingStatus.DONE
            task.completion_photo = photo
            if notes:
                task.notes = f"{task.notes}\nCompletion note: {notes}".strip()
            task.completed_at = timezone.now()
            task.save()
            
            # Set room to available
            room = task.room
            room.status = RoomStatus.AVAILABLE
            room.save()
            
            self._broadcast_task_update(task, "task_completed")
            
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=False, methods=["post"])
    def bulk_assign(self, request):
        """
        Bulk assigns a list of tasks to a specific housekeeper user.
        """
        task_ids = request.data.get("task_ids", [])
        user_id = request.data.get("assigned_to_id")
        
        if not task_ids or not user_id:
            return Response(
                {"error": "task_ids and assigned_to_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            housekeeper = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Assigned housekeeper user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
            
        with transaction.atomic():
            tasks = HousekeepingTask.objects.filter(id__in=task_ids)
            for task in tasks:
                task.assigned_to = housekeeper
                task.save()
                self._broadcast_task_update(task, "task_assigned")
                
        return Response({"message": f"Successfully assigned {tasks.count()} tasks."})

    def _broadcast_task_update(self, task, event_type):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
            
        async_to_sync(channel_layer.group_send)(
            "housekeeping",
            {
                "type": "housekeeping.update",
                "data": {
                    "event": event_type,
                    "task_id": task.id,
                    "room_number": task.room.room_number,
                    "status": task.status,
                    "assigned_to_name": task.assigned_to.get_full_name() if task.assigned_to else None,
                    "priority": task.priority,
                    "task_type": task.task_type,
                }
            }
        )


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated, IsHousekeeping | IsPropertyManager]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            self.permission_classes = [IsAuthenticated, IsAnyStaff]
        return super().get_permissions()

    def perform_create(self, serializer):
        with transaction.atomic():
            request_record = serializer.save(reported_by=self.request.user)
            # Auto transition Room status to maintenance
            room = request_record.room
            room.status = RoomStatus.MAINTENANCE
            room.save()
            
            # Create a housekeeping check task associated with it
            HousekeepingTask.objects.create(
                room=room,
                task_type="maintenance",
                priority=HousekeepingPriority.HIGH,
                triggered_by="maintenance_request",
                notes=f"Maintenance inspection reported: {request_record.description}",
            )

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """
        Resolves a reported maintenance request, logs notes, and shifts Room back to dirty.
        """
        m_request = self.get_object()
        notes = request.data.get("resolution_notes", "")
        
        if m_request.status == MaintenanceRequest.MaintenanceStatus.RESOLVED:
            return Response(
                {"error": "Maintenance request is already resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        with transaction.atomic():
            m_request.status = MaintenanceRequest.MaintenanceStatus.RESOLVED
            m_request.resolved_by = request.user
            m_request.resolution_notes = notes
            m_request.resolved_at = timezone.now()
            m_request.save()
            
            # Transition room to dirty (cleaning required after repair work)
            room = m_request.room
            room.status = RoomStatus.DIRTY
            room.save()
            
        return Response(MaintenanceRequestSerializer(m_request).data)


class HousekeepingBoardViewSet(viewsets.ViewSet):
    """
    Exposes full board metrics aggregating all hotel rooms and their active/pending tasks.
    """
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def list(self, request):
        rooms = Room.objects.filter(is_active=True).select_related("room_type")
        active_tasks = HousekeepingTask.objects.exclude(
            status=HousekeepingStatus.DONE
        ).select_related("room", "assigned_to")
        
        # Map tasks to room
        task_map = {}
        for task in active_tasks:
            task_map[task.room_id] = HousekeepingTaskSerializer(task).data
            
        board_data = []
        for r in rooms:
            board_data.append({
                "room_id": r.id,
                "room_number": r.room_number,
                "floor": r.floor,
                "room_type_name": r.room_type.name,
                "status": r.status,
                "active_task": task_map.get(r.id, None),
            })
            
        return Response(board_data)
