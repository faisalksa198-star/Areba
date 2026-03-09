import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Save, Plus, Trash2, Users, Loader2 } from 'lucide-react';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];
const HAT_OPTIONS = ['بدون', 'بونيه', 'طاقية'];

interface ScarfDesign {
  id: string;
  sort_order: number;
  scarf_style_name?: string;
  date_type_name?: string;
  scarf_method_name?: string;
  embroidery_direction_name?: string;
  font_name?: string;
  embroidery_color?: string;
  scarf_style_image?: string | null;
  date_type_id?: string;
}

interface OrderInfo {
  student_count: number;
  logo_embroidery_enabled: boolean;
  logo_embroidery_count: number;
  back_embroidery_enabled: boolean;
  back_embroidery_count: number;
}

interface StudentRow {
  id: string;
  serialNumber: number;
  name: string;
  size: string;
  scarfDesignId: string;
  hatChoice: string;
  hasLogoEmbroidery: boolean;
  backEmbroideryText: string;
  nameError: string;
  similarWarning: string;
}

function createEmptyRow(serial: number, defaultScarfId: string): StudentRow {
  return {
    id: crypto.randomUUID(),
    serialNumber: serial,
    name: '',
    size: '',
    scarfDesignId: defaultScarfId,
    hatChoice: '',
    hasLogoEmbroidery: false,
    backEmbroideryText: '',
    nameError: '',
    similarWarning: '',
  };
}

function validateName(raw: string): { cleaned: string; error: string } {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { cleaned, error: '' };
  const isArabic = /[\u0600-\u06FF]/.test(cleaned);
  const words = cleaned.split(' ').map(w => w.replace(/-/g, '')).filter(Boolean);
  if (isArabic && words.length > 3) return { cleaned, error: 'الاسم العربي يجب ألا يتجاوز 3 كلمات' };
  if (!isArabic && words.length > 2) return { cleaned, error: 'الاسم الإنجليزي يجب ألا يتجاوز كلمتين' };
  return { cleaned, error: '' };
}

function areSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  if (la.length < 2 || lb.length < 2) return false;
  if (la.includes(lb) || lb.includes(la)) return true;
  if (Math.abs(la.length - lb.length) > 2) return false;
  let diff = 0;
  const maxLen = Math.max(la.length, lb.length);
  for (let i = 0; i < maxLen; i++) {
    if (la[i] !== lb[i]) diff++;
    if (diff > 2) return false;
  }
  return diff <= 2;
}

