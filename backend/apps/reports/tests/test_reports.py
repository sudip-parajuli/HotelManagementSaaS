"""
SIA HMS — Reports Tests
"""

from unittest.mock import patch, MagicMock
from datetime import date
from apps.reports import pdf_builders


@patch("apps.reports.pdf_builders.HTML")
@patch("apps.reports.pdf_builders.render_to_string")
def test_pdf_revenue_builder(mock_render, mock_html):
    mock_render.return_value = "<html>Test</html>"
    mock_write_pdf = MagicMock()
    mock_html.return_value.write_pdf = mock_write_pdf
    
    start = date(2026, 6, 1)
    end = date(2026, 6, 14)
    
    pdf_builders.build_revenue_pdf(start, end)
    
    mock_render.assert_called_once()
    mock_html.assert_called_with(string="<html>Test</html>")
    mock_write_pdf.assert_called_once()


@patch("apps.reports.pdf_builders.HTML")
@patch("apps.reports.pdf_builders.render_to_string")
def test_pdf_occupancy_builder(mock_render, mock_html):
    mock_render.return_value = "<html>Test</html>"
    mock_write_pdf = MagicMock()
    mock_html.return_value.write_pdf = mock_write_pdf
    
    start = date(2026, 6, 1)
    end = date(2026, 6, 14)
    
    pdf_builders.build_occupancy_pdf(start, end)
    
    mock_render.assert_called_once()
    mock_write_pdf.assert_called_once()


@patch("apps.reports.pdf_builders.HTML")
@patch("apps.reports.pdf_builders.render_to_string")
def test_pdf_guest_ledger_builder(mock_render, mock_html):
    mock_render.return_value = "<html>Test</html>"
    mock_write_pdf = MagicMock()
    mock_html.return_value.write_pdf = mock_write_pdf
    
    pdf_builders.build_guest_ledger_pdf()
    
    mock_render.assert_called_once()
    mock_write_pdf.assert_called_once()


@patch("apps.reports.pdf_builders.HTML")
@patch("apps.reports.pdf_builders.render_to_string")
def test_pdf_nepal_vat_book_builder(mock_render, mock_html):
    mock_render.return_value = "<html>Test</html>"
    mock_write_pdf = MagicMock()
    mock_html.return_value.write_pdf = mock_write_pdf
    
    start = date(2026, 6, 1)
    end = date(2026, 6, 14)
    
    pdf_builders.build_nepal_vat_book_pdf(start, end)
    
    mock_render.assert_called_once()
    mock_write_pdf.assert_called_once()
