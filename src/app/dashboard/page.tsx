"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import useSWR from "swr";
import { Menu, X, Users, Scissors, BookCheck, LogOut, Briefcase, BarChart, Search, Trash2, Edit, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
    totalCustomers: number;
    totalServices: number;
    totalVisits: number;
  }
};

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
  
  const [activeTab, setActiveTab] = useState<"customers" | "services" | "visits" | "staff" | "reports">("customers");
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
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [finalAmount, setFinalAmount] = useState(0);

  const [error, setError] = useState("");

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

    setFinalAmount(Math.max(0, final));
  }, [selectedServices, discountType, discountValue]);

  // Actions
  async function addCustomer() {
    try {
      setError("");
      const res = await fetch("/api/customer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add customer");
      setName(""); setPhone(""); mutateCustomers(); mutateReports();
    } catch (err: any) { setError(err.message); }
  }

  async function addCategory() {
    try {
      setError("");
      const res = await fetch("/api/category", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategoryName }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add category");
      setNewCategoryName(""); mutateCategories();
    } catch (err: any) { setError(err.message); }
  }

  async function addService() {
    try {
      setError("");
      const res = await fetch("/api/service", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: serviceName, price: Number(price), categoryId }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add service");
      setServiceName(""); setPrice(""); setCategoryId(""); mutateServices(); mutateReports();
    } catch (err: any) { setError(err.message); }
  }

  async function addEmployee() {
    try {
      setError("");
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: employeeName, gender: employeeGender }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add employee");
      setEmployeeName(""); setEmployeeGender("Female"); mutateEmployees();
    } catch (err: any) { setError(err.message); }
  }

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
    setPaymentMethod(visit.paymentMethod || "cash");
    
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
    setPaymentMethod("cash");
    setDiscountType("percentage");
    setDiscountValue("");
    setSelectedStaffId("");
    setQuery("");
    setStaffQuery("");
  }

  async function handleCheckoutSubmit() {
    try {
      setError("");
      const payload = {
        serviceIds: selectedServices.map(s => s.id),
        paymentMethod,
        discountType,
        discountValue: Number(discountValue) || 0,
        staffId: selectedStaffId || null
      };

      if (editingId) {
        // Edit mode (PUT logic)
        const res = await fetch(`/api/visit/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update visit");
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
      }
      cancelEdit();
      mutateVisits(); 
      mutateCustomers(); 
      mutateReports();
    } catch (err: any) { setError(err.message); }
  }

  async function softDelete(id: string, endpoint: string, mutator: any) {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      setError("");
      const res = await fetch(`/api/${endpoint}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete");
      mutator(); mutateReports();
    } catch (err: any) { setError(err.message); }
  }

  if (status === "loading") {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-100">Loading dashboard...</div>;
  }

  const tabs = [
    { id: "customers", label: "Customers", icon: Users },
    { id: "services", label: "Services", icon: Scissors },
    { id: "visits", label: "Point of Sale", icon: BookCheck },
    { id: "staff", label: "Employees", icon: Briefcase },
    { id: "reports", label: "Reports", icon: BarChart },
  ] as const;

  const handleTabChange = (tabId: "customers" | "services" | "visits" | "staff" | "reports") => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-stone-950 text-stone-100 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-white/5 bg-stone-950/95 backdrop-blur-md transition-transform duration-300 md:static md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-stone-950 font-black text-lg">
                {(tenant?.name ?? "S")[0].toUpperCase()}
              </span>
              <span className="truncate max-w-[150px]">{tenant?.name ?? "Salon SaaS"}</span>
            </h1>
            <button className="md:hidden text-stone-400 hover:text-white transition" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>
          
          <div className="mb-8 rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-amber-300 font-bold border border-white/10 shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-white text-sm leading-tight truncate">{session?.user?.name}</p>
              <p className="text-stone-400 text-xs mt-0.5 capitalize flex items-center gap-1.5 truncate">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                {(session?.user as any)?.role}
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${
                    activeTab === tab.id ? "bg-amber-300 text-stone-950 shadow-md shadow-amber-300/10" : "text-stone-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={activeTab === tab.id ? "opacity-100" : "opacity-70"} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <button onClick={() => signOut({ callbackUrl: "/" })} className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3.5 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white">
            <LogOut size={18} className="opacity-70" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-stone-900/10">
        <header className="flex items-center justify-between border-b border-white/5 bg-stone-950/80 p-4 backdrop-blur md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-stone-300 hover:text-white transition rounded-lg hover:bg-white/5">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-white">{tabs.find(t => t.id === activeTab)?.label}</span>
          <div className="w-10 h-10 rounded-full border border-white/10 bg-stone-800 flex items-center justify-center font-bold text-amber-300 text-sm">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 scroll-smooth">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="hidden md:flex justify-between items-end mb-10">
              <div>
                <p className="text-sm font-medium text-amber-300 mb-1 tracking-wider uppercase">Dashboard Overview</p>
                <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200 flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                <span className="bg-red-500/20 p-1 rounded-full text-red-400"><X size={14}/></span>
                {error}
              </div>
            )}

            {/* Customers View */}
            {activeTab === "customers" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isAdmin && (
                  <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm">
                    <h3 className="text-lg font-medium mb-5 text-white flex items-center gap-2"><span className="w-1 h-5 rounded-full bg-amber-300"></span> Add New Customer</h3>
                    <div className="flex flex-col md:flex-row gap-4">
                      <input className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5" placeholder="Customer full name" value={name} onChange={(e) => setName(e.target.value)} />
                      <input className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      <button onClick={addCustomer} disabled={!name || !phone} className="rounded-xl bg-amber-300 px-8 py-3.5 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:active:scale-100">Create</button>
                    </div>
                  </div>
                )}
                
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm">
                  <h3 className="text-lg font-medium mb-6 text-white flex items-center gap-2"><span className="w-1 h-5 rounded-full bg-stone-500"></span> Customer Directory</h3>
                  {!customers ? (
                    <div className="flex justify-center p-8 text-stone-400 animate-pulse">Loading directory...</div>
                  ) : customers.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-white/10 rounded-xl text-stone-500">No customers registered yet.</div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {customers.map((customer) => (
                        <li key={customer.id} className="group rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/10 relative">
                          <div className="pr-6"><div className="font-medium text-white text-lg tracking-tight truncate">{customer.name}</div><div className="text-stone-400 text-sm mt-1">{customer.phone}</div></div>
                          {isAdmin && <button onClick={() => softDelete(customer.id, 'customer', mutateCustomers)} className="absolute top-4 right-4 text-stone-500 hover:text-red-400"><X size={16} /></button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Services View */}
            {activeTab === "services" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isAdmin && (
                  <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm shadow-xl shadow-black/20">
                      <h3 className="text-lg font-medium mb-5 text-white flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-sky-400"></span> Manage Categories
                      </h3>
                      <div className="flex gap-4 mb-6">
                        <input className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-sky-400 focus:bg-white/5 text-stone-200" placeholder="New Category (e.g. Hair)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        <button onClick={addCategory} disabled={!newCategoryName} className="rounded-xl bg-sky-400 px-6 py-3.5 text-sm font-semibold text-stone-950 transition-all hover:bg-sky-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100">Add</button>
                      </div>
                      
                      {!categories ? (
                        <div className="text-stone-400 text-sm animate-pulse">Loading tags...</div>
                      ) : categories.length === 0 ? (
                        <div className="text-stone-500 text-sm italic">No custom categories created yet.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-2 bg-white/10 text-stone-300 text-xs px-3 py-1.5 rounded-lg border border-white/5">
                              {c.name}
                              <button onClick={() => softDelete(c.id, 'category', mutateCategories)} className="text-stone-500 hover:text-red-400"><X size={14}/></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm shadow-xl shadow-black/20">
                      <h3 className="text-lg font-medium mb-5 text-white flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-amber-300"></span> Add New Service
                      </h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <input className="flex-[2] rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5" placeholder="Service name (e.g. Skin Fade)" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                        <input className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5" placeholder="Price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                      </div>
                      <div className="flex gap-4 mt-4">
                        <select className="flex-[2] rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5 text-stone-300" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                          <option value="">No Category</option>
                          {categories?.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button onClick={addService} disabled={!serviceName || !price} className="flex-1 rounded-xl bg-amber-300 px-8 py-3.5 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:active:scale-100">Create Item</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm">
                  <h3 className="text-lg font-medium mb-6 text-white flex items-center gap-2"><span className="w-1 h-5 rounded-full bg-stone-500"></span> Available Services</h3>
                  {!services ? (
                    <div className="flex justify-center p-8 text-stone-400 animate-pulse">Loading catalog...</div>
                  ) : services.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-white/10 rounded-xl text-stone-500">No services created yet.</div>
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {services.map((service) => (
                        <li key={service.id} className="group rounded-2xl border border-white/5 bg-white/5 p-5 flex flex-col justify-between transition-all hover:bg-white/10 hover:-translate-y-1 relative">
                          <div className="pr-6">
                            {service.category && (
                              <span className="inline-block bg-white/10 text-stone-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded mb-2">
                                {service.category.name}
                              </span>
                            )}
                            <div className="font-medium text-white tracking-tight">{service.name}</div>
                          </div>
                          <div className="text-amber-300 font-semibold mt-4 text-lg">Rs. {service.price.toFixed(2)}</div>
                          {isAdmin && <button onClick={() => softDelete(service.id, 'service', mutateServices)} className="absolute top-4 right-4 text-stone-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"><X size={16} /></button>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* POS Checkout (Visits View) */}
            {activeTab === "visits" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Visual Editing Notice Banner */}
                {editingId && (
                  <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 px-6 py-4 rounded-[1.5rem] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3 font-medium">
                      <Edit size={18} />
                      Actively editing existing transaction module mapping.
                    </div>
                    <button onClick={cancelEdit} className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition text-stone-200">
                      Cancel 
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-[1fr_350px] gap-8">
                  {/* Left Column: Register POS Input */}
                  <div className="space-y-6">
                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm shadow-xl shadow-black/20">
                      <h3 className="text-lg font-medium mb-5 text-white flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-emerald-400"></span> Checkout Details
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <input
                          className="flex-[2] rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5 text-stone-200 disabled:opacity-50"
                          placeholder="Customer Name (Required if new)"
                          value={visitCustomerName} onChange={(e) => setVisitCustomerName(e.target.value)}
                          disabled={!!editingId}
                        />
                        <input
                          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5 text-stone-200 disabled:opacity-50"
                          placeholder="Phone Number"
                          value={visitCustomerPhone} onChange={(e) => setVisitCustomerPhone(e.target.value)}
                          disabled={!!editingId}
                        />
                      </div>

                      {/* Staff Dropdown Component */}
                      <div className="relative border-t border-white/10 pt-4 mt-2">
                        <div className="flex gap-4 items-center">
                          <label className="text-sm text-stone-400 min-w-max">Assigned Staff:</label>
                          <div className="relative flex-1">
                            <input
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-amber-300 text-stone-200 placeholder-stone-600"
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
                              <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-stone-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                {filteredEmployees.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => {
                                      setSelectedStaffId(s.id);
                                      setStaffQuery(s.name);
                                      setFilteredEmployees([]);
                                    }}
                                    className="w-full text-left px-5 py-3 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
                                  >
                                    <span className="font-medium text-stone-200">{s.name}</span>
                                    <span className="text-stone-500 text-xs uppercase">{s.gender}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm min-h-[300px] shadow-xl shadow-black/20">
                      <h3 className="text-lg font-medium mb-5 text-white flex items-center gap-2">
                        <span className="w-1 h-5 rounded-full bg-amber-300"></span> Scan / Attach Services
                      </h3>
                      
                      {/* Search Bar */}
                      <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          className="w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 py-3.5 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5 text-stone-200"
                          placeholder="Search for a service... (e.g. Haircut)"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        
                        {/* Autocomplete Dropdown */}
                        {filteredServices.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-stone-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                            {filteredServices.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => addServiceToVisit(s)}
                                className="w-full text-left px-5 py-3 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
                              >
                                <div>
                                  <span className="font-medium text-stone-200 block">{s.name}</span>
                                  {s.category && <span className="text-[10px] text-stone-500 uppercase">{s.category.name}</span>}
                                </div>
                                <span className="text-amber-300 text-sm whitespace-nowrap">Rs. {s.price}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {query.trim() && filteredServices.length === 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-stone-900 border border-white/10 rounded-xl shadow-2xl p-4 text-center text-stone-400 text-sm">
                            No matching services found.
                          </div>
                        )}
                      </div>

                      {/* Selected Items Array */}
                      <div className="space-y-2">
                        {selectedServices.length === 0 ? (
                          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-stone-500 text-sm">
                            No services attached to this checkout yet.
                          </div>
                        ) : (
                          selectedServices.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl animate-in slide-in-from-left-2">
                              <div>
                                <h4 className="font-medium text-white text-sm">{item.name}</h4>
                                <p className="text-stone-400 text-xs">{item.category?.name ?? "Standard Service"}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-medium text-stone-300 text-sm">Rs. {item.price}</span>
                                <button
                                  onClick={() => removeServiceFromVisit(item.id)}
                                  className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
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
                    <div className="sticky top-6 rounded-[1.5rem] bg-gradient-to-b from-stone-900 to-stone-950 border border-white/10 p-6 shadow-2xl">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-5 flex justify-between">
                        Payment Summary
                        {editingId && <span className="text-sky-400 font-bold bg-sky-400/10 px-2 rounded">AMENDMENT</span>}
                      </h3>
                      
                      <div className="space-y-4 mb-5 border-b border-white/10 pb-5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-400">Total Lines</span>
                          <span className="text-white font-medium">{selectedServices.length} Items</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-400">Gross Total</span>
                          <span className="text-white font-medium">Rs. {visitTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Discount Module */}
                      <div className="space-y-3 mb-6 border-b border-white/10 pb-6">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Apply Discount</label>
                        <div className="flex gap-2">
                          <select
                            className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-white outline-none focus:border-amber-300 transition-colors w-16 text-center appearance-none"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as any)}
                          >
                            <option value="percentage">%</option>
                            <option value="amount">₹</option>
                          </select>
                          <input 
                            type="number" 
                            min="0"
                            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5 text-stone-200"
                            placeholder={discountType === "percentage" ? "15" : "150.00"}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2">
                          <span className="text-stone-400">Payment Type</span>
                          <select
                            className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-white outline-none focus:border-amber-300 transition-colors"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                          >
                            <option value="cash">💵 Cash</option>
                            <option value="gpay">📱 GPay</option>
                            <option value="phonepe">📱 PhonePe</option>
                            <option value="card">💳 Card</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-6">
                        <span className="text-stone-300 font-medium">{editingId ? 'Refactored Due' : 'Final Amount'}</span>
                        <span className="text-3xl font-bold text-amber-300 tracking-tight">
                          Rs. {finalAmount.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={handleCheckoutSubmit}
                        disabled={!visitCustomerPhone || selectedServices.length === 0}
                        className={`w-full rounded-xl py-4 text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-xl flex items-center justify-center gap-2 ${editingId ? 'bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/20' : 'bg-amber-300 text-stone-950 hover:bg-amber-400 shadow-amber-500/10'}`}
                      >
                        {editingId ? <Edit size={18} /> : <BookCheck size={18} />}
                        {editingId ? 'Overwrite Receipt' : 'Process Checkout'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historical Bills Matrix */}
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm mt-8 shadow-xl shadow-black/20">
                  <h3 className="text-lg font-medium mb-6 text-white flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-stone-500"></span> Recent Receipts Log
                  </h3>
                  {!visits ? (
                    <div className="flex justify-center p-8 text-stone-400 animate-pulse">Loading receipts...</div>
                  ) : visits.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-white/10 rounded-xl text-stone-500">No checkout history generated.</div>
                  ) : (
                    <div className="space-y-4">
                      {visits.map((visit) => {
                        const dateObj = new Date(visit.createdAt);
                        const hasDiscount = visit.discountValue && visit.discountValue > 0;
                        
                        return (
                          <div key={visit.id} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10 relative">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pr-10">
                              <div>
                                <h4 className="font-semibold text-lg text-white gap-2 flex items-center">
                                  {visit.customer?.name ?? 'Unknown Customer'}
                                  {hasDiscount && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Discounted</span>}
                                </h4>
                                <p className="text-stone-400 text-sm flex gap-2">
                                  {visit.customer?.phone} 
                                  <span className="text-stone-600">•</span> 
                                  <span className="uppercase text-amber-300/80 tracking-wide font-medium">{visit.paymentMethod}</span>
                                  {visit.staff && (
                                    <>
                                      <span className="text-stone-600">•</span>
                                      <span className="text-stone-300">Staff: {visit.staff.name}</span>
                                    </>
                                  )}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {visit.services.map((item) => (
                                    <span key={item.id} className="inline-block bg-white/10 text-stone-300 text-xs px-2.5 py-1 rounded-md">
                                      {item.service?.name ?? "Unknown"} (Rs. {item.service?.price ?? 0})
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                                {hasDiscount && <span className="text-stone-500 line-through text-xs">Rs. {(visit.totalAmount || 0).toFixed(2)}</span>}
                                <span className="font-bold text-amber-300 text-xl flex items-baseline gap-1">
                                  Rs. {(visit.finalAmount ?? visit.totalAmount ?? 0).toFixed(2)}
                                </span>
                                <span className="text-stone-500 text-xs uppercase tracking-widest">{dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                            <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => editVisit(visit)} className="text-stone-400 hover:text-sky-400 bg-black/40 p-1.5 rounded-md hover:bg-sky-400/10">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => softDelete(visit.id, 'visit', mutateVisits)} className="text-stone-400 hover:text-red-400 bg-black/40 p-1.5 rounded-md hover:bg-red-400/10">
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
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm shadow-xl shadow-black/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      <span className="w-1 h-5 rounded-full bg-emerald-400"></span> 
                      Manage Salon Employees
                    </h3>
                  </div>
                  
                  {isAdmin && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 mb-6">
                      <h4 className="text-sm text-stone-400 mb-4 tracking-wider uppercase">Add Employee</h4>
                      <div className="flex flex-col md:flex-row gap-4">
                        <input className="flex-[2] rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5" placeholder="Employee Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
                        <select className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:bg-white/5 text-stone-200" value={employeeGender} onChange={(e) => setEmployeeGender(e.target.value)}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <button onClick={addEmployee} disabled={!employeeName} className="rounded-xl bg-emerald-400 px-8 py-3 text-sm font-semibold text-stone-950 transition-all hover:bg-emerald-500">Register</button>
                      </div>
                    </div>
                  )}

                  {!employees ? (
                    <div className="flex justify-center p-8 text-stone-400 animate-pulse">Loading staff...</div>
                  ) : employees.length === 0 ? (
                    <div className="text-center p-10 border border-dashed border-white/10 rounded-xl text-stone-500">No employees listed.</div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {employees.map((member) => (
                        <div key={member.id} className="group rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center justify-between hover:bg-white/10 transition-all">
                          <div>
                            <p className="font-medium text-white">{member.name}</p>
                            <p className="text-stone-500 text-xs uppercase tracking-wider">{member.gender}</p>
                          </div>
                          {isAdmin && (
                            <button onClick={() => softDelete(member.id, 'staff', mutateEmployees)} className="text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2">
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
            
            {/* Reports View */}
            {activeTab === "reports" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Filters Section */}
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm shadow-xl flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button onClick={() => setDatePreset(7)} className="whitespace-nowrap px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-sm hover:border-amber-400 hover:text-amber-400 transition-colors">7 Days</button>
                    <button onClick={() => setDatePreset(15)} className="whitespace-nowrap px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-sm hover:border-amber-400 hover:text-amber-400 transition-colors">15 Days</button>
                    <button onClick={() => setDatePreset(30)} className="whitespace-nowrap px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-sm hover:border-amber-400 hover:text-amber-400 transition-colors">30 Days</button>
                    <button onClick={() => setDatePreset(90)} className="whitespace-nowrap px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-sm hover:border-amber-400 hover:text-amber-400 transition-colors">90 Days</button>
                    <button onClick={() => { setReportStartDate(""); setReportEndDate(""); }} className="whitespace-nowrap px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors text-center">Reset</button>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-amber-400 transition-all">
                      <Calendar size={16} className="text-stone-500" />
                      <input 
                        type="date" 
                        value={reportStartDate} 
                        onChange={e => setReportStartDate(e.target.value)}
                        className="bg-transparent border-none text-sm text-stone-200 outline-none w-32 [color-scheme:dark]"
                      />
                    </div>
                    <span className="text-stone-500 text-sm">to</span>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus-within:border-amber-400 transition-all">
                      <Calendar size={16} className="text-stone-500" />
                      <input 
                        type="date" 
                        value={reportEndDate} 
                        onChange={e => setReportEndDate(e.target.value)}
                        className="bg-transparent border-none text-sm text-stone-200 outline-none w-32 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Metrics */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                      <BarChart size={100} />
                    </div>
                    <p className="text-sm font-medium text-amber-300 mb-2 uppercase tracking-wider relative z-10">Period Revenue</p>
                    {reports ? (
                      <p className="text-4xl font-bold text-white tracking-tight relative z-10">Rs. {reports.filtered.totalRevenue.toFixed(2)}</p>
                    ) : (
                      <div className="h-10 w-48 bg-white/10 rounded animate-pulse relative z-10"></div>
                    )}
                  </div>
                  
                  <div className="rounded-[1.5rem] border border-white/5 bg-white/5 p-6 shadow-xl relative overflow-hidden">
                    <p className="text-sm font-medium text-stone-400 mb-2 uppercase tracking-wider">Overall All-Time</p>
                    {reports ? (
                      <p className="text-4xl font-bold text-stone-300 tracking-tight">Rs. {reports.overallRevenue.toFixed(2)}</p>
                    ) : (
                      <div className="h-10 w-48 bg-white/10 rounded animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                    <p className="text-xs font-medium text-stone-400 mb-1 uppercase tracking-wider">Filtered Bills</p>
                    {reports ? <p className="text-2xl font-semibold text-white">{reports.filtered.totalVisits}</p> : <div className="h-8 w-12 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                    <p className="text-xs font-medium text-stone-400 mb-1 uppercase tracking-wider">Active Customers</p>
                    {reports ? <p className="text-2xl font-semibold text-white">{reports.filtered.totalCustomers}</p> : <div className="h-8 w-12 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                    <p className="text-xs font-medium text-stone-400 mb-1 uppercase tracking-wider">Active Services</p>
                    {reports ? <p className="text-2xl font-semibold text-white">{reports.filtered.totalServices}</p> : <div className="h-8 w-12 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                </div>

                {/* Line Chart */}
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 lg:p-8 backdrop-blur-sm shadow-xl">
                  <h3 className="text-lg font-medium text-white mb-6">Revenue Trend</h3>
                  <div className="h-[300px] w-full">
                    {!reports ? (
                      <div className="w-full h-full flex items-center justify-center text-stone-500 animate-pulse bg-white/5 rounded-xl">Graphing Data...</div>
                    ) : reports.filtered.chartData.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-stone-500 border border-dashed border-white/10 rounded-xl">No revenue logged in this period.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reports.filtered.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} dy={10} />
                          <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} dx={-10} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1c1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fcd34d' }}
                            cursor={{stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2}}
                          />
                          <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#fcd34d" strokeWidth={3} dot={{r: 4, fill: '#1c1917', stroke: '#fcd34d', strokeWidth: 2}} activeDot={{r: 6, fill: '#fcd34d'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Payment Breakdown Matrix */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">Cash Collections</p>
                    {reports ? <p className="text-2xl font-bold text-white">Rs. {reports.filtered.breakdown.cash.toFixed(2)}</p> : <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
                    <p className="text-xs font-semibold text-sky-400 mb-2 uppercase tracking-wide">GPay Collection</p>
                    {reports ? <p className="text-2xl font-bold text-white">Rs. {reports.filtered.breakdown.gpay.toFixed(2)}</p> : <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">PhonePe</p>
                    {reports ? <p className="text-2xl font-bold text-white">Rs. {reports.filtered.breakdown.phonepe.toFixed(2)}</p> : <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                  <div className="rounded-xl border border-stone-500/30 bg-stone-500/10 p-5">
                    <p className="text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wide">Card Payments</p>
                    {reports ? <p className="text-2xl font-bold text-white">Rs. {reports.filtered.breakdown.card.toFixed(2)}</p> : <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