export default function LeaderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [maxStudents, setMaxStudents] = useState(30);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [scarfDesigns, setScarfDesigns] = useState<ScarfDesign[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    loadData();
  }, [orderId]);

  const loadData = async () => {
    // Load order info
    const { data: order } = await supabase
      .from('orders')
      .select('student_count, logo_embroidery_enabled, logo_embroidery_count, back_embroidery_enabled, back_embroidery_count')
      .eq('id', orderId!)
      .maybeSingle();

    if (!order) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const info: OrderInfo = {
      student_count: (order as any).student_count || 30,
      logo_embroidery_enabled: (order as any).logo_embroidery_enabled || false,
      logo_embroidery_count: (order as any).logo_embroidery_count || 0,
      back_embroidery_enabled: (order as any).back_embroidery_enabled || false,
      back_embroidery_count: (order as any).back_embroidery_count || 0,
    };
    setOrderInfo(info);
    setMaxStudents(info.student_count);

    // Load scarf designs with joined names
    const { data: scarfs } = await supabase
      .from('order_scarf_designs')
      .select(`
        id, sort_order, embroidery_color,
        scarf_styles!scarf_style_id(name, image_url),
        date_types!date_type_id(name),
        scarf_methods!scarf_method_id(name),
        embroidery_directions!embroidery_direction_id(name),
        fonts!font_id(name)
      `)
      .eq('order_id', orderId!)
      .order('sort_order');

    const parsedScarfs: ScarfDesign[] = (scarfs || []).map((s: any) => ({
      id: s.id,
      sort_order: s.sort_order,
      scarf_style_name: s.scarf_styles?.name,
      scarf_style_image: s.scarf_styles?.image_url,
      date_type_name: s.date_types?.name,
      scarf_method_name: s.scarf_methods?.name,
      embroidery_direction_name: s.embroidery_directions?.name,
      font_name: s.fonts?.name,
      embroidery_color: s.embroidery_color,
    }));
    setScarfDesigns(parsedScarfs);

    const defaultScarfId = parsedScarfs[0]?.id || '';

    // Check if logo embroidery is "all"
    const logoIsAll = info.logo_embroidery_enabled && (info.logo_embroidery_count === 0 || info.logo_embroidery_count >= info.student_count);

    // Initialize rows
    setStudents(Array.from({ length: 5 }, (_, i) => {
      const row = createEmptyRow(i + 1, defaultScarfId);
      if (logoIsAll) row.hasLogoEmbroidery = true;
      return row;
    }));
    setLoading(false);
  };

  const logoIsAll = orderInfo && orderInfo.logo_embroidery_enabled && (orderInfo.logo_embroidery_count === 0 || orderInfo.logo_embroidery_count >= maxStudents);

  const logoCount = useMemo(() => students.filter(s => s.hasLogoEmbroidery).length, [students]);
  const backCount = useMemo(() => students.filter(s => s.backEmbroideryText.trim()).length, [students]);

  const updateStudent = useCallback((id: string, field: keyof StudentRow, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newS = { ...s, [field]: value };
      if (field === 'name') {
        const { cleaned, error } = validateName(value as string);
        newS.name = value as string;
        newS.nameError = error;
        const similar = prev.find(other => other.id !== id && areSimilar(cleaned, other.name.trim()));
        newS.similarWarning = similar ? `اسم مشابه: "${similar.name.trim()}" (صف ${similar.serialNumber})` : '';
      }
      return newS;
    }));
  }, []);

  const addRow = useCallback(() => {
    const defaultScarfId = scarfDesigns[0]?.id || '';
    setStudents(prev => {
      const row = createEmptyRow(prev.length + 1, defaultScarfId);
      if (logoIsAll) row.hasLogoEmbroidery = true;
      return [...prev, row];
    });
  }, [scarfDesigns, logoIsAll]);

  const removeRow = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, serialNumber: i + 1 })));
  }, []);

  const toggleLogo = useCallback((id: string) => {
    if (logoIsAll) return; // Can't toggle when all
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (!student) return prev;
      const currentCount = prev.filter(s => s.hasLogoEmbroidery).length;
      if (!student.hasLogoEmbroidery && orderInfo && orderInfo.logo_embroidery_count > 0 && currentCount >= orderInfo.logo_embroidery_count) return prev;
      return prev.map(s => s.id === id ? { ...s, hasLogoEmbroidery: !s.hasLogoEmbroidery } : s);
    });
  }, [logoIsAll, orderInfo]);

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    const rows = students.filter(s => s.name.trim()).map(s => ({
      order_id: orderId,
      serial_number: s.serialNumber,
      name: s.name.trim(),
      size: s.size || null,
      scarf_design_id: s.scarfDesignId || null,
      hat_choice: s.hatChoice || null,
      has_logo_embroidery: s.hasLogoEmbroidery,
      back_embroidery_text: s.backEmbroideryText.trim() || null,
      extra_services: [],
    }));

    const { error } = await supabase.from('students').upsert(rows as any, { onConflict: 'id' });
    if (error) {
      toast({ title: 'خطأ في الحفظ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ بنجاح ✓' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  const showLogo = orderInfo?.logo_embroidery_enabled;
  const showBack = orderInfo?.back_embroidery_enabled;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">إدخال بيانات الطالبات</h1>
          <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {students.filter(s => s.name.trim()).length} / {maxStudents}
            </Badge>
            {showLogo && (
              <Badge variant="outline" className="gap-1">
                شعار: {logoCount} / {logoIsAll ? 'الكل' : orderInfo.logo_embroidery_count}
              </Badge>
            )}
            {showBack && (
              <Badge variant="outline" className="gap-1">
                تطريز خلفي: {backCount} / {orderInfo!.back_embroidery_count || 'الكل'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Scarf Design Cards */}
      {scarfDesigns.length > 0 && (
        <div className="px-3 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {scarfDesigns.map((scarf, idx) => (
              <div key={scarf.id} className="min-w-[160px] p-2.5 rounded-lg border border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  {scarf.scarf_style_image && (
                    <img src={scarf.scarf_style_image} className="w-8 h-8 rounded object-cover" />
                  )}
                  <Badge variant="secondary" className="text-[10px]">وشاح {idx + 1}</Badge>
                </div>
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  {scarf.scarf_style_name && <p>التصميم: {scarf.scarf_style_name}</p>}
                  {scarf.date_type_name && <p>التاريخ: {scarf.date_type_name}</p>}
                  {scarf.scarf_method_name && <p>الطرف: {scarf.scarf_method_name}</p>}
                  {scarf.embroidery_direction_name && <p>الاتجاه: {scarf.embroidery_direction_name}</p>}
                  {scarf.font_name && <p>الخط: {scarf.font_name}</p>}
                  {scarf.embroidery_color && <p>اللون: {scarf.embroidery_color}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="px-3 pt-3 pb-24">
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[700px] max-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-card border-b border-border">
                <tr>
                  <th className="w-12 px-2 py-3 text-center font-semibold text-muted-foreground">#</th>
                  <th className="w-[200px] px-2 py-3 text-right font-semibold text-muted-foreground">اسم الطالبة</th>
                  <th className="w-[160px] px-2 py-3 text-center font-semibold text-muted-foreground">المقاس</th>
                  <th className="w-[120px] px-2 py-3 text-center font-semibold text-muted-foreground">الوشاح</th>
                  <th className="w-[120px] px-2 py-3 text-center font-semibold text-muted-foreground">القبعة</th>
                  {showLogo && <th className="w-[70px] px-2 py-3 text-center font-semibold text-muted-foreground">شعار</th>}
                  {showBack && <th className="w-[140px] px-2 py-3 text-center font-semibold text-muted-foreground">تطريز خلفي</th>}
                  <th className="w-12 px-2 py-3 text-center font-semibold text-muted-foreground">حذف</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-b border-border/50 align-top">
                    <td className="px-2 py-3 text-center text-xs font-bold text-muted-foreground">{student.serialNumber}</td>
                    <td className="px-2 py-2.5">
                      <Input
                        value={student.name}
                        onChange={e => updateStudent(student.id, 'name', e.target.value)}
                        onBlur={e => updateStudent(student.id, 'name', e.target.value.trim().replace(/\s+/g, ' '))}
                        placeholder="الاسم"
                        className="h-9 text-xs"
                      />
                      {student.nameError && (
                        <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />{student.nameError}
                        </p>
                      )}
                      {student.similarWarning && (
                        <p className="text-[10px] text-warning flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />{student.similarWarning}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {SIZES.map(size => (
                          <button
                            key={size}
                            onClick={() => updateStudent(student.id, 'size', size)}
                            className={`min-w-[32px] h-7 rounded-md text-xs font-medium transition-colors ${
                              student.size === size
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      {scarfDesigns.length > 0 ? (
                        <Select
                          value={student.scarfDesignId}
                          onValueChange={v => updateStudent(student.id, 'scarfDesignId', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            {scarfDesigns.map((s, i) => (
                              <SelectItem key={s.id} value={s.id}>وشاح {i + 1}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {HAT_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => updateStudent(student.id, 'hatChoice', opt)}
                            className={`px-2 h-7 rounded-md text-xs font-medium transition-colors ${
                              student.hatChoice === opt
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </td>
                    {showLogo && (
                      <td className="px-2 py-2.5 text-center">
                        <Checkbox
                          checked={student.hasLogoEmbroidery}
                          onCheckedChange={() => toggleLogo(student.id)}
                          disabled={!!logoIsAll}
                        />
                      </td>
                    )}
                    {showBack && (
                      <td className="px-2 py-2.5">
                        <Input
                          value={student.backEmbroideryText}
                          onChange={e => {
                            // Prevent filling more than allowed
                            if (!student.backEmbroideryText.trim() && e.target.value.trim()) {
                              const currentBack = students.filter(s => s.id !== student.id && s.backEmbroideryText.trim()).length;
                              if (orderInfo && orderInfo.back_embroidery_count > 0 && currentBack >= orderInfo.back_embroidery_count) return;
                            }
                            updateStudent(student.id, 'backEmbroideryText', e.target.value);
                          }}
                          placeholder="النص"
                          className="h-8 text-xs"
                        />
                      </td>
                    )}
                    <td className="px-2 py-2.5 text-center">
                      <button
                        onClick={() => removeRow(student.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> صف
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1 flex-1">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
      </div>
    </div>
  );
}
