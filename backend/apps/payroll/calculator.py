"""
SIA HMS — Nepal Payroll & Tax Calculator Engine
Calculates SSF contribution and progressive Nepal Income Tax brackets.
"""

import calendar
from decimal import Decimal
from datetime import date
from django.utils import timezone
from apps.staff.models import StaffMember, SalaryType, TaxFilingStatus
from apps.hr.models import Attendance, AttendanceStatus


def get_nepal_income_tax(annual_taxable_income: Decimal, status: str, fiscal_year: str = "2081/82") -> Decimal:
    """
    Calculates Nepal Income Tax based on progressive slabs (FY 2080/2081/2082 rules) from database.
    If registered in SSF, the 1% Social Security Tax on the first slab is waived (0%).
    """
    from apps.payroll.models import TaxSlab

    tax = Decimal("0.00")
    income = annual_taxable_income

    # Query slabs from DB
    db_slabs = list(TaxSlab.objects.filter(fiscal_year=fiscal_year, filing_status=status).order_by("slab_order"))

    if db_slabs:
        brackets = []
        for slab in db_slabs:
            limit = (slab.max_amount - slab.min_amount) if slab.max_amount else None
            # Standard first slab has 1% tax, but since they are SSF registered, the first slab is waived (0%)
            rate = Decimal("0.00") if slab.slab_order == 1 else (slab.rate_percent / Decimal("100.0"))
            brackets.append((limit, rate))
    else:
        # Fallback to hardcoded FY 2081/82 brackets
        if status == TaxFilingStatus.MARRIED:
            brackets = [
                (Decimal("600000"), Decimal("0.00")),
                (Decimal("200000"), Decimal("0.10")),
                (Decimal("300000"), Decimal("0.20")),
                (Decimal("900000"), Decimal("0.30")),
                (Decimal("3000000"), Decimal("0.36")),
                (None, Decimal("0.39"))
            ]
        else:
            brackets = [
                (Decimal("500000"), Decimal("0.00")),
                (Decimal("200000"), Decimal("0.10")),
                (Decimal("300000"), Decimal("0.20")),
                (Decimal("1000000"), Decimal("0.30")),
                (Decimal("3000000"), Decimal("0.36")),
                (None, Decimal("0.39"))
            ]

    for limit, rate in brackets:
        if income <= Decimal("0.00"):
            break
        if limit is None:
            # Top slab
            tax += income * rate
            income = Decimal("0.00")
        else:
            taxable_in_slab = min(income, limit)
            tax += taxable_in_slab * rate
            income -= taxable_in_slab

    return tax


