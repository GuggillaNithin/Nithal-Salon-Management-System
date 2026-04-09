"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast-provider";
import useSWR from "swr";
import { Menu, X, Users, Scissors, BookCheck, LogOut, Briefcase, BarChart, Search, Trash2, Edit, Calendar, History, Clock, Loader2 } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DonutChart } from "@/components/ui/donut-chart";
import { motion, AnimatePresence } from "framer-motion";
import { PaymentChartWidget } from "@/components/ui/payment-chart";

// Types
type Customer = { id: string; name: string; phone: string; };
type Category = { id: string; name: string; };
type Service = { id: string; name: string; price: number; categoryId: string | null; category?: Category | null; };
type Staff = { id: string; name: string; gender: string; };
type VisitServiceItem = { id: string; service: Service; };
type Visit = { id: string; createdAt: string; totalAmount: number; finalAmount: number; discountType: string | null; discountValue: number | null; paymentMethod: string; staffId: string | null; staff?: Staff; customer: Customer; services: VisitServiceItem[]; };
type Tenant = { id: string; name: string; };
type User = { id: string; name: string; email: string; role: string; createdAt: string; };
type Reports = { 
  overallRevenue: number;
  filtered: {
    totalRevenue: number;
    breakdown: { cash: number; gpay: number; phonepe: number; card: number; };
    chartData: { date: string; revenue: number }[];
    staffRevenue: { label: string; value: number; color: string }[];
    totalCustomers: number;
    totalServices: number;
    totalVisits: number;
  }
};
type Attendance = { id: string; date: string; loginTime: string | null; logoutTime: string | null; totalHours: number | null; staffId: string; staff: Staff; };

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
});

