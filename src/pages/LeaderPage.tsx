import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, AlertTriangle, Save, Plus, Trash2, Users, Loader2 } from 'lucide-react';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];
const SCARF_OPTIONS = ['بدون', 'شيفون', 'كريب', 'جيرسي'];
const HAT_OPTIONS = ['بدون', 'بونيه', 'طاقية'];
const EXTRA_SERVICES = ['تطريز الاسم', 'تعديل الطول', 'إضافة جيب'];

interface StudentRow {
  id: string;
  serialNumber: number;
  name: string;
  size: string;
  scarfChoice: string;
  hatChoice: string;
  extraServices: string[];
  nameError: string;
  similarWarning: string;
}

function createEmptyRow(serial: number): StudentRow {
  return {
    id: crypto.randomUUID(),
    serialNumber: serial,
    name: '',
    size: '',
    scarfChoice: '',
    hatChoice: '',
    extraServices: [],
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
  const [students, setStudents] = useState<StudentRow[]>(() =>
    Array.from({ length: 5 }, (_, i) => createEmptyRow(i + 1))
  );
  const [maxStudents, setMaxStudents] = useState(30);
  const [orderInfo, setOrderInfo] = useState<{ school_name: string; student_count: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('school_name, student_count')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrderInfo(data);
          setMaxStudents(data.student_count || 30);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [orderId]);

  const totalExtras = useMemo(
    () => students.reduce((sum, s) => sum + s.extraServices.length, 0),
    [students]
  );

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

  const copyFromAbove = useCallback((index: number, field: 'size' | 'scarfChoice' | 'hatChoice') => {
    if (index === 0) return;
    setStudents(prev => {
      const newArr = [...prev];
      newArr[index] = { ...newArr[index], [field]: prev[index - 1][field] };
      return newArr;
    });
  }, []);

  const addRow = useCallback(() => {
    setStudents(prev => [...prev, createEmptyRow(prev.length + 1)]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, serialNumber: i + 1 })));
  }, []);

  const toggleExtra = useCallback((id: string, service: string) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (!student) return prev;
      const currentTotal = prev.reduce((sum, s) => sum + s.extraServices.length, 0);
      const has = student.extraServices.includes(service);
      if (!has && currentTotal >= maxStudents) return prev;
      return prev.map(s => {
        if (s.id !== id) return s;
        return { ...s, extraServices: has ? s.extraServices.filter(e => e !== service) : [...s.extraServices, service] };
      });
    });
  }, [maxStudents]);

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    const rows = students.filter(s => s.name.trim()).map(s => ({
      order_id: orderId,
      serial_number: s.serialNumber,
      name: s.name.trim(),
      size: s.size || null,
      scarf_choice: s.scarfChoice || null,
      hat_choice: s.hatChoice || null,
      extra_services: s.extraServices,
    }));
    const { error } = await supabase.from('students').upsert(rows, { onConflict: 'id' });
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

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">
            {orderInfo?.school_name || 'إدخال بيانات الطالبات'}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {students.filter(s => s.name.trim()).length} / {maxStudents}
            </Badge>
            <Badge variant={totalExtras >= maxStudents ? 'destructive' : 'outline'} className="gap-1">
              خدمات إضافية: {totalExtras} / {maxStudents}
            </Badge>
          </div>
        </div>
      </div>

      {/* Card-based list for mobile */}
      <div className="p-3 space-y-3 pb-24">
        {students.map((student, index) => (
          <div key={student.id} className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
            {/* Row header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground bg-muted rounded-lg px-2 py-1">
                #{student.serialNumber}
              </span>
              <button
                onClick={() => removeRow(student.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">اسم الطالبة</label>
              <Input
                value={student.name}
                onChange={e => updateStudent(student.id, 'name', e.target.value)}
                onBlur={e => {
                  const trimmed = e.target.value.trim().replace(/\s+/g, ' ');
                  updateStudent(student.id, 'name', trimmed);
                }}
                placeholder="أدخلي الاسم"
                className="h-10 text-sm"
              />
              {student.nameError && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {student.nameError}
                </p>
              )}
              {student.similarWarning && (
                <p className="text-[11px] text-warning flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {student.similarWarning}
                </p>
              )}
            </div>

            {/* Size */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">المقاس</label>
                {index > 0 && (
                  <button onClick={() => copyFromAbove(index, 'size')} className="text-[10px] text-primary flex items-center gap-0.5">
                    <Copy className="h-3 w-3" /> نسخ من السابق
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => updateStudent(student.id, 'size', size)}
                    className={`min-w-[40px] h-9 rounded-lg text-sm font-medium transition-all ${
                      student.size === size
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-accent/20'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Scarf */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">الوشاح</label>
                {index > 0 && (
                  <button onClick={() => copyFromAbove(index, 'scarfChoice')} className="text-[10px] text-primary flex items-center gap-0.5">
                    <Copy className="h-3 w-3" /> نسخ
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCARF_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateStudent(student.id, 'scarfChoice', opt)}
                    className={`px-3 h-9 rounded-lg text-sm font-medium transition-all ${
                      student.scarfChoice === opt
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-accent/20'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Hat */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">القبعة</label>
                {index > 0 && (
                  <button onClick={() => copyFromAbove(index, 'hatChoice')} className="text-[10px] text-primary flex items-center gap-0.5">
                    <Copy className="h-3 w-3" /> نسخ
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HAT_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateStudent(student.id, 'hatChoice', opt)}
                    className={`px-3 h-9 rounded-lg text-sm font-medium transition-all ${
                      student.hatChoice === opt
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-accent/20'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Services */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">خدمات إضافية</label>
              <div className="flex flex-wrap gap-1.5">
                {EXTRA_SERVICES.map(service => {
                  const active = student.extraServices.includes(service);
                  const disabled = !active && totalExtras >= maxStudents;
                  return (
                    <button
                      key={service}
                      onClick={() => !disabled && toggleExtra(student.id, service)}
                      disabled={disabled}
                      className={`px-3 h-8 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : disabled
                          ? 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3 flex gap-3">
        <Button variant="outline" onClick={addRow} className="gap-1 flex-1">
          <Plus className="h-4 w-4" />
          إضافة صف
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1 flex-1">
          <Save className="h-4 w-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ البيانات'}
        </Button>
      </div>
    </div>
  );
}
