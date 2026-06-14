"""
SIA HMS — Analytics Serializers
Defines serializers for DailyMetric and ReportExport.
"""

from rest_framework import serializers
from .models import DailyMetric, ReportExport


class DailyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetric
        fields = "__all__"


class ReportExportSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source="get_report_type_display", read_only=True)
    
    class Meta:
        model = ReportExport
        fields = [
            "id",
            "report_type",
            "report_type_display",
            "format",
            "status",
            "start_date",
            "end_date",
            "file_path",
            "error_message",
            "task_id",
            "created_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "file_path",
            "error_message",
            "task_id",
            "created_at",
            "completed_at",
        ]