export default function Dashboard() {
  const { data: session, status } = useSession({ required: true, onUnauthenticated() {
    window.location.href = "/";
  }});
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"customers" | "services" | "visits" | "staff" | "reports" | "attendance">("customers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // SWR queries
  const [reportStartDate, setReportStartDate] = useState<string>("");
  const [reportEndDate, setReportEndDate] = useState<string>("");

  const { data: tenant } = useSWR<Tenant>("/api/tenant", fetcher);
  const { data: customers, mutate: mutateCustomers } = useSWR<Customer[]>("/api/customer", fetcher);
  const { data: services, mutate: mutateServices } = useSWR<Service[]>("/api/service", fetcher);
  const { data: employees, mutate: mutateEmployees } = useSWR<Staff[]>("/api/staff", fetcher);
  const { data: visits, mutate: mutateVisits } = useSWR<Visit[]>("/api/visit", fetcher);
  
  const reportQuery = `startDate=${reportStartDate}&endDate=${reportEndDate}`;
  const { data: reports, mutate: mutateReports } = useSWR<Reports>(`/api/reports?${reportQuery}`, fetcher);

  const [hoveredStaff, setHoveredStaff] = useState<string | null>(null);

  // Attendance filter
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); // Monday
    return d.toISOString().split('T')[0];
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 7); // Sunday
    return d.toISOString().split('T')[0];
  });

  const attendanceQuery = `startDate=${attendanceStartDate}&endDate=${attendanceEndDate}`;
  const { data: attendances, mutate: mutateAttendance } = useSWR<Attendance[]>(`/api/attendance?${attendanceQuery}`, fetcher);

  // Customer forms
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Service forms
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Category Forms
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: categories, mutate: mutateCategories } = useSWR<Category[]>("/api/category", fetcher);

  // Employee Forms
  const [employeeName, setEmployeeName] = useState("");
  const [employeeGender, setEmployeeGender] = useState("Female");
  
  // Point of Sale (Visits) States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visitCustomerName, setVisitCustomerName] = useState("");
  const [visitCustomerPhone, setVisitCustomerPhone] = useState("");
  
  const [query, setQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  
  const [staffQuery, setStaffQuery] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [filteredEmployees, setFilteredEmployees] = useState<Staff[]>([]);

  const [visitTotal, setVisitTotal] = useState(0);

  // Discount Modifiers + Settings Map
  type PaymentSplit = { method: string; amount: number };
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [splitMethod, setSplitMethod] = useState("cash");
  const [splitAmount, setSplitAmount] = useState<number | "">("");
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [finalAmount, setFinalAmount] = useState(0);

  // Service editing state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServicePrice, setEditServicePrice] = useState<string>("");
  const [editServiceCategoryId, setEditServiceCategoryId] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({}); 

  // Attendance Form
  const [attStaffId, setAttStaffId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attLogin, setAttLogin] = useState("");
  const [attLogout, setAttLogout] = useState("");

  const setLoader = (key: string, value: boolean) => {
    setIsLoading(prev => ({ ...prev, [key]: value }));
  };

  const isAdmin = (session?.user as any)?.role === "admin";

  const setDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setReportEndDate(end.toISOString().split("T")[0]);
    setReportStartDate(start.toISOString().split("T")[0]);
  };

  // Autocomplete Search Logic (Services)
  useEffect(() => {
    if (!services || !query.trim()) {
      setFilteredServices([]);
      return;
    }
    const filtered = services.filter((s) =>
      s.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredServices(filtered);
  }, [query, services]);

  // Autocomplete Search Logic (Staff Employees)
  useEffect(() => {
    if (!employees || !staffQuery.trim()) {
      setFilteredEmployees([]);
      return;
    }
    const filtered = employees.filter((s) =>
      s.name.toLowerCase().includes(staffQuery.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [staffQuery, employees]);

  // Calculate live Visit base total & discounted finalAmount securely mimicking backend logic
  useEffect(() => {
    const baseTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    setVisitTotal(baseTotal);

    let final = baseTotal;
    const dv = Number(discountValue) || 0;

    if (discountType === "percentage") {
      const maxDv = Math.min(Math.max(dv, 0), 100);
      final = baseTotal - (baseTotal * maxDv) / 100;
    } else if (discountType === "amount") {
      const maxDv = Math.min(Math.max(dv, 0), baseTotal);
      final = baseTotal - maxDv;
    }

    setFinalAmount(Math.round(Math.max(0, final)));
  }, [selectedServices, discountType, discountValue]);

  // Actions
  async function addCustomer() {
    if (isLoading['addCustomer']) return;
    try {
      setLoader('addCustomer', true);
      setError("");
      const res = await fetch("/api/customer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add customer");
      setName(""); setPhone(""); mutateCustomers(); mutateReports();
      showToast("Success", "Customer added successfully", "success");
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader('addCustomer', false);
    }
  }

  async function addCategory() {
    if (isLoading['addCategory']) return;
    try {
      setLoader('addCategory', true);
      setError("");
      const res = await fetch("/api/category", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategoryName }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add category");
      setNewCategoryName(""); mutateCategories();
      showToast("Success", "Category created", "success");
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader('addCategory', false);
    }
  }

  async function addService() {
    if (isLoading['addService']) return;
    try {
      setLoader('addService', true);
      setError("");
      const res = await fetch("/api/service", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: serviceName, price: Number(price), categoryId }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add service");
      setServiceName(""); setPrice(""); setCategoryId(""); mutateServices(); mutateReports();
      showToast("Success", "Service added correctly", "success");
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader('addService', false);
    }
  }

  function startEditService(service: Service) {
    setEditingServiceId(service.id);
    setEditServiceName(service.name);
    setEditServicePrice(String(service.price));
    setEditServiceCategoryId((service as any).categoryId || "");
  }

  async function saveEditService() {
    if (!editingServiceId || isLoading['editService']) return;
    try {
      setLoader('editService', true);
      setError("");
      const res = await fetch(`/api/service/${editingServiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editServiceName, price: Number(editServicePrice), categoryId: editServiceCategoryId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update service");
      setEditingServiceId(null);
      mutateServices(); mutateReports();
      showToast("Updated", "Service updated successfully", "success");
    } catch (err: any) {
      setError(err.message);
      showToast("Error", err.message, "error");
    } finally {
      setLoader('editService', false);
    }
  }

  async function addEmployee() {
    if (isLoading['addEmployee']) return;
    try {
      setLoader('addEmployee', true);
      setError("");
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: employeeName, gender: employeeGender }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add employee");
      setEmployeeName(""); setEmployeeGender("Female"); mutateEmployees();
      showToast("Success", "Staff member added", "success");
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader('addEmployee', false);
    }
  }

  async function addAttendance() {
    if (isLoading['addAttendance']) return;
    if (!attStaffId || !attDate) {
      showToast("Error", "Staff and date are required", "error");
      return;
    }
    try {
      setLoader('addAttendance', true);
      setError("");
      const res = await fetch("/api/attendance", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          staffId: attStaffId, 
          date: attDate, 
          loginTime: attLogin, 
          logoutTime: attLogout 
        }) 
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save attendance");
      setAttLogin(""); setAttLogout(""); mutateAttendance();
      showToast("Saved", "Attendance record updated", "success");
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader('addAttendance', false);
    }
  }

  const getWeeklyStats = () => {
    if (!attendances || !employees) return [];
    
    return employees.map(emp => {
      const empAttendances = attendances.filter(a => a.staffId === emp.id);
      const totalHours = empAttendances.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
      const daysWorked = empAttendances.filter(a => a.loginTime).length;
      return {
        ...emp,
        totalHours: Number(totalHours.toFixed(2)),
        daysWorked
      };
    });
  };

  // POS Visit specific operations
  function addServiceToVisit(service: Service) {
    if (!selectedServices.find(s => s.id === service.id)) {
      setSelectedServices([...selectedServices, service]);
    }
    setQuery("");
  }

  function removeServiceFromVisit(id: string) {
    setSelectedServices(selectedServices.filter(s => s.id !== id));
  }

  function editVisit(visit: Visit) {
    setEditingId(visit.id);
    setVisitCustomerName(visit.customer.name);
    setVisitCustomerPhone(visit.customer.phone);
    setSelectedServices(visit.services.map(s => s.service));
    
    if (visit.paymentMethod?.startsWith('[')) {
      try {
        setPaymentSplits(JSON.parse(visit.paymentMethod));
      } catch(e) {
        setPaymentSplits([{ method: visit.paymentMethod || "cash", amount: visit.finalAmount }]);
      }
    } else {
      setPaymentSplits([{ method: visit.paymentMethod || "cash", amount: visit.finalAmount }]);
    }
    
    setDiscountType((visit.discountType as any) || "percentage");
    setDiscountValue(visit.discountValue || "");

    setSelectedStaffId(visit.staffId || "");

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setVisitCustomerName("");
    setVisitCustomerPhone("");
    setSelectedServices([]);
    setPaymentSplits([]);
    setSplitMethod("cash");
    setSplitAmount("");
    setDiscountType("percentage");
    setDiscountValue("");
    setSelectedStaffId("");
    setQuery("");
    setStaffQuery("");
  }

  async function handleCheckoutSubmit() {
    if (isLoading['checkout']) return;
    try {
      setLoader('checkout', true);
      setError("");
      const currentSplitsAmount = paymentSplits.reduce((acc, sum) => acc + sum.amount, 0);
      if (currentSplitsAmount !== finalAmount && finalAmount > 0) {
        showToast("Error", `Split payments (₹${currentSplitsAmount}) must equal the exact Final Amount (₹${finalAmount}).`, "error");
        setLoader('checkout', false);
        return;
      }

      const payload = {
        serviceIds: selectedServices.map(s => s.id),
        paymentMethod: JSON.stringify(paymentSplits.length > 0 ? paymentSplits : [{ method: "cash", amount: finalAmount }]),
        discountType,
        discountValue: Number(discountValue) || 0,
        staffId: selectedStaffId || null,
        finalAmount
      };

      if (editingId) {
        // Edit mode (PUT logic)
        const res = await fetch(`/api/visit/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update visit");
        showToast("Updated", "Bill updated successfully", "success");
      } else {
        // Create mode (POST logic)
        const res = await fetch("/api/customer-visit", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            name: visitCustomerName,
            phone: visitCustomerPhone,
            ...payload
          }) 
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to log visit checkout");
        showToast("Success", "Bill processed successfully", "success");
      }
      cancelEdit();
      mutateVisits(); 
      mutateCustomers(); 
      mutateReports();
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader('checkout', false);
    }
  }

  async function softDelete(id: string, endpoint: string, mutator: any) {
    if (isLoading[`delete-${id}`]) return;
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      setLoader(`delete-${id}`, true);
      setError("");
      const res = await fetch(`/api/${endpoint}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete");
      mutator(); mutateReports();
      showToast("Deleted", "Item removed successfully", "success");
    } catch (err: any) { 
      setError(err.message); 
      showToast("Error", err.message, "error");
    } finally {
      setLoader(`delete-${id}`, false);
    }
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-100">Loading dashboard...</div>;
  }

  const tabs = [
    { id: "customers", label: "Customers", icon: Users },
    { id: "services", label: "Services", icon: Scissors },
    { id: "visits", label: "Point of Sale", icon: BookCheck },
    { id: "staff", label: "Employees", icon: Briefcase },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "reports", label: "Reports", icon: BarChart },
  ] as const;

  const handleTabChange = (tabId: "customers" | "services" | "visits" | "staff" | "reports" | "attendance") => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-surface text-on-surface overflow-hidden font-body">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Edit Service Modal */}
      {editingServiceId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingServiceId(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Scissors className="text-primary" size={20} />
                <h3 className="text-base font-bold text-on-surface">Edit Service</h3>
              </div>
              <button onClick={() => setEditingServiceId(null)} className="text-on-surface-variant hover:text-on-surface transition p-1 rounded-lg hover:bg-surface-container">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Service Name</label>
                <input
                  autoFocus
                  className="w-full border-0 border-b-2 border-outline-variant/30 bg-transparent py-2 text-on-surface font-bold focus:outline-none focus:border-primary transition-all placeholder:text-slate-300"
                  placeholder="e.g. Skin Fade"
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Price (Rs.)</label>
                <input
                  type="number" min="0"
                  className="w-full border-0 border-b-2 border-outline-variant/30 bg-transparent py-2 text-on-surface font-bold focus:outline-none focus:border-primary transition-all placeholder:text-slate-300"
                  placeholder="0.00"
                  value={editServicePrice}
                  onChange={(e) => setEditServicePrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Category</label>
                <select
                  className="w-full border-0 border-b-2 border-outline-variant/30 bg-transparent py-2 text-on-surface font-bold focus:outline-none focus:border-primary transition-all"
                  value={editServiceCategoryId}
                  onChange={(e) => setEditServiceCategoryId(e.target.value)}
                >
                  <option value="">No Category</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={saveEditService}
                disabled={!editServiceName || !editServicePrice || isLoading['editService']}
                className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {isLoading['editService'] ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading['editService'] ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingServiceId(null)}
                className="px-5 py-3 border border-outline-variant/30 text-on-surface-variant font-bold rounded-xl hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-100 bg-white flex flex-col py-6 px-4 backdrop-blur-md transition-transform duration-300 md:static md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 px-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary font-headline max-w-[150px] truncate">
              {tenant?.name ?? "The Atelier"}
            </h1>
            <p className="text-on-surface-variant/60 text-xs font-bold uppercase tracking-widest mt-1">Premium Management</p>
          </div>
          <button className="md:hidden text-on-surface-variant hover:text-primary transition" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${
                  isActive 
                    ? "bg-[#610b83] text-white rounded-lg shadow-md shadow-primary/20 scale-100 active:scale-95" 
                    : "text-on-surface-variant hover:text-primary hover:bg-primary/5 group rounded-lg"
                }`}
              >
                <Icon size={18} className={isActive ? "opacity-100" : "group-hover:text-primary opacity-80"} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-1 border-t border-slate-50">
          <div className="flex items-center gap-3 px-4 py-3 text-on-surface-variant group">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs ring-2 ring-primary-container/10 shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-on-surface leading-tight truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-on-surface-variant font-medium truncate">
                {(session?.user as any)?.role === "admin" ? "Lead Admin" : "Staff Member"}
              </p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 text-on-surface-variant hover:text-error px-4 py-3 transition-colors hover:bg-error/5 group rounded-lg">
            <LogOut size={18} className="group-hover:text-error opacity-80" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-surface w-full">
        {/* Top Navbar Header */}
        <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex justify-between items-center md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-on-surface-variant hover:text-primary transition rounded-lg hover:bg-primary/5">
            <Menu size={24} />
          </button>
          <span className="font-bold font-headline text-on-surface">{tabs.find(t => t.id === activeTab)?.label}</span>
          <div className="w-8 h-8 rounded-full border border-slate-200 bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container text-xs shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scroll-smooth">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="hidden md:flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">{tabs.find(t => t.id === activeTab)?.label}</h2>
                <p className="text-on-surface-variant mt-1 font-medium">{
                  activeTab === 'customers' ? "Curate and manage your salon's clientele" :
                  activeTab === 'services' ? "Manage your service catalog and prices" :
                  activeTab === 'visits' ? "Process checkouts and manage point of sale" :
                  activeTab === 'staff' ? "Manage staff members and their roles" :
                  activeTab === 'attendance' ? "Track employee work hours and attendance" :
                  "View business analytics and performance"
                }</p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-error-container/20 bg-error-container px-5 py-4 text-sm text-on-error-container flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                <span className="bg-error/10 p-1 rounded-full text-error"><X size={14}/></span>
                {error}
              </div>
            )}

            {/* Customers View */}
            {activeTab === "customers" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {isAdmin && (
                  <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                    <div className="flex items-center gap-2 mb-6">
                      <Users className="text-primary-container" size={24} />
                      <h3 className="text-lg font-bold text-on-surface font-headline">Add New Customer</h3>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Customer Name</label>
                        <input className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300" placeholder="e.g. Julianne Moore" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Phone Number</label>
                        <input className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="pt-4 flex items-end">
                        <button 
                          onClick={addCustomer} 
                          disabled={!name || !phone || isLoading['addCustomer']} 
                          className="w-full md:w-auto px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading['addCustomer'] && <Loader2 className="h-4 w-4 animate-spin" />}
                          {isLoading['addCustomer'] ? "Creating..." : "Create"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="text-primary-container" size={24} />
                    <h3 className="text-lg font-bold text-on-surface font-headline">Customer Directory</h3>
                  </div>
                  {!customers ? (
                    <div className="flex justify-center p-8 text-on-surface-variant animate-pulse">Loading directory...</div>
                  ) : customers.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant">No customers registered yet.</div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {customers.map((customer) => (
                        <li key={customer.id} className="group rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5 transition-all hover:bg-surface-container-lowest hover:border-outline-variant/30 relative">
                          <div className="pr-6"><div className="font-bold text-on-surface text-lg tracking-tight truncate">{customer.name}</div><div className="text-on-surface-variant text-sm mt-1">{customer.phone}</div></div>
                          {isAdmin && (
                            <button 
                              onClick={() => softDelete(customer.id, 'customer', mutateCustomers)} 
                              disabled={isLoading[`delete-${customer.id}`]}
                              className="absolute top-4 right-4 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            >
                              {isLoading[`delete-${customer.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={16} />}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Services View */}
            {activeTab === "services" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {isAdmin && (
                  <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
                    <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                      <div className="flex items-center gap-2 mb-6">
                        <Scissors className="text-primary-container" size={24} />
                        <h3 className="text-lg font-bold text-on-surface font-headline">Categories</h3>
                      </div>
                      <div className="flex flex-col gap-4 mb-6">
                        <div className="space-y-1.5 w-full">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">New Category</label>
                          <input className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300" placeholder="e.g. Hair" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        </div>
                        <button 
                          onClick={addCategory} 
                          disabled={!newCategoryName || isLoading['addCategory']} 
                          className="w-full px-6 py-2.5 bg-secondary-container text-on-secondary-container font-bold rounded-lg hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading['addCategory'] && <Loader2 className="h-4 w-4 animate-spin" />}
                          {isLoading['addCategory'] ? "Adding..." : "Add"}
                        </button>
                      </div>
                      
                      {!categories ? (
                        <div className="text-on-surface-variant text-sm animate-pulse">Loading tags...</div>
                      ) : categories.length === 0 ? (
                         <div className="text-center py-6 border border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant text-sm">No custom categories</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-2 bg-surface-container-low text-on-surface text-xs font-medium px-3 py-1.5 rounded-lg border border-outline-variant/20">
                              {c.name}
                              <button 
                                onClick={() => softDelete(c.id, 'category', mutateCategories)} 
                                disabled={isLoading[`delete-${c.id}`]}
                                className="text-on-surface-variant hover:text-error disabled:opacity-50"
                              >
                                {isLoading[`delete-${c.id}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <X size={14}/>}
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                      <div className="flex items-center gap-2 mb-6">
                        <Scissors className="text-primary-container" size={24} />
                        <h3 className="text-lg font-bold text-on-surface font-headline">Add New Service</h3>
                      </div>
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-[2] space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Service Name</label>
                          <input className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300" placeholder="e.g. Skin Fade" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Price (Rs.)</label>
                          <input className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300" placeholder="0.00" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-6 mt-6 items-end">
                        <div className="flex-[2] space-y-1.5 w-full">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Category</label>
                          <select className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">No Category</option>
                            {categories?.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <button 
                          onClick={addService} 
                          disabled={!serviceName || !price || isLoading['addService']} 
                          className="flex-1 w-full md:w-auto px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                          {isLoading['addService'] && <Loader2 className="h-4 w-4 animate-spin" />}
                          {isLoading['addService'] ? "Creating..." : "Create Item"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-6">
                    <Scissors className="text-primary-container" size={24} />
                    <h3 className="text-lg font-bold text-on-surface font-headline">Available Services</h3>
                  </div>
                  {!services ? (
                    <div className="flex justify-center p-8 text-on-surface-variant animate-pulse">Loading catalog...</div>
                  ) : services.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant">No services created yet.</div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {services.map((service) => (
                        <li key={service.id} className="group rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5 flex flex-col justify-between transition-all hover:bg-surface-container-lowest hover:border-outline-variant/30 relative">
                          <div className="pr-16">
                            {service.category && (
                              <span className="inline-block bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-3">
                                {service.category.name}
                              </span>
                            )}
                            <div className="font-bold text-on-surface tracking-tight leading-tight">{service.name}</div>
                          </div>
                          <div className="text-primary font-extrabold mt-4 text-lg">Rs. {service.price.toFixed(2)}</div>
                          {isAdmin && (
                            <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditService(service)}
                                className="text-on-surface-variant hover:text-sky-500 bg-surface rounded-md p-1.5 border border-outline-variant/20 shadow-sm transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => softDelete(service.id, 'service', mutateServices)} 
                                disabled={isLoading[`delete-${service.id}`]}
                                className="text-on-surface-variant hover:text-error bg-surface rounded-md p-1.5 border border-outline-variant/20 shadow-sm transition-colors disabled:opacity-50"
                              >
                                {isLoading[`delete-${service.id}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* POS Checkout (Visits View) */}
            {activeTab === "visits" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Visual Editing Notice Banner */}
                {editingId && (
                  <div className="bg-sky-50 border border-sky-100 text-sky-700 px-6 py-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 font-bold text-sm">
                      <Edit size={18} />
                      Modifying existing transaction module.
                    </div>
                    <button onClick={cancelEdit} className="text-sm px-4 py-2 bg-white hover:bg-slate-50 border border-sky-200 rounded-lg transition text-slate-700 font-bold">
                      Cancel 
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-[1fr_350px] gap-8">
                  {/* Left Column: Register POS Input */}
                  <div className="space-y-6">
                    <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                      <div className="flex items-center gap-2 mb-6">
                        <Users className="text-primary-container" size={24} />
                        <h3 className="text-lg font-bold text-on-surface font-headline">Customer Information</h3>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-6 mb-6">
                        <div className="flex-[2] space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Customer Name *</label>
                          <input
                            className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300 disabled:opacity-50"
                            placeholder="e.g. John Doe"
                            value={visitCustomerName} onChange={(e) => setVisitCustomerName(e.target.value)}
                            disabled={!!editingId}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Phone Number *</label>
                          <input
                            className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface placeholder:text-slate-300 disabled:opacity-50"
                            placeholder="+1 (555) 000-0000"
                            value={visitCustomerPhone} onChange={(e) => setVisitCustomerPhone(e.target.value)}
                            disabled={!!editingId}
                          />
                        </div>
                      </div>

                      {/* Staff Dropdown Component */}
                      <div className="relative border-t border-outline-variant/20 pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-max">Assigned Staff:</label>
                          <div className="relative flex-1">
                            <input
                              className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm outline-none transition focus:border-primary text-on-surface placeholder:text-slate-400 font-medium"
                              placeholder={selectedStaffId ? (employees?.find(s => s.id === selectedStaffId)?.name || "Assigned") : "Search employee..."}
                              value={staffQuery}
                              onChange={(e) => {
                                setStaffQuery(e.target.value);
                                if (selectedStaffId && e.target.value !== (employees?.find(s => s.id === selectedStaffId)?.name)) {
                                  setSelectedStaffId("");
                                }
                              }}
                            />
                            {/* Autocomplete Dropdown */}
                            {filteredEmployees.length > 0 && !selectedStaffId && (
                              <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                {filteredEmployees.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => {
                                      setSelectedStaffId(s.id);
                                      setStaffQuery(s.name);
                                      setFilteredEmployees([]);
                                    }}
                                    className="w-full text-left px-5 py-3 hover:bg-surface-dim flex items-center justify-between border-b border-outline-variant/10 last:border-0 transition-colors"
                                  >
                                    <span className="font-bold text-on-surface">{s.name}</span>
                                    <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">{s.gender}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10 min-h-[300px]">
                      <div className="flex items-center gap-2 mb-6">
                        <Scissors className="text-primary-container" size={24} />
                        <h3 className="text-lg font-bold text-on-surface font-headline">Service Selection</h3>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                        <input
                          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low pl-11 pr-4 py-3 text-sm outline-none transition focus:border-primary text-on-surface font-medium placeholder:text-slate-400"
                          placeholder="Search for a service... (e.g. Haircut)"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        
                        {/* Autocomplete Dropdown */}
                        {filteredServices.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                            {filteredServices.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => addServiceToVisit(s)}
                                className="w-full text-left px-5 py-3 hover:bg-surface-dim flex items-center justify-between border-b border-outline-variant/10 last:border-0 transition-colors"
                              >
                                <div>
                                  <span className="font-bold text-on-surface block leading-tight">{s.name}</span>
                                  {s.category && <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{s.category.name}</span>}
                                </div>
                                <span className="text-primary font-bold text-sm whitespace-nowrap">Rs. {s.price}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {query.trim() && filteredServices.length === 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-surface-container-highest border border-outline-variant/20 rounded-xl shadow-xl p-4 text-center text-on-surface-variant text-sm font-medium">
                            No matching services found.
                          </div>
                        )}
                      </div>

                      {/* Selected Items Array */}
                      <div className="space-y-3">
                        {selectedServices.length === 0 ? (
                          <div className="border border-dashed border-outline-variant/30 bg-surface-container-low rounded-xl p-8 text-center text-on-surface-variant text-sm font-medium">
                            No services attached to this checkout yet.
                          </div>
                        ) : (
                          selectedServices.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-surface-container-low border border-outline-variant/20 rounded-xl animate-in slide-in-from-left-2 shadow-sm">
                              <div>
                                <h4 className="font-bold text-on-surface text-sm">{item.name}</h4>
                                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">{item.category?.name ?? "Standard Service"}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-primary text-sm">Rs. {item.price}</span>
                                <button
                                  onClick={() => removeServiceFromVisit(item.id)}
                                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Checkout Total Sidebar */}
                  <div className="space-y-6">
                    <div className="sticky top-6 rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-6 soft-elevation">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-6 flex justify-between items-center">
                        Payment Summary
                        {editingId && <span className="text-sky-600 font-bold bg-sky-100 px-2 py-0.5 rounded border border-sky-200">AMENDMENT</span>}
                      </h3>
                      
                      <div className="space-y-4 mb-6 border-b border-outline-variant/20 pb-6">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-on-surface-variant font-medium">Total Lines</span>
                          <span className="text-on-surface font-bold">{selectedServices.length} Items</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-on-surface-variant font-medium">Gross Total</span>
                          <span className="text-on-surface font-bold">Rs. {visitTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Discount Module */}
                      <div className="space-y-4 mb-6 border-b border-outline-variant/20 pb-6">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Apply Discount</label>
                        <div className="flex gap-2">
                          <select
                            className="bg-surface-container border border-outline-variant/20 rounded-lg px-2 py-2 text-on-surface font-bold outline-none focus:border-primary transition-colors w-16 text-center appearance-none"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as any)}
                          >
                            <option value="percentage">%</option>
                            <option value="amount">₹</option>
                          </select>
                          <input 
                            type="number" 
                            min="0"
                            className="flex-1 rounded-lg border border-outline-variant/20 bg-surface p-2 text-sm outline-none transition focus:border-primary text-on-surface font-bold placeholder:text-slate-300"
                            placeholder={discountType === "percentage" ? "15" : "150.00"}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                        <div className="flex flex-col gap-3 pt-6 border-t border-outline-variant/20">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">Payment Splits</label>
                          {paymentSplits.map((split, i) => (
                            <div key={i} className="flex justify-between items-center text-sm bg-surface p-3 rounded-lg border border-outline-variant/10 shadow-sm">
                              <span className="font-bold text-on-surface capitalize">{split.method}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-primary">₹{split.amount}</span>
                                <button className="text-error/80 hover:text-error hover:bg-error/10 p-1.5 rounded transition" onClick={() => setPaymentSplits(paymentSplits.filter((_, idx) => idx !== i))}><X size={14}/></button>
                              </div>
                            </div>
                          ))}
                          
                          {paymentSplits.reduce((acc, curr) => acc + curr.amount, 0) < finalAmount && (
                            <div className="flex gap-2 items-center mt-2">
                              <select
                                className="bg-surface-container border border-outline-variant/20 rounded-lg px-2 py-2 text-on-surface font-bold outline-none focus:border-primary transition-colors text-xs flex-1"
                                value={splitMethod}
                                onChange={(e) => setSplitMethod(e.target.value)}
                              >
                                <option value="cash">💵 Cash</option>
                                <option value="gpay">📱 GPay</option>
                                <option value="phonepe">📱 PhonePe</option>
                                <option value="card">💳 Card</option>
                              </select>
                              <input 
                                type="number" 
                                min="0"
                                className="w-24 rounded-lg border border-outline-variant/20 bg-surface p-2 text-sm outline-none transition focus:border-primary text-on-surface font-bold placeholder:text-slate-300"
                                placeholder={(finalAmount - paymentSplits.reduce((acc, curr) => acc + curr.amount, 0)).toFixed(2)}
                                value={splitAmount}
                                onChange={(e) => setSplitAmount(e.target.value === "" ? "" : Number(e.target.value))}
                              />
                              <button 
                                onClick={() => {
                                  if (!splitAmount || Number(splitAmount) <= 0) return;
                                  setPaymentSplits([...paymentSplits, { method: splitMethod, amount: Number(splitAmount) }]);
                                  setSplitAmount("");
                                }}
                                className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                              >
                                Add
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-8">
                        <span className="text-on-surface-variant font-bold text-sm tracking-tight">{editingId ? 'Refactored Due' : 'Final Amount'}</span>
                        <div className="flex items-baseline justify-end gap-1 border-b-2 border-transparent hover:border-outline-variant/30 focus-within:border-primary transition-colors pb-1">
                          <span className="text-xl font-extrabold text-primary tracking-tight font-headline">Rs.</span>
                          <input
                            type="number"
                            value={finalAmount === 0 ? "" : finalAmount}
                            onChange={(e) => setFinalAmount(Number(e.target.value))}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-32 bg-transparent text-3xl font-extrabold text-primary tracking-tight font-headline outline-none text-right placeholder:text-primary/30 origin-right transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCheckoutSubmit}
                        disabled={!visitCustomerPhone || selectedServices.length === 0 || isLoading['checkout']}
                        className={`w-full rounded-xl py-4 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg flex items-center justify-center gap-2 ${editingId ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-500/20' : 'bg-gradient-to-br from-primary to-primary-container text-white hover:scale-[1.02] shadow-primary/20'}`}
                      >
                        {isLoading['checkout'] ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          editingId ? <Edit size={18} /> : <BookCheck size={18} />
                        )}
                        {isLoading['checkout'] ? 'Processing...' : (editingId ? 'Overwrite Receipt' : 'Process Checkout')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historical Bills Matrix */}
                <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10 mt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="text-primary-container" size={24} />
                    <h3 className="text-lg font-bold text-on-surface font-headline">Recent Receipts Log</h3>
                  </div>
                  {!visits ? (
                    <div className="flex justify-center p-8 text-on-surface-variant animate-pulse">Loading receipts...</div>
                  ) : visits.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant">No checkout history generated.</div>
                  ) : (
                    <div className="space-y-4">
                      {visits.map((visit) => {
                        const dateObj = new Date(visit.createdAt);
                        const hasDiscount = visit.discountValue && visit.discountValue > 0;
                        let displayPayment = String(visit.paymentMethod || 'cash');
                        if (displayPayment.startsWith('[')) {
                          try {
                            const splits = JSON.parse(displayPayment);
                            displayPayment = splits.map((s: any) => `${s.method} (₹${s.amount})`).join(', ');
                          } catch(e) {}
                        }
                        
                        return (
                          <div key={visit.id} className="group rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5 transition-all hover:bg-surface-container-lowest hover:border-outline-variant/30 relative shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pr-10">
                              <div>
                                <h4 className="font-extrabold text-lg text-on-surface gap-2 flex items-center tracking-tight leading-none mb-1.5">
                                  {visit.customer?.name ?? 'Unknown Customer'}
                                  {hasDiscount && <span className="bg-tertiary-container/10 text-tertiary-container border border-tertiary-container/20 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Discounted</span>}
                                </h4>
                                <p className="text-on-surface-variant text-sm flex items-center gap-2 font-medium">
                                  {visit.customer?.phone} 
                                  <span className="text-outline-variant">•</span> 
                                  <span className="uppercase text-primary font-bold text-xs tracking-wider">{displayPayment}</span>
                                  {visit.staff && (
                                    <>
                                      <span className="text-outline-variant">•</span>
                                      <span className="text-on-surface-variant">Staff: {visit.staff.name}</span>
                                    </>
                                  )}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {visit.services.map((item) => (
                                    <span key={item.id} className="inline-flex bg-surface-container-highest text-on-surface font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded border border-outline-variant/20">
                                      {item.service?.name ?? "Unknown"} <span className="text-primary ml-1">(Rs. {item.service?.price ?? 0})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                                {hasDiscount && <span className="text-on-surface-variant line-through text-xs font-medium">Rs. {(visit.totalAmount || 0).toFixed(2)}</span>}
                                <span className="font-extrabold text-primary text-xl flex items-baseline gap-1">
                                  Rs. {(visit.finalAmount ?? visit.totalAmount ?? 0).toFixed(2)}
                                </span>
                                <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mt-1">{dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                            <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => editVisit(visit)} className="text-on-surface-variant hover:text-sky-500 bg-surface rounded-md p-1.5 border border-outline-variant/20 shadow-sm transition-colors">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => softDelete(visit.id, 'visit', mutateVisits)} className="text-on-surface-variant hover:text-error bg-surface rounded-md p-1.5 border border-outline-variant/20 shadow-sm transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Staff / Employees View */}
            {activeTab === "staff" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-6">
                    <Briefcase className="text-primary-container" size={24} />
                    <h3 className="text-lg font-bold text-on-surface font-headline">Manage Salon Employees</h3>
                  </div>
                  
                  {isAdmin && (
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 mb-8">
                      <h4 className="text-[10px] font-bold text-on-surface-variant mb-6 tracking-widest uppercase">Register New Staff Member</h4>
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-[2] space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Employee Name</label>
                          <input className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface font-bold placeholder:text-slate-300" placeholder="e.g. Sarah Connor" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Gender Orientation</label>
                          <select className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface font-bold" value={employeeGender} onChange={(e) => setEmployeeGender(e.target.value)}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="pt-4 flex items-end">
                          <button onClick={addEmployee} disabled={!employeeName} className="w-full md:w-auto px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all">Register</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!employees ? (
                    <div className="flex justify-center p-8 text-on-surface-variant animate-pulse font-medium">Loading staff...</div>
                  ) : employees.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-outline-variant/30 rounded-xl text-on-surface-variant font-medium">No employees listed.</div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {employees.map((member) => (
                        <div key={member.id} className="group rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5 flex items-center justify-between hover:bg-surface-container-lowest hover:border-outline-variant/30 transition-all relative">
                          <div>
                            <p className="font-bold text-on-surface text-lg tracking-tight leading-none mb-1">{member.name}</p>
                            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{member.gender}</p>
                          </div>
                          {isAdmin && (
                            <button onClick={() => softDelete(member.id, 'staff', mutateEmployees)} className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-2">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Attendance View */}
            {activeTab === "attendance" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
                  {/* Attendance Form */}
                  <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                    <div className="flex items-center gap-2 mb-6">
                      <Clock className="text-primary-container" size={24} />
                      <h3 className="text-lg font-bold text-on-surface font-headline">Log Attendance</h3>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Employee</label>
                        <select 
                          className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface"
                          value={attStaffId} 
                          onChange={(e) => setAttStaffId(e.target.value)}
                        >
                          <option value="">Select Employee</option>
                          {employees?.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Date</label>
                        <input 
                          type="date"
                          className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface"
                          value={attDate}
                          onChange={(e) => setAttDate(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Login Time</label>
                          <input 
                            type="time"
                            className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface"
                            value={attLogin}
                            onChange={(e) => setAttLogin(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Logout Time</label>
                          <input 
                            type="time"
                            className="w-full border-0 border-b-2 border-outline-variant/20 bg-transparent py-2 px-0 focus:ring-0 focus:border-primary transition-all text-on-surface"
                            value={attLogout}
                            onChange={(e) => setAttLogout(e.target.value)}
                          />
                        </div>
                      </div>
                      <button 
                        onClick={addAttendance} 
                        disabled={!attStaffId || !attDate || isLoading['addAttendance']} 
                        className="w-full px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {isLoading['addAttendance'] && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isLoading['addAttendance'] ? "Saving..." : "Save Entry"}
                      </button>
                    </div>
                  </div>

                  {/* Weekly Summary */}
                  <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <BarChart className="text-primary-container" size={24} />
                        <h3 className="text-lg font-bold text-on-surface font-headline">Weekly Work Summary</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-on-surface-variant" />
                        <input 
                          type="date"
                          className="bg-transparent border border-outline-variant/20 rounded-lg px-3 py-1.5 text-xs font-bold text-on-surface outline-none"
                          value={attendanceStartDate}
                          onChange={(e) => {
                            const d = new Date(e.target.value);
                            const start = new Date(d);
                            start.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
                            const end = new Date(start);
                            end.setDate(start.getDate() + 6);
                            setAttendanceStartDate(start.toISOString().split('T')[0]);
                            setAttendanceEndDate(end.toISOString().split('T')[0]);
                          }}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-outline-variant/20">
                            <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Employee</th>
                            <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Days Worked</th>
                            <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Total Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {getWeeklyStats().map((stat) => (
                            <tr key={stat.id} className="group hover:bg-surface-container-low transition-colors">
                              <td className="py-4">
                                <p className="font-bold text-on-surface">{stat.name}</p>
                                <p className="text-[10px] text-on-surface-variant uppercase font-medium">{stat.gender}</p>
                              </td>
                              <td className="py-4 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container font-bold text-xs">
                                  {stat.daysWorked}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <p className="text-lg font-black text-primary font-headline">{stat.totalHours} hrs</p>
                              </td>
                            </tr>
                          ))}
                          {getWeeklyStats().length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-10 text-center text-on-surface-variant font-medium italic">
                                No attendance data for this week.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Raw Log Table */}
                <div className="bg-surface-container-lowest p-6 lg:p-8 rounded-xl soft-elevation border border-outline-variant/10">
                  <div className="flex items-center gap-2 mb-6">
                    <History className="text-primary-container" size={24} />
                    <h3 className="text-lg font-bold text-on-surface font-headline">Recent Logs</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/20">
                          <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Date</th>
                          <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Employee</th>
                          <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Login</th>
                          <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Logout</th>
                          <th className="pb-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Hours</th>
                          <th className="pb-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {attendances?.map((log) => (
                          <tr key={log.id} className="group hover:bg-surface-container-low transition-colors">
                            <td className="py-4 text-sm font-bold text-on-surface">
                              {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-4">
                              <p className="font-bold text-on-surface text-sm">{log.staff.name}</p>
                            </td>
                            <td className="py-4 text-center text-sm font-medium text-on-surface-variant">{log.loginTime || "--:--"}</td>
                            <td className="py-4 text-center text-sm font-medium text-on-surface-variant">{log.logoutTime || "--:--"}</td>
                            <td className="py-4 text-right">
                              <span className="font-bold text-on-surface">{log.totalHours || 0} hrs</span>
                            </td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => softDelete(log.id, 'attendance', mutateAttendance)}
                                disabled={isLoading[`delete-${log.id}`]}
                                className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-2"
                              >
                                {isLoading[`delete-${log.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reports View */}
            {activeTab === "reports" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Filters Section */}
                <div className="bg-surface-container-lowest p-6 rounded-xl soft-elevation border border-outline-variant/10 flex flex-col lg:flex-row gap-6 items-center justify-between">
                  <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    {[7, 15, 30, 90].map(days => (
                      <button key={days} onClick={() => setDatePreset(days)} className="whitespace-nowrap px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-all active:scale-95">{days} Days</button>
                    ))}
                    <button onClick={() => { setReportStartDate(""); setReportEndDate(""); }} className="whitespace-nowrap px-4 py-2 rounded-lg bg-error/5 border border-error/20 text-error text-xs font-bold hover:bg-error/10 transition-all active:scale-95">Reset</button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2 focus-within:border-primary transition-all w-full sm:w-auto">
                      <Calendar size={16} className="text-on-surface-variant" />
                      <input 
                        type="date" 
                        value={reportStartDate} 
                        onChange={e => setReportStartDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-on-surface outline-none w-full sm:w-32"
                      />
                    </div>
                    <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest px-2">to</span>
                    <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2 focus-within:border-primary transition-all w-full sm:w-auto">
                      <Calendar size={16} className="text-on-surface-variant" />
                      <input 
                        type="date" 
                        value={reportEndDate} 
                        onChange={e => setReportEndDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-on-surface outline-none w-full sm:w-32"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Metrics */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-2xl soft-elevation relative overflow-hidden group shadow-2xl shadow-primary/20">
                    <div className="absolute -top-6 -right-6 p-4 opacity-5 transform group-hover:scale-110 transition-transform text-white">
                      <BarChart size={180} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} className="text-white/60" />
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Period Revenue</p>
                      </div>
                      {reports ? (
                        <p className="text-4xl font-black text-white tracking-tighter font-headline">Rs. {reports.filtered.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      ) : (
                        <div className="h-10 w-48 bg-white/10 rounded animate-pulse"></div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-surface-container-lowest p-8 rounded-2xl soft-elevation border border-outline-variant/10 relative overflow-hidden group">
                    <div className="absolute -top-6 -right-6 p-4 opacity-5 transform group-hover:scale-110 transition-transform text-primary">
                      <BarChart size={180} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <History size={14} className="text-on-surface-variant/40" />
                        <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Overall All-Time</p>
                      </div>
                      {reports ? (
                        <p className="text-4xl font-black text-on-surface tracking-tighter font-headline">Rs. {reports.overallRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      ) : (
                        <div className="h-10 w-48 bg-surface-container-low rounded animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { label: "Filtered Bills", value: reports?.filtered.totalVisits, color: "text-primary" },
                    { label: "Active Customers", value: reports?.filtered.totalCustomers, color: "text-secondary" },
                    { label: "Active Services", value: reports?.filtered.totalServices, color: "text-tertiary-container" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 soft-elevation">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 mb-2 uppercase tracking-widest">{stat.label}</p>
                      {reports ? (
                        <p className={`text-3xl font-black ${stat.color} font-headline`}>{stat.value}</p>
                      ) : (
                        <div className="h-8 w-12 bg-surface-container-low rounded animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Charts Grid */}
                <div className="grid lg:grid-cols-4 gap-8">
                  {/* Bar Chart */}
                  <div className="lg:col-span-2 bg-surface-container-lowest p-6 lg:p-8 rounded-2xl soft-elevation border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-lg font-bold text-on-surface font-headline leading-none">Revenue Trend</h3>
                        <p className="text-xs font-medium text-on-surface-variant mt-1">Growth analysis over the selected period</p>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      {!reports ? (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant animate-pulse bg-surface-container-low rounded-xl font-bold italic">Gathering Data Matrix...</div>
                      ) : reports.filtered.chartData.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-xl font-medium">No revenue logged in this period.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={reports.filtered.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#610b83" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#610b83" stopOpacity={0.2}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} dy={15} axisLine={false} tickLine={false} />
                            <YAxis stroke="#94a3b8" tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} dx={-15} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                              itemStyle={{ color: '#610b83', fontWeight: 800, fontSize: '14px' }}
                              labelStyle={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}
                              cursor={{fill: 'rgba(97, 11, 131, 0.05)'}}
                            />
                            <Bar dataKey="revenue" name="Revenue" fill="url(#colorRev)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Donut Chart */}
                  <div className="lg:col-span-1 bg-surface-container-lowest p-6 lg:p-8 rounded-2xl soft-elevation border border-outline-variant/10 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-on-surface font-headline leading-none">Staff Revenue</h3>
                        <p className="text-xs font-medium text-on-surface-variant mt-1">Generated by employee</p>
                      </div>
                    </div>
                    
                    {!reports ? (
                      <div className="w-full h-[250px] flex items-center justify-center text-on-surface-variant animate-pulse bg-surface-container-low rounded-xl font-bold italic">Loading...</div>
                    ) : !reports.filtered.staffRevenue || reports.filtered.staffRevenue.length === 0 ? (
                      <div className="w-full h-[250px] flex items-center justify-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-xl font-medium">No assigned staff revenue</div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        <DonutChart
                          data={reports.filtered.staffRevenue}
                          size={180}
                          strokeWidth={20}
                          animationDuration={1.2}
                          animationDelayPerSegment={0.05}
                          highlightOnHover={true}
                          onSegmentHover={(segment) => setHoveredStaff(segment?.label || null)}
                          centerContent={
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={hoveredStaff || "total"}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center justify-center text-center"
                              >
                                <p className="text-muted-foreground text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate max-w-[90px]">
                                  {hoveredStaff || "Total"}
                                </p>
                                <p className="text-xl font-extrabold text-on-surface">
                                  ₹{hoveredStaff 
                                      ? reports.filtered.staffRevenue.find(s => s.label === hoveredStaff)?.value 
                                      : reports.filtered.staffRevenue.reduce((s, a) => s + a.value, 0)}
                                </p>
                              </motion.div>
                            </AnimatePresence>
                          }
                        />
                        <div className="w-full mt-6 space-y-2 max-h-[120px] overflow-y-auto pr-1">
                          {reports.filtered.staffRevenue.map((segment) => (
                            <div key={segment.label} className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-1.5 last:border-0 hover:bg-surface-container-low transition px-2 py-1 rounded">
                              <span className="flex items-center gap-2 font-medium text-on-surface-variant text-xs">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                                {segment.label}
                              </span>
                              <span className="font-bold text-on-surface text-xs">₹{segment.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Methods Chart */}
                  <div className="lg:col-span-1 bg-surface-container-lowest p-6 lg:p-8 rounded-2xl soft-elevation border border-outline-variant/10 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-on-surface font-headline leading-none">Payment Methods</h3>
                        <p className="text-xs font-medium text-on-surface-variant mt-1">Revenue by type</p>
                      </div>
                    </div>
                    
                    {!reports ? (
                      <div className="w-full h-[250px] flex items-center justify-center text-on-surface-variant animate-pulse bg-surface-container-low rounded-xl font-bold italic">Loading...</div>
                    ) : reports.filtered.breakdown.cash + reports.filtered.breakdown.gpay + reports.filtered.breakdown.phonepe + reports.filtered.breakdown.card === 0 ? (
                      <div className="w-full h-[250px] flex items-center justify-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-xl font-medium">No payment data</div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        <PaymentChartWidget
                          data={[
                            { key: 'Cash', data: reports.filtered.breakdown.cash },
                            { key: 'GPay', data: reports.filtered.breakdown.gpay },
                            { key: 'PhonePe', data: reports.filtered.breakdown.phonepe },
                            { key: 'Card', data: reports.filtered.breakdown.card },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Breakdown Matrix */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Cash Collections", key: "cash", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                    { label: "GPay Collection", key: "gpay", color: "bg-sky-50 border-sky-100 text-sky-700" },
                    { label: "PhonePe", key: "phonepe", color: "bg-indigo-50 border-indigo-100 text-indigo-700" },
                    { label: "Card Payments", key: "card", color: "bg-slate-50 border-slate-200 text-slate-700" }
                  ].map((item, i) => (
                    <div key={i} className={`rounded-2xl border p-6 soft-elevation ${item.color}`}>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">{item.label}</p>
                      {reports ? (
                        <p className="text-2xl font-black font-headline">Rs. {reports.filtered.breakdown[item.key as keyof typeof reports.filtered.breakdown].toLocaleString()}</p>
                      ) : (
                        <div className="h-8 w-24 bg-black/5 rounded animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
