import { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Copy,
  Check,
  Link,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Search,
  Download,
  Upload,
  FileJson,
  ClipboardList,
  Clock,
  Users,
  Package,
  Pencil,
  Trash2,
  Eye,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import CreateOrderDialog from '@/components/orders/CreateOrderDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface OrderLinks {
  leaderLink: string;
  registerLink: string;
  statusLink: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  leader_name: string | null;
  leader_phone: string | null;
  student_count: number | null;
  status: string;
  kit_id: string | null;
  order_type: string | null;
  created_at: string;
  employee_id: string;
  employee_name?: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_data: { label: 'بانتظار البيانات', className: 'bg-warning/10 text-warning border-warning/20' },
  under_review: { label: 'بانتظار المراجعة', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'قيد التنفيذ', className: 'bg-info/10 text-info border-info/20' },
  shipped: { label: 'تم الشحن', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  completed: { label: 'منتهي', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'ملغي', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function Orders({ myOrdersOnly = false }: { myOrdersOnly?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<OrderLinks | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kitFilter, setKitFilter] = useState('all');

  // Bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Edit/Delete single
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [viewingStudents, setViewingStudents] = useState<any[]>([]);
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

  // Kits for filter
  const [kits, setKits] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadUserRole();
    loadOrders();
    loadKits();
    loadTotalStudents();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [myOrdersOnly, user]);

  const loadUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    setUserRole(data?.role || 'customer_service');
  };

  const isAdmin = userRole === 'owner' || userRole === 'manager';

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    // "My Orders" mode only filters by employee_id
    if (myOrdersOnly && user) {
      query = query.eq('employee_id', user.id);
    }
    const { data: ordersData } = await query;
    
    // Fetch employee names from profiles
    if (ordersData && ordersData.length > 0) {
      const employeeIds = [...new Set(ordersData.map(o => o.employee_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', employeeIds);
      
      const nameMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);
      const enriched = ordersData.map(o => ({
        ...o,
        employee_name: nameMap.get(o.employee_id) || 'غير معروف',
      }));
      setOrders(enriched as OrderRow[]);
    } else {
      setOrders([]);
    }
    setLoading(false);
  };

  const loadKits = async () => {
    const { data } = await supabase.from('ready_kits').select('id, name').eq('is_active', true);
    setKits(data || []);
  };

  const loadTotalStudents = async () => {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
    setTotalStudents(count || 0);
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending_data').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    return { total, pending, inProgress, totalStudents };
  }, [orders, totalStudents]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(o =>
        (o.leader_name && o.leader_name.toLowerCase().includes(q)) ||
        (o.leader_phone && o.leader_phone.includes(q)) ||
        o.order_number.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (kitFilter !== 'all') {
      result = result.filter(o => o.kit_id === kitFilter);
    }
    return result;
  }, [orders, searchQuery, statusFilter, kitFilter]);

  const generateLinks = (orderId: string): OrderLinks => {
    const base = window.location.origin;
    return {
      leaderLink: `${base}/order/${orderId}/leader`,
      registerLink: `${base}/order/${orderId}/register`,
      statusLink: `${base}/order/${orderId}/status`,
    };
  };

  const createShortLink = async (originalUrl: string): Promise<string> => {
    // Check if short link already exists
    const { data: existing } = await supabase
      .from('short_links')
      .select('code')
      .eq('original_url', originalUrl)
      .maybeSingle();
    if (existing) return `${window.location.origin}/r/${existing.code}`;

    const code = Math.random().toString(36).substring(2, 8);
    await supabase.from('short_links').insert({ code, original_url: originalUrl });
    return `${window.location.origin}/r/${code}`;
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      const shortUrl = await createShortLink(text);
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      await navigator.clipboard.writeText(text);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const exportOrderJSON = async (orderId: string) => {
    const [orderRes, studentsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('students').select('*').eq('order_id', orderId).order('serial_number'),
    ]);
    if (!orderRes.data) return;
    const payload = { order: orderRes.data, students: studentsRes.data || [] };
    downloadJSON(payload, `order-${orderRes.data.order_number}.json`);
  };

  const exportBulkJSON = async () => {
    if (selectedOrderIds.size === 0) {
      toast({ title: 'اختر طلبات للتصدير', variant: 'destructive' });
      return;
    }
    setBulkExporting(true);
    const ids = Array.from(selectedOrderIds);
    const [ordersRes, studentsRes] = await Promise.all([
      supabase.from('orders').select('*').in('id', ids),
      supabase.from('students').select('*').in('order_id', ids).order('serial_number'),
    ]);
    const ordersData = ordersRes.data || [];
    const studentsData = studentsRes.data || [];
    const payload = ordersData.map(order => ({
      order,
      students: studentsData.filter(s => s.order_id === order.id),
    }));
    downloadJSON(payload, `orders-export-${new Date().toISOString().slice(0, 10)}.json`);
    setBulkExporting(false);
    setSelectedOrderIds(new Set());
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateOrderNumber = () => {
    // Order number is now auto-generated by DB trigger (2026-XXXX format)
    // This is a fallback that won't actually be used
    return 'AUTO';
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const orderData = item.order;
        if (!orderData) continue;

        const existing = orderData.id
          ? (await supabase.from('orders').select('id').eq('id', orderData.id).maybeSingle()).data
          : null;

        if (existing) {
          const { id, created_at, ...updateFields } = orderData;
          await supabase.from('orders').update(updateFields).eq('id', existing.id);
          if (item.students?.length) {
            await supabase.from('students').delete().eq('order_id', existing.id);
            await supabase.from('students').insert(
              item.students.map((s: any) => ({ ...s, id: undefined, order_id: existing.id }))
            );
          }
        } else {
          const { id, created_at, updated_at, ...insertFields } = orderData;
          const { data: newOrder } = await supabase
            .from('orders')
            .insert({ ...insertFields, employee_id: user.id, order_number: insertFields.order_number || generateOrderNumber() })
            .select('id')
            .single();

          if (newOrder && item.students?.length) {
            await supabase.from('students').insert(
              item.students.map((s: any) => ({ ...s, id: undefined, order_id: newOrder.id }))
            );
          }
        }
      }

      toast({ title: `تم استيراد ${items.length} طلب بنجاح ✓` });
      loadOrders();
      loadTotalStudents();
    } catch (err) {
      toast({ title: 'خطأ في قراءة الملف', description: 'تأكد من صحة تنسيق JSON', variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOrderCreated = (orderId: string) => {
    const links = generateLinks(orderId);
    setGeneratedLinks(links);
    setShowLinks(true);
    loadOrders();
    loadTotalStudents();
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus } as any)
      .eq('id', orderId);
    if (error) {
      toast({ title: 'خطأ في تغيير الحالة', variant: 'destructive' });
    } else {
      toast({ title: 'تم تحديث الحالة ✓' });
      loadOrders();
    }
  };

  const handleEditCreated = (orderId: string) => {
    setEditingOrderId(null);
    loadOrders();
    loadTotalStudents();
  };

  const handleViewOrder = async (order: OrderRow) => {
    setViewingOrder(order);
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('order_id', order.id)
      .order('serial_number');
    setViewingStudents(data || []);
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrderId) return;
    await supabase.from('students').delete().eq('order_id', deletingOrderId);
    await supabase.from('order_scarf_designs').delete().eq('order_id', deletingOrderId);
    const { error } = await supabase.from('orders').delete().eq('id', deletingOrderId);
    if (error) {
      toast({ title: 'خطأ في الحذف', variant: 'destructive' });
    } else {
      toast({ title: 'تم حذف الطلب ✓' });
      loadOrders();
      loadTotalStudents();
    }
    setDeletingOrderId(null);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedOrderIds);
    await supabase.from('students').delete().in('order_id', ids);
    await supabase.from('order_scarf_designs').delete().in('order_id', ids);
    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) {
      toast({ title: 'خطأ في الحذف الجماعي', variant: 'destructive' });
    } else {
      toast({ title: `تم حذف ${ids.length} طلب ✓` });
      setSelectedOrderIds(new Set());
      loadOrders();
      loadTotalStudents();
    }
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
  };

  const handleShipOrder = async () => {
    if (!shippingOrderId || !trackingNumber.trim()) return;
    setSavingShipment(true);
    const { error } = await supabase
      .from('orders')
      .update({ tracking_number: trackingNumber.trim(), status: 'shipped' } as any)
      .eq('id', shippingOrderId);
    if (error) {
      toast({ title: 'خطأ في حفظ بيانات الشحن', variant: 'destructive' });
    } else {
      toast({ title: 'تم تأكيد الشحن ✓' });
      loadOrders();
    }
    setSavingShipment(false);
    setShippingOrderId(null);
    setTrackingNumber('');
  };

  const handleCompleteOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' } as any)
      .eq('id', orderId);
    if (error) {
      toast({ title: 'خطأ في إنهاء الطلب', variant: 'destructive' });
    } else {
      toast({ title: 'تم إنهاء الطلب ✓' });
      loadOrders();
    }
  };

  const exportBulkCSV = async () => {
    if (selectedOrderIds.size === 0) return;
    setBulkExporting(true);
    const ids = Array.from(selectedOrderIds);
    const [ordersRes, studentsRes] = await Promise.all([
      supabase.from('orders').select('*').in('id', ids),
      supabase.from('students').select('*').in('order_id', ids).order('serial_number'),
    ]);
    const ordersData = ordersRes.data || [];
    const studentsData = studentsRes.data || [];

    // Build CSV
    const headers = ['رقم الطلب', 'اسم القائدة', 'رقم الجوال', 'الحالة', 'عدد الطالبات', 'م', 'اسم الطالبة', 'المقاس'];
    const rows: string[][] = [];
    ordersData.forEach(order => {
      const orderStudents = studentsData.filter(s => s.order_id === order.id);
      if (orderStudents.length === 0) {
        rows.push([order.order_number, order.leader_name || '', order.leader_phone || '', order.status, String(order.student_count || 0), '', '', '']);
      } else {
        orderStudents.forEach((s, i) => {
          rows.push([
            i === 0 ? order.order_number : '',
            i === 0 ? (order.leader_name || '') : '',
            i === 0 ? (order.leader_phone || '') : '',
            i === 0 ? order.status : '',
            i === 0 ? String(order.student_count || 0) : '',
            String(s.serial_number),
            s.name || '',
            s.size || '',
          ]);
        });
      }
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setBulkExporting(false);
    setSelectedOrderIds(new Set());
  };

  const statsCards = [
    { label: 'إجمالي الطلبات', value: stats.total, icon: ClipboardList, color: 'text-primary' },
    { label: 'بانتظار البيانات', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'قيد التنفيذ', value: stats.inProgress, icon: Package, color: 'text-info' },
    { label: 'الطالبات المسجلات', value: stats.totalStudents, icon: Users, color: 'text-success' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الطلبات</h1>
            <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة ومتابعة الطلبات</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
              <Upload className="h-3.5 w-3.5" />
              استيراد
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              طلب جديد
            </Button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsCards.map(card => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو رقم الجوال أو رقم الطلب..."
              className="pr-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending_data">بانتظار البيانات</SelectItem>
              <SelectItem value="under_review">بانتظار المراجعة</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          {kits.length > 0 && (
            <Select value={kitFilter} onValueChange={setKitFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="الطقم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأطقم</SelectItem>
                {kits.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
            <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
              تم تحديد {selectedOrderIds.size} طلب
            </Badge>
            <div className="h-5 w-px bg-border" />
            <Select onValueChange={async (v) => {
              const ids = Array.from(selectedOrderIds);
              for (const id of ids) {
                await supabase.from('orders').update({ status: v } as any).eq('id', id);
              }
              toast({ title: `تم تغيير حالة ${ids.length} طلب ✓` });
              setSelectedOrderIds(new Set());
              loadOrders();
            }}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="تغيير الحالة إلى..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_data">بانتظار البيانات</SelectItem>
                <SelectItem value="under_review">بانتظار المراجعة</SelectItem>
                <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <div className="h-5 w-px bg-border" />
            <Button variant="outline" size="sm" onClick={exportBulkCSV} disabled={bulkExporting} className="gap-1.5 h-8">
              {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              تصدير CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportBulkJSON} disabled={bulkExporting} className="gap-1.5 h-8">
              {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
              تصدير JSON
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)} disabled={bulkDeleting} className="gap-1.5 h-8">
              {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              حذف جماعي
            </Button>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                {orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد نتائج مطابقة'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const status = statusLabels[order.status] || statusLabels.pending_data;
              const links = generateLinks(order.id);
              return (
                <Card key={order.id} className="border-border/50 hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedOrderIds.has(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                      />
                      {/* Order Info */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{order.order_number}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {(order as any).order_type === 'custom' ? 'تفصيل جديد' : 'طقم جاهز'}
                              {' · '}
                              <span className="text-primary/70">{order.employee_name || 'غير معروف'}</span>
                            </p>
                          </div>
                        </div>
                        {order.student_count ? (
                          <span className="text-xs text-muted-foreground">{order.student_count} طالبة</span>
                        ) : null}
                        <Badge className={`${status.className} border text-[11px] px-2 py-0.5`}>
                          {status.label}
                        </Badge>
                        {isAdmin && (
                          <Select
                            value={order.status}
                            onValueChange={v => handleStatusChange(order.id, v)}
                          >
                            <SelectTrigger className="h-7 w-[130px] text-xs shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending_data">بانتظار البيانات</SelectItem>
                              <SelectItem value="under_review">بانتظار المراجعة</SelectItem>
                              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                              <SelectItem value="completed">مكتمل</SelectItem>
                              <SelectItem value="cancelled">ملغي</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {/* Action Buttons - icon only with tooltips */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* View - far right */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>استعراض</TooltipContent>
                        </Tooltip>
                        {/* Links */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setGeneratedLinks(links);
                                setShowLinks(true);
                              }}
                            >
                              <Link className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>الروابط</TooltipContent>
                        </Tooltip>
                        {/* Export */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => exportOrderJSON(order.id)}
                            >
                              <FileJson className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>تصدير</TooltipContent>
                        </Tooltip>
                        {/* Edit - disabled when in_progress */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-8 w-8 ${order.status === 'in_progress' ? 'opacity-50 cursor-not-allowed text-blue-400' : ''}`}
                              disabled={order.status === 'in_progress'}
                              onClick={() => setEditingOrderId(order.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {order.status === 'in_progress' ? 'لا يمكن التعديل أثناء التنفيذ' : 'تعديل'}
                          </TooltipContent>
                        </Tooltip>
                        {/* Delete - only for pending_data or under_review */}
                        {(order.status === 'pending_data' || order.status === 'under_review') && isAdmin && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingOrderId(order.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>حذف</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Order Details Modal */}
      <Dialog open={!!viewingOrder} onOpenChange={open => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              تفاصيل الطلب {viewingOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-2">
            {viewingOrder && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground">معلومات الطلب</h3>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <DetailItem label="رقم الطلب" value={viewingOrder.order_number} />
                    <DetailItem label="نوع الطلب" value={viewingOrder.order_type === 'custom' ? 'تفصيل جديد' : 'طقم جاهز'} />
                    <DetailItem label="الحالة" value={statusLabels[viewingOrder.status]?.label || viewingOrder.status} />
                    <DetailItem label="عدد الطالبات" value={viewingOrder.student_count || 0} />
                    <DetailItem label="اسم المدرسة" value={viewingOrder.school_name} />
                    <DetailItem label="اسم القائدة" value={viewingOrder.leader_name} />
                    <DetailItem label="رقم القائدة" value={viewingOrder.leader_phone} />
                    <DetailItem label="الموظف" value={viewingOrder.employee_name} />
                    <DetailItem label="تاريخ الإنشاء" value={new Date(viewingOrder.created_at).toLocaleDateString('ar-SA')} />
                  </div>
                </div>

                {/* Shipping Info */}
                {(viewingOrder.recipient_name || viewingOrder.address_details) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">معلومات الشحن</h3>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <DetailItem label="اسم المستلم" value={viewingOrder.recipient_name} />
                      <DetailItem label="رقم المستلم" value={viewingOrder.recipient_phone} />
                      <DetailItem label="العنوان" value={viewingOrder.address_details} />
                      <DetailItem label="العنوان الوطني" value={viewingOrder.national_address} />
                    </div>
                  </div>
                )}

                {/* Notes */}
                {viewingOrder.notes && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">ملاحظات</h3>
                    <Separator />
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{viewingOrder.notes}</p>
                  </div>
                )}

                {/* Students */}
                {viewingStudents.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">الطالبات ({viewingStudents.length})</h3>
                    <Separator />
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-right p-2 font-medium text-muted-foreground">م</th>
                            <th className="text-right p-2 font-medium text-muted-foreground">الاسم</th>
                            <th className="text-right p-2 font-medium text-muted-foreground">المقاس</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingStudents.map(s => (
                            <tr key={s.id} className="border-t border-border/50">
                              <td className="p-2 text-muted-foreground">{s.serial_number}</td>
                              <td className="p-2">{s.name || '—'}</td>
                              <td className="p-2">{s.size || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      {user && (
        <CreateOrderDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          userId={user.id}
          onCreated={handleOrderCreated}
        />
      )}

      {/* Links Modal */}
      <Dialog open={showLinks} onOpenChange={setShowLinks}>
        <DialogContent className="max-w-sm border-0 shadow-2xl bg-gradient-to-br from-card/80 via-card/90 to-card/80 backdrop-blur-2xl ring-1 ring-border/20" dir="rtl">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                <Link className="h-4 w-4 text-primary" />
              </div>
              <span>روابط الطلب</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 mt-2">
            {generatedLinks && (
              <>
                <LinkCard
                  label="رابط القائدة"
                  description="إدارة الطلب وبيانات الطالبات"
                  url={generatedLinks.leaderLink}
                  icon="👑"
                  accentClass="from-amber-500/15 to-amber-500/5 ring-amber-500/20"
                  copied={copiedField === 'leader'}
                  onCopy={() => copyToClipboard(generatedLinks.leaderLink, 'leader')}
                />
                <LinkCard
                  label="رابط تسجيل الطالبات"
                  description="نموذج إدخال بيانات الطالبات"
                  url={generatedLinks.registerLink}
                  icon="📝"
                  accentClass="from-blue-500/15 to-blue-500/5 ring-blue-500/20"
                  copied={copiedField === 'register'}
                  onCopy={() => copyToClipboard(generatedLinks.registerLink, 'register')}
                />
                <LinkCard
                  label="رابط متابعة الحالة"
                  description="تتبع حالة الطلب للعميل"
                  url={generatedLinks.statusLink}
                  icon="📦"
                  accentClass="from-emerald-500/15 to-emerald-500/5 ring-emerald-500/20"
                  copied={copiedField === 'status'}
                  onCopy={() => copyToClipboard(generatedLinks.statusLink, 'status')}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog (Full) */}
      {user && (
        <CreateOrderDialog
          open={!!editingOrderId}
          onOpenChange={open => !open && setEditingOrderId(null)}
          userId={user.id}
          onCreated={handleEditCreated}
          editOrderId={editingOrderId}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingOrderId} onOpenChange={open => !open && setDeletingOrderId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الطلب؟ سيتم حذف جميع بيانات الطالبات المرتبطة به. لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirm */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف الجماعي</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف {selectedOrderIds.size} طلب؟ سيتم حذف جميع البيانات المرتبطة. لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
              حذف الكل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function LinkCard({
  label,
  description,
  url,
  icon,
  accentClass,
  copied,
  onCopy,
}: {
  label: string;
  description: string;
  url: string;
  icon: string;
  accentClass?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={`rounded-xl p-3 transition-all bg-gradient-to-br ${accentClass || 'from-muted/50 to-muted/20'} ring-1 hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <p className="text-sm font-bold text-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open(url, '_blank')}
            className="h-9 w-9 shrink-0 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm"
            title="فتح في تبويب جديد"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant={copied ? 'default' : 'outline'}
            size="icon"
            onClick={onCopy}
            className={`h-9 w-9 shrink-0 rounded-lg transition-all shadow-sm ${copied ? 'bg-emerald-500 hover:bg-emerald-500 text-white border-0' : 'bg-background/80 backdrop-blur-sm'}`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  );
}