def calculate_payroll_entry_data(staff: StaffMember, month: int, year: int) -> dict:
    """
    Computes payroll statistics and returns dictionary mapping to PayrollEntry database fields.
    """
    total_days = Decimal(calendar.monthrange(year, month)[1])
    
    # 1. Fetch Attendance Logs for the designated month/year
    start_date = date(year, month, 1)
    end_date = date(year, month, int(total_days))
    
    attendances = Attendance.objects.filter(
        staff=staff,
        date__range=(start_date, end_date)
    )
    
    attendance_map = {att.date: att for att in attendances}
    
    present_days = Decimal("0.0")
    absent_days = Decimal("0.0")
    leave_days = Decimal("0.0")
    weekend_days = Decimal("0.0")
    holiday_days = Decimal("0.0")
    overtime_hours = Decimal("0.0")
    
    # Loop over all calendar days in the month
    for d in range(1, int(total_days) + 1):
        curr_date = date(year, month, d)
        att = attendance_map.get(curr_date)
        
        if att:
            overtime_hours += Decimal(str(att.overtime_hours))
            if att.status == AttendanceStatus.PRESENT:
                present_days += Decimal("1.0")
            elif att.status == AttendanceStatus.HALF_DAY:
                present_days += Decimal("0.5")
                absent_days += Decimal("0.5")
            elif att.status == AttendanceStatus.ABSENT:
                absent_days += Decimal("1.0")
            elif att.status == AttendanceStatus.LEAVE:
                leave_days += Decimal("1.0")
            elif att.status == AttendanceStatus.WEEKEND:
                weekend_days += Decimal("1.0")
            elif att.status == AttendanceStatus.HOLIDAY:
                holiday_days += Decimal("1.0")
        else:
            # Default fallback if no log exists
            if curr_date.weekday() == 5: # Saturday is default Nepal weekend
                weekend_days += Decimal("1.0")
            else:
                absent_days += Decimal("1.0")

    working_days = total_days - weekend_days - holiday_days

    # 2. Base salary pro-rating (pro-rate monthly for absences)
    base_salary = Decimal(str(staff.base_salary))
    pro_rated_basic = base_salary
    
    if staff.salary_type == SalaryType.MONTHLY:
        # pro-rate formula
        pro_rated_basic = max(
            Decimal("0.00"),
            base_salary - (base_salary * absent_days / total_days)
        )
    elif staff.salary_type == SalaryType.HOURLY:
        # Hourly pay is computed based on attendance logs:
        # 8 hours/day for Present, 4 hours/day for Half-day
        hours_worked = (present_days * Decimal("8.0"))
        pro_rated_basic = hours_worked * base_salary

    # 3. Overtime Calculations (1.5x hourly rate)
    # Hourly base helper rate: assumes monthly salary / 200 hours as basic
    hourly_rate = (base_salary / Decimal("200.0")) if staff.salary_type == SalaryType.MONTHLY else base_salary
    overtime_rate = hourly_rate * Decimal("1.5")
    overtime_amount = overtime_hours * overtime_rate

    # 4. Standard Allowances & Deductions details
    # For now, default allowances and deductions are empty lists. They can be appended in views.
    allowance_amount = Decimal("0.00")
    deduction_amount = Decimal("0.00")
    
    # Get Nepal Fiscal Year based on month and year
    # July (7) onwards is the new fiscal year
    bs_offset = 57
    bs_year = year + bs_offset
    fy_start = bs_year if month >= 7 else bs_year - 1
    fiscal_year = f"{fy_start}/{str(fy_start + 1)[2:]}"

    # Fetch SSF Config
    from apps.payroll.models import SSFConfig
    ssf_cfg = SSFConfig.objects.filter(fiscal_year=fiscal_year).first()
    if not ssf_cfg:
        # Fallback to active one, or standard 11% / 20%
        ssf_cfg = SSFConfig.objects.filter(is_active=True).first()
    
    if ssf_cfg:
        ssf_employee_rate = ssf_cfg.employee_rate_percent / Decimal("100.0")
        ssf_employer_rate = ssf_cfg.employer_rate_percent / Decimal("100.0")
    else:
        ssf_employee_rate = Decimal("0.11")
        ssf_employer_rate = Decimal("0.20")

    # 5. Nepal SSF Calculations
    ssf_employee = pro_rated_basic * ssf_employee_rate
    ssf_employer = pro_rated_basic * ssf_employer_rate
    
    # 6. Nepal progressive Income Tax (taxable basic minus SSF)
    monthly_taxable = max(
        Decimal("0.00"),
        pro_rated_basic + overtime_amount + allowance_amount - ssf_employee
    )
    annual_taxable = monthly_taxable * Decimal("12.0")
    annual_tax = get_nepal_income_tax(annual_taxable, staff.tax_filing_status, fiscal_year)
    monthly_tax = annual_tax / Decimal("12.0")
    
    # Rounded values
    pro_rated_basic = round(pro_rated_basic, 2)
    overtime_amount = round(overtime_amount, 2)
    ssf_employee = round(ssf_employee, 2)
    ssf_employer = round(ssf_employer, 2)
    monthly_tax = round(monthly_tax, 2)
    
    # Aggregations
    gross_salary = round(pro_rated_basic + overtime_amount + allowance_amount, 2)
    total_deductions = round(ssf_employee + monthly_tax + deduction_amount, 2)
    net_salary = round(gross_salary - total_deductions, 2)

    return {
        "working_days": working_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "leave_days": leave_days,
        "basic_salary": pro_rated_basic,
        "overtime_hours": overtime_hours,
        "overtime_rate": overtime_rate,
        "overtime_amount": overtime_amount,
        "allowances": [],
        "deductions": [],
        "ssf_employee": ssf_employee,
        "ssf_employer": ssf_employer,
        "income_tax": monthly_tax,
        "gross_salary": gross_salary,
        "total_deductions": total_deductions,
        "net_salary": net_salary,
    }
