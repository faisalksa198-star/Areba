import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Copy, AlertTriangle, Save, Plus, Trash2, Users } from 'lucide-react';

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

// Name validation
function validateName(raw: string): { cleaned: string; error: string } {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { cleaned, error: '' };

  const isArabic = /[\u0600-\u06FF]/.test(cleaned);
  // Treat hyphenated parts as one word
  const words = cleaned.split(' ').map(w => w.replace(/-/g, '')).filter(Boolean);

  if (isArabic && words.length > 3) {
    return { cleaned, error: 'الاسم العربي يجب ألا يتجاوز 3 كلمات' };
  }
  if (!isArabic && words.length > 2) {
    return { cleaned, error: 'الاسم الإنجليزي يجب ألا يتجاوز كلمتين' };
  }
  return { cleaned, error: '' };
}

// Simple similarity check (Levenshtein-based)
function areSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  if (la.length < 2 || lb.length < 2) return false;
  // Check if one contains the other
  if (la.includes(lb) || lb.includes(la)) return true;
  // Simple distance: off by 1-2 chars
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

  // Load order info by UUID
  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('school_name, student_count')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (data) {
          setOrderInfo(data);
          setMaxStudents(data.student_count || 30);
        }
      });
  }, [orderId]);

  const totalExtras = useMemo(
    () => students.reduce((sum, s) => sum + s.extraServices.length, 0),
    [students]
  );

  const updateStudent = useCallback((id: string, field: keyof StudentRow, value: any) => {
    setStudents(prev => {
      const updated = prev.map(s => {
        if (s.id !== id) return s;
        const newS = { ...s, [field]: value };

        if (field === 'name') {
          const { cleaned, error } = validateName(value as string);
          newS.name = value as string; // keep raw while typing
          newS.nameError = error;
          // Check similarity
          const similar = prev.find(
            other => other.id !== id && areSimilar(cleaned, other.name.trim())
          );
          newS.similarWarning = similar
            ? `اسم مشابه موجود: "${similar.name.trim()}" (صف ${similar.serialNumber})`
            : '';
        }
        return newS;
      });
      return updated;
    });
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
    setStudents(prev =>
      prev.filter(s => s.id !== id).map((s, i) => ({ ...s, serialNumber: i + 1 }))
    );
  }, []);

  const toggleExtra = useCallback((id: string, service: string) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (!student) return prev;
      const currentTotal = prev.reduce((sum, s) => sum + s.extraServices.length, 0);
      const has = student.extraServices.includes(service);
      if (!has && currentTotal >= maxStudents) {
        return prev; // Limit reached
      }
      return prev.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          extraServices: has
            ? s.extraServices.filter(e => e !== service)
            : [...s.extraServices, service],
        };
      });
    });
  }, [maxStudents]);

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);

    const rows = students
      .filter(s => s.name.trim())
      .map(s => ({
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
            <Badge
              variant={totalExtras >= maxStudents ? 'destructive' : 'outline'}
              className="gap-1"
            >
              خدمات إضافية: {totalExtras} / {maxStudents}
            </Badge>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-[88px] z-20">
            <tr className="bg-muted">
              <th className="sticky right-0 z-10 bg-muted px-3 py-3 text-right font-semibold text-foreground w-10 border-b-2 border-border">
                #
              </th>
              <th className="sticky right-10 z-10 bg-muted px-3 py-3 text-right font-semibold text-foreground min-w-[160px] border-b-2 border-border">
                اسم الطالبة
              </th>
              <th className="px-3 py-3 text-center font-semibold text-foreground min-w-[280px] border-b-2 border-border">
                المقاس
              </th>
              <th className="px-3 py-3 text-center font-semibold text-foreground min-w-[180px] border-b-2 border-border">
                الوشاح
              </th>
              <th className="px-3 py-3 text-center font-semibold text-foreground min-w-[160px] border-b-2 border-border">
                القبعة
              </th>
              <th className="px-3 py-3 text-center font-semibold text-foreground min-w-[200px] border-b-2 border-border">
                خدمات إضافية
              </th>
              <th className="px-3 py-3 w-10 border-b-2 border-border"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <StudentRowComponent
                key={student.id}
                student={student}
                index={index}
                onUpdate={updateStudent}
                onCopyFromAbove={copyFromAbove}
                onToggleExtra={toggleExtra}
                onRemove={removeRow}
                totalExtras={totalExtras}
                maxExtras={maxStudents}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Actions */}
      <div className="sticky bottom-0 z-30 bg-card border-t border-border p-4 flex gap-3">
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

// Separate row component for performance
function StudentRowComponent({
  student,
  index,
  onUpdate,
  onCopyFromAbove,
  onToggleExtra,
  onRemove,
  totalExtras,
  maxExtras,
}: {
  student: StudentRow;
  index: number;
  onUpdate: (id: string, field: keyof StudentRow, value: any) => void;
  onCopyFromAbove: (index: number, field: 'size' | 'scarfChoice' | 'hatChoice') => void;
  onToggleExtra: (id: string, service: string) => void;
  onRemove: (id: string) => void;
  totalExtras: number;
  maxExtras: number;
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30">
      {/* Serial - sticky */}
      <td className="sticky right-0 z-10 bg-background px-2 py-2 text-center text-muted-foreground font-medium text-xs">
        {student.serialNumber}
      </td>

      {/* Name - sticky */}
      <td className="sticky right-8 z-10 bg-background px-2 py-2">
        <div className="space-y-1">
          <Input
            value={student.name}
            onChange={e => onUpdate(student.id, 'name', e.target.value)}
            onBlur={e => {
              const trimmed = e.target.value.trim().replace(/\s+/g, ' ');
              onUpdate(student.id, 'name', trimmed);
            }}
            placeholder="اسم الطالبة"
            className="h-9 text-sm bg-card border-input"
          />
          {student.nameError && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {student.nameError}
            </p>
          )}
          {student.similarWarning && (
            <p className="text-[11px] text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {student.similarWarning}
            </p>
          )}
        </div>
      </td>

      {/* Size */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button
              onClick={() => onCopyFromAbove(index, 'size')}
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="نسخ من الصف السابق"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex flex-wrap gap-1">
            {SIZES.map(size => (
              <button
                key={size}
                onClick={() => onUpdate(student.id, 'size', size)}
                className={`min-w-[40px] h-10 rounded-md text-sm font-medium transition-all ${
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
      </td>

      {/* Scarf */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button
              onClick={() => onCopyFromAbove(index, 'scarfChoice')}
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="نسخ من الصف السابق"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex flex-wrap gap-1">
            {SCARF_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => onUpdate(student.id, 'scarfChoice', opt)}
                className={`px-3 h-9 rounded-md text-xs font-medium transition-all ${
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
      </td>

      {/* Hat */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button
              onClick={() => onCopyFromAbove(index, 'hatChoice')}
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="نسخ من الصف السابق"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex flex-wrap gap-1">
            {HAT_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => onUpdate(student.id, 'hatChoice', opt)}
                className={`px-3 h-9 rounded-md text-xs font-medium transition-all ${
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
      </td>

      {/* Extra Services */}
      <td className="px-2 py-2">
        <div className="flex flex-wrap gap-1">
          {EXTRA_SERVICES.map(service => {
            const active = student.extraServices.includes(service);
            const disabled = !active && totalExtras >= maxExtras;
            return (
              <button
                key={service}
                onClick={() => !disabled && onToggleExtra(student.id, service)}
                disabled={disabled}
                className={`px-2 h-8 rounded-md text-[11px] font-medium transition-all ${
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
      </td>

      {/* Delete */}
      <td className="px-2 py-2">
        <button
          onClick={() => onRemove(student.id)}
          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
