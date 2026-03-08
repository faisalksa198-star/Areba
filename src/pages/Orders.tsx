import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';

interface OrderLinks {
  leaderLink: string;
  registerLink: string;
  statusLink: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  school_name: string | null;
  leader_name: string | null;
  leader_phone: string | null;
  student_count: number | null;
  status: string;
  city_id: string | null;
  kit_id: string | null;
  created_at: string;
}

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<OrderLinks | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [schoolName, setSchoolName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [kits, setKits] = useState<{ id: string; name: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedKit, setSelectedKit] = useState('');

  // Load orders
  useEffect(() => {
    loadOrders();
    loadMasterData();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders((data as OrderRow[]) || []);
    setLoading(false);
  };

  const loadMasterData = async () => {
    const [citiesRes, kitsRes] = await Promise.all([
      supabase.from('cities').select('id, name').eq('is_active', true),
      supabase.from('ready_kits').select('id, name').eq('is_active', true),
    ]);
    setCities(citiesRes.data || []);
    setKits(kitsRes.data || []);
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const r = Math.floor(Math.random() * 9000 + 1000);
    return `ORD-${y}${m}${d}-${r}`;
  };

  const generateLinks = (orderId: string): OrderLinks => {
    const base = window.location.origin;
    return {
      leaderLink: `${base}/order/${orderId}/leader`,
      registerLink: `${base}/order/${orderId}/register`,
      statusLink: `${base}/order/${orderId}/status`,
    };
  };

  const handleCreateOrder = async () => {
    if (!user) {
      toast({ title: 'يجب تسجيل الدخول أولاً', variant: 'destructive' });
      return;
    }
    if (!schoolName.trim()) {
      toast({ title: 'يرجى إدخال اسم المدرسة', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const orderNumber = generateOrderNumber();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        employee_id: user.id,
        school_name: schoolName.trim(),
        leader_name: leaderName.trim() || null,
        leader_phone: leaderPhone.trim() || null,
        student_count: parseInt(studentCount) || null,
        city_id: selectedCity || null,
        kit_id: selectedKit || null,
        status: 'pending_data' as const,
      })
      .select('id')
      .single();

    if (error) {
      toast({ title: 'خطأ في إنشاء الطلب', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Generate links and update order with them
    const links = generateLinks(data.id);

    await supabase
      .from('orders')
      .update({
        leader_link: data.id,
        registration_link: data.id,
        tracking_link: data.id,
      })
      .eq('id', data.id);

    setGeneratedLinks(links);
    setShowCreate(false);
    setShowLinks(true);
    setSaving(false);

    // Reset form
    setSchoolName('');
    setLeaderName('');
    setLeaderPhone('');
    setStudentCount('');
    setSelectedCity('');
    setSelectedKit('');

    loadOrders();
    toast({ title: `تم إنشاء الطلب ${orderNumber} بنجاح ✓` });
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const statusLabels: Record<string, { label: string; className: string }> = {
    pending_data: { label: 'بانتظار البيانات', className: 'bg-warning/10 text-warning border-warning/20' },
    in_progress: { label: 'قيد التنفيذ', className: 'bg-info/10 text-info border-info/20' },
    completed: { label: 'مكتمل', className: 'bg-success/10 text-success border-success/20' },
    cancelled: { label: 'ملغي', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الطلبات</h1>
            <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة ومتابعة الطلبات</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            طلب جديد
          </Button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">لا توجد طلبات بعد</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const status = statusLabels[order.status] || statusLabels.pending_data;
              const links = generateLinks(order.id);
              return (
                <Card key={order.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-foreground text-sm">{order.order_number}</p>
                        <p className="text-muted-foreground text-xs">{order.school_name}</p>
                      </div>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      {order.leader_name && <span>القائدة: {order.leader_name}</span>}
                      {order.student_count && <span>• {order.student_count} طالبة</span>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs flex-1"
                        onClick={() => {
                          setGeneratedLinks(links);
                          setShowLinks(true);
                        }}
                      >
                        <Link className="h-3 w-3" />
                        الروابط
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => window.open(links.statusLink, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        متابعة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Order Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء طلب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">اسم المدرسة *</label>
              <Input
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="أدخل اسم المدرسة"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">اسم القائدة</label>
                <Input
                  value={leaderName}
                  onChange={e => setLeaderName(e.target.value)}
                  placeholder="اسم القائدة"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">رقم الجوال</label>
                <Input
                  value={leaderPhone}
                  onChange={e => setLeaderPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  type="tel"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">عدد الطالبات</label>
              <Input
                value={studentCount}
                onChange={e => setStudentCount(e.target.value)}
                placeholder="30"
                type="number"
                min="1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">المدينة</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">الطقم</label>
                <Select value={selectedKit} onValueChange={setSelectedKit}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطقم" />
                  </SelectTrigger>
                  <SelectContent>
                    {kits.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateOrder} disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'جارٍ الإنشاء...' : 'حفظ وإرسال الطلب'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Links Modal */}
      <Dialog open={showLinks} onOpenChange={setShowLinks}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              روابط الطلب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {generatedLinks && (
              <>
                <LinkRow
                  label="رابط القائدة"
                  description="لإدارة بيانات الطالبات"
                  url={generatedLinks.leaderLink}
                  copied={copiedField === 'leader'}
                  onCopy={() => copyToClipboard(generatedLinks.leaderLink, 'leader')}
                />
                <LinkRow
                  label="رابط تسجيل الطالبات"
                  description="لإدخال بيانات الطالبات"
                  url={generatedLinks.registerLink}
                  copied={copiedField === 'register'}
                  onCopy={() => copyToClipboard(generatedLinks.registerLink, 'register')}
                />
                <LinkRow
                  label="رابط متابعة الحالة"
                  description="لمتابعة حالة الطلب"
                  url={generatedLinks.statusLink}
                  copied={copiedField === 'status'}
                  onCopy={() => copyToClipboard(generatedLinks.statusLink, 'status')}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function LinkRow({
  label,
  description,
  url,
  copied,
  onCopy,
}: {
  label: string;
  description: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate direction-ltr mt-0.5">{url}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onCopy} className="gap-1 shrink-0 h-8 text-xs">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'تم' : 'نسخ'}
      </Button>
    </div>
  );
}
