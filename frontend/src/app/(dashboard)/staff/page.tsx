"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Briefcase, 
  Building2, 
  Edit3, 
  FileText, 
  Lock, 
  CreditCard,
  AlertCircle,
  Trash2
} from "lucide-react";
import { staffApi } from "@/lib/api/staff";
import type { StaffMember, Department, StaffDocument, EmploymentType, SalaryType, TaxFilingStatus, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function StaffDirectoryPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<number | "all">("all");
  const [selectedEmpType, setSelectedEmpType] = useState<string | "all">("all");

  // Sheet: Create/Edit Member
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "FRONT_DESK" as UserRole,
    password: "",
    department: "",
    designation: "",
    hire_date: "",
    employment_type: "full_time" as EmploymentType,
    base_salary: "",
    salary_type: "monthly" as SalaryType,
    bank_name: "",
    bank_account_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    tax_filing_status: "single" as TaxFilingStatus,
    attendance_pin: "1234",
    is_active: true
  });

  // Dialog: Manage Documents
  const [activeMemberForDocs, setActiveMemberForDocs] = useState<StaffMember | null>(null);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("citizenship");
  const [docExpiry, setDocExpiry] = useState("");
  const [docNotes, setDocNotes] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, deptsRes] = await Promise.all([
        staffApi.listStaffMembers(),
        staffApi.listDepartments()
      ]);
      setMembers(membersRes.data.results || []);
      setDepartments(deptsRes.data.results || []);
    } catch (err) {
      console.error("Error fetching staff data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter members
  useEffect(() => {
    let result = [...members];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(term) ||
          m.email.toLowerCase().includes(term) ||
          m.designation.toLowerCase().includes(term)
      );
    }

    if (selectedDept !== "all") {
      result = result.filter((m) => m.department === selectedDept);
    }

    if (selectedEmpType !== "all") {
      result = result.filter((m) => m.employment_type === selectedEmpType);
    }

    setFilteredMembers(result);
  }, [members, searchTerm, selectedDept, selectedEmpType]);

  // Open create form
  const handleCreateOpen = () => {
    setEditingMember(null);
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      role: "FRONT_DESK",
      password: "",
      department: departments[0]?.id.toString() || "",
      designation: "",
      hire_date: new Date().toISOString().split("T")[0],
      employment_type: "full_time",
      base_salary: "20000.00",
      salary_type: "monthly",
      bank_name: "",
      bank_account_number: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      tax_filing_status: "single",
      attendance_pin: "1234",
      is_active: true
    });
    setIsSheetOpen(true);
  };

  // Open edit form
  const handleEditOpen = (member: StaffMember) => {
    setEditingMember(member);
    setFormData({
      email: member.email,
      first_name: member.user.first_name,
      last_name: member.user.last_name,
      phone: member.user.phone || "",
      role: member.user.role,
      password: "", // do not populate password
      department: member.department.toString(),
      designation: member.designation,
      hire_date: member.hire_date,
      employment_type: member.employment_type,
      base_salary: member.base_salary,
      salary_type: member.salary_type,
      bank_name: member.bank_name || "",
      bank_account_number: member.bank_account_number || "",
      emergency_contact_name: member.emergency_contact_name || "",
      emergency_contact_phone: member.emergency_contact_phone || "",
      tax_filing_status: member.tax_filing_status,
      attendance_pin: member.attendance_pin,
      is_active: member.is_active
    });
    setIsSheetOpen(true);
  };

  // Form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.department || !formData.attendance_pin) return;

    const payload: any = {
      user: {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active
      },
      department: parseInt(formData.department),
      designation: formData.designation,
      hire_date: formData.hire_date,
      employment_type: formData.employment_type,
      base_salary: parseFloat(formData.base_salary),
      salary_type: formData.salary_type,
      bank_name: formData.bank_name,
      bank_account_number: formData.bank_account_number,
      emergency_contact_name: formData.emergency_contact_name,
      emergency_contact_phone: formData.emergency_contact_phone,
      tax_filing_status: formData.tax_filing_status,
      attendance_pin: formData.attendance_pin,
      is_active: formData.is_active
    };

    if (formData.password) {
      payload.user.password = formData.password;
    }

    try {
      if (editingMember) {
        await staffApi.updateStaffMember(editingMember.id, payload);
      } else {
        await staffApi.createStaffMember(payload);
      }
      setIsSheetOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving staff member", err);
    }
  };

  // Documents
  const fetchDocs = async (member: StaffMember) => {
    setIsDocsLoading(true);
    try {
      const docsRes = await staffApi.listDocuments({ staff: member.id });
      setDocuments(docsRes.data.results || []);
    } catch (err) {
      console.error("Error fetching documents", err);
    } finally {
      setIsDocsLoading(false);
    }
  };

  const handleOpenDocs = (member: StaffMember) => {
    setActiveMemberForDocs(member);
    fetchDocs(member);
    setDocFile(null);
    setDocExpiry("");
    setDocNotes("");
  };

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMemberForDocs || !docFile) return;

    const data = new FormData();
    data.append("staff", activeMemberForDocs.id.toString());
    data.append("document_type", docType);
    data.append("file", docFile);
    if (docExpiry) data.append("expiry_date", docExpiry);
    data.append("notes", docNotes);

    try {
      await staffApi.uploadDocument(data);
      setDocFile(null);
      setDocExpiry("");
      setDocNotes("");
      fetchDocs(activeMemberForDocs);
    } catch (err) {
      console.error("Error uploading document", err);
    }
  };

  const handleDocDelete = async (id: number) => {
    if (!activeMemberForDocs) return;
    try {
      await staffApi.deleteDocument(id);
      fetchDocs(activeMemberForDocs);
    } catch (err) {
      console.error("Error deleting document", err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Staff Directory
          </h1>
          <p className="text-muted-foreground text-sm">
            Employee profiles, departmental rosters, tax status, and KYC verification records.
          </p>
        </div>
        <div>
          <Button onClick={handleCreateOpen} className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-900/30 p-4 rounded-xl border border-slate-850/80 backdrop-blur-md">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, email or job designation..."
            className="pl-9 bg-slate-950/50 border-slate-800 text-white"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="w-full h-10 px-3 rounded-md bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <select
            value={selectedEmpType}
            onChange={(e) => setSelectedEmpType(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-slate-950/50 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Contract Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contractor</option>
          </select>
        </div>
      </div>

      {/* Roster Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/10 border border-slate-850/50 rounded-xl space-y-3">
          <Users className="h-12 w-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 font-medium">No team members match the search filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="bg-slate-900/20 border-slate-800/80 hover:border-slate-700/60 shadow-xl overflow-hidden hover:shadow-indigo-950/10 transition-all flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                {/* Header Card details */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center font-bold text-lg text-indigo-400 border border-slate-800 overflow-hidden">
                      {member.profile_photo_url ? (
                        <img src={member.profile_photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{member.user.first_name[0]}{member.user.last_name[0]}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{member.full_name}</h3>
                      <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3" />
                        {member.designation}
                      </p>
                    </div>
                  </div>
                  <Badge variant={member.is_active ? "outline" : "secondary"} className={member.is_active ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-slate-800 text-slate-500"}>
                    {member.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Details list */}
                <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Department: <span className="text-white font-medium">{member.department_name}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      <span>{member.user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Attendance PIN: <span className="font-mono text-white font-bold">{member.attendance_pin}</span></span>
                  </div>
                </div>

                {/* Info block for Salary / Emergency */}
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 text-[11px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contract type:</span>
                    <span className="text-slate-300 font-bold capitalize">{member.employment_type.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Basic salary:</span>
                    <span className="text-emerald-400 font-bold">Rs. {parseFloat(member.base_salary).toLocaleString()} / {member.salary_type}</span>
                  </div>
                  {member.emergency_contact_name && (
                    <div className="flex justify-between pt-1 border-t border-slate-900/60">
                      <span className="text-slate-500">Emergency:</span>
                      <span className="text-slate-300 font-semibold">{member.emergency_contact_name} ({member.emergency_contact_phone})</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="bg-slate-950/30 p-3 border-t border-slate-900 flex justify-between gap-3">
                <Button onClick={() => handleOpenDocs(member)} variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  Documents
                </Button>
                <Button onClick={() => handleEditOpen(member)} variant="ghost" size="sm" className="h-8 text-indigo-400 hover:bg-slate-800/80 hover:text-white flex items-center gap-1.5 text-xs">
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet: Add / Edit Staff */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-slate-900 border-slate-800 text-white overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-xl font-bold text-white">
              {editingMember ? "Edit Staff Member" : "New Staff Registration"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 text-slate-300 pb-8">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850/80 space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Account Credentials</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="fname">First Name *</Label>
                  <Input 
                    id="fname"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lname">Last Name *</Label>
                  <Input 
                    id="lname"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="role">Role Permission *</Label>
                  <select 
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1"
                    required
                  >
                    <option value="PROPERTY_MANAGER">Property Manager</option>
                    <option value="FRONT_DESK">Front Desk Agent</option>
                    <option value="HOUSEKEEPING">Housekeeper Staff</option>
                    <option value="RESTAURANT_STAFF">F&B Waiter / Staff</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="ACCOUNTANT">Accountant</option>
                  </select>
                </div>
                {!editingMember && (
                  <div className="space-y-1">
                    <Label htmlFor="password">Login Password *</Label>
                    <Input 
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white" 
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850/80 space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Employment Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dept">Department *</Label>
                  <select 
                    id="dept"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-1"
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desig">Designation Title *</Label>
                  <Input 
                    id="desig"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white"
                    placeholder="e.g. Executive Chef, General Clerk"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="hire_date">Date of Hire</Label>
                  <Input 
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emptype">Contract Type</Label>
                  <select 
                    id="emptype"
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as EmploymentType })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="salary">Base Salary (NPR) *</Label>
                  <Input 
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="salary_t">Calculation</Label>
                  <select 
                    id="salary_t"
                    value={formData.salary_type}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value as SalaryType })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850/80 space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">KYC, Bank & PIN settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tax_status">Tax Filing status</Label>
                  <select 
                    id="tax_status"
                    value={formData.tax_filing_status}
                    onChange={(e) => setFormData({ ...formData, tax_filing_status: e.target.value as TaxFilingStatus })}
                    className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none"
                  >
                    <option value="single">Single (NPR 500k base slab)</option>
                    <option value="married">Married (NPR 600k base slab)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pin">Attendance Clock-in PIN *</Label>
                  <Input 
                    id="pin"
                    maxLength={4}
                    value={formData.attendance_pin}
                    onChange={(e) => setFormData({ ...formData, attendance_pin: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white font-mono font-bold" 
                    placeholder="e.g. 1234"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="bname">Bank Name</Label>
                  <Input 
                    id="bname"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="baccount">Bank Account Number</Label>
                  <Input 
                    id="baccount"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="emname">Emergency Contact Name</Label>
                  <Input 
                    id="emname"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emphone">Emergency Contact Phone</Label>
                  <Input 
                    id="emphone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="is_active_input"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded border-slate-800 bg-slate-950"
                />
                <Label htmlFor="is_active_input" className="cursor-pointer select-none">Active Employment Status</Label>
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white mt-6">
              {editingMember ? "Save Profile Changes" : "Register Team Member"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Document Management */}
      <Dialog open={activeMemberForDocs !== null} onOpenChange={() => setActiveMemberForDocs(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <FileText className="h-5 w-5 text-indigo-400" />
              KYC & Document Records — {activeMemberForDocs?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Left: Upload Document */}
            <form onSubmit={handleDocUpload} className="space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Upload Verification Document</h4>
              <div className="space-y-1">
                <Label>Document Type *</Label>
                <select 
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none"
                  required
                >
                  <option value="citizenship">Citizenship Card (Nepal)</option>
                  <option value="passport">Passport Copy</option>
                  <option value="contract">Signed Contract</option>
                  <option value="certificate">Training Certificate</option>
                  <option value="other">Other Document</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Document File *</Label>
                <Input 
                  type="file"
                  onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
                  className="bg-slate-950 border-slate-800 text-white cursor-pointer text-xs" 
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Expiration Date (if applicable)</Label>
                <Input 
                  type="date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white" 
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input 
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="e.g. Front page, scan copy"
                  className="bg-slate-950 border-slate-800 text-white text-xs" 
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white h-9">
                Upload File
              </Button>
            </form>

            {/* Right: Listed Documents */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Uploaded Documents</h4>
              {isDocsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-lg border border-slate-850/60 text-slate-500 text-xs">
                  No verified files uploaded.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-white text-xs capitalize">{doc.document_type.replace("_", " ")}</div>
                        {doc.notes && <div className="text-[10px] text-slate-500 truncate">{doc.notes}</div>}
                        {doc.expiry_date && (
                          <div className="text-[10px] text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expires: {doc.expiry_date}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                            View
                          </a>
                        )}
                        <Button onClick={() => handleDocDelete(doc.id)} size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:bg-slate-800">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
