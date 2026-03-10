import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PricingRule {
  min_quantity: number;
  max_quantity: number;
  price_per_kit: number;
}

interface AddonPrice {
  key: string;
  name: string;
  price: number;
}

export default function PublicCalculator() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [addons, setAddons] = useState<Record<string, AddonPrice>>({});
  const [loading, setLoading] = useState(true);

  const [kitCount, setKitCount] = useState('');
  const [abayaExtra, setAbayaExtra] = useState('');
  const [scarfQitanCount, setScarfQitanCount] = useState('');
  const [scarfDecoratedCount, setScarfDecoratedCount] = useState('');
  const [backEmbroideryCount, setBackEmbroideryCount] = useState('');
  const [logoCount, setLogoCount] = useState('');
  const [hatEmbroideryCount, setHatEmbroideryCount] = useState('');
  const [purpleCount, setPurpleCount] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('pricing_rules').select('*').order('min_quantity', { ascending: true }),
      supabase.from('addon_prices' as any).select('*'),
    ]).then(([rulesRes, addonsRes]) => {
      setRules((rulesRes.data as unknown as PricingRule[]) || []);
      const addonMap: Record<string, AddonPrice> = {};
      ((addonsRes.data as unknown as AddonPrice[]) || []).forEach(a => { addonMap[a.key] = a; });
      setAddons(addonMap);
      setLoading(false);
    });
  }, []);

  const getAddonPrice = (key: string, fallback: number) => addons[key]?.price ?? fallback;

  const qty = parseInt(kitCount) || 0;
  const enabled = qty > 0;

  const unitPrice = useMemo(() => {
    if (!enabled) return 0;
    const rule = rules.find(r => qty >= r.min_quantity && qty <= r.max_quantity);
    return rule ? rule.price_per_kit : 0;
  }, [qty, rules, enabled]);

  const basePrice = unitPrice * qty;
  const abayaTotal = (parseFloat(abayaExtra) || 0) * qty;
  const scarfQitanPrice = getAddonPrice('scarf_qitan', 2);
  const scarfDecoratedPrice = getAddonPrice('scarf_decorated', 2);
  const backEmbPrice = getAddonPrice('back_embroidery', 20);
  const logoPrice = getAddonPrice('logo_embroidery', 20);
  const hatEmbPrice = getAddonPrice('hat_embroidery', 20);
  const purplePrice = getAddonPrice('purple_package', 25);

  const scarfQitan = (parseInt(scarfQitanCount) || 0) * scarfQitanPrice;
  const scarfDecorated = (parseInt(scarfDecoratedCount) || 0) * scarfDecoratedPrice;
  const backEmb = (parseInt(backEmbroideryCount) || 0) * backEmbPrice;
  const logo = (parseInt(logoCount) || 0) * logoPrice;
  const hatEmb = (parseInt(hatEmbroideryCount) || 0) * hatEmbPrice;
  const purple = (parseInt(purpleCount) || 0) * purplePrice;

  const total = basePrice + abayaTotal + scarfQitan + scarfDecorated + backEmb + logo + hatEmb + purple;

  const fmt = (n: number) => n.toLocaleString('en-US');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">عدد الأطقم</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min="1"
            placeholder="أدخل عدد الأطقم أولاً"
            value={kitCount}
            onChange={e => setKitCount(e.target.value)}
            className="text-lg"
          />
          {enabled && unitPrice > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              سعر الطقم الواحد: <span className="font-semibold text-foreground">{fmt(unitPrice)} ريال</span>
            </p>
          )}
          {enabled && unitPrice === 0 && (
            <p className="text-sm text-destructive mt-2">لا يوجد نطاق تسعيرة لهذا العدد</p>
          )}
        </CardContent>
      </Card>

      <Card className={!enabled ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">الإضافات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">إضافات العباية (بالريال)</Label>
            <Input type="number" min="0" step="0.01" placeholder="0" value={abayaExtra} onChange={e => setAbayaExtra(e.target.value)} disabled={!enabled} />
            {enabled && abayaTotal > 0 && <p className="text-xs text-muted-foreground mt-1">= {fmt(abayaTotal)} ريال</p>}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">أوشحة بقيطان</Label>
              <Input type="number" min="0" placeholder="0" value={scarfQitanCount} onChange={e => setScarfQitanCount(e.target.value)} disabled={!enabled} />
              {enabled && scarfQitan > 0 && <p className="text-xs text-muted-foreground mt-1">× {fmt(scarfQitanPrice)} = {fmt(scarfQitan)} ريال</p>}
            </div>
            <div>
              <Label className="text-sm">أوشحة بخط مزخرف</Label>
              <Input type="number" min="0" placeholder="0" value={scarfDecoratedCount} onChange={e => setScarfDecoratedCount(e.target.value)} disabled={!enabled} />
              {enabled && scarfDecorated > 0 && <p className="text-xs text-muted-foreground mt-1">× {fmt(scarfDecoratedPrice)} = {fmt(scarfDecorated)} ريال</p>}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">تطريز في الخلف</Label>
              <Input type="number" min="0" placeholder="0" value={backEmbroideryCount} onChange={e => setBackEmbroideryCount(e.target.value)} disabled={!enabled} />
              {enabled && backEmb > 0 && <p className="text-xs text-muted-foreground mt-1">× {fmt(backEmbPrice)} = {fmt(backEmb)} ريال</p>}
            </div>
            <div>
              <Label className="text-sm">إضافة شعار</Label>
              <Input type="number" min="0" placeholder="0" value={logoCount} onChange={e => setLogoCount(e.target.value)} disabled={!enabled} />
              {enabled && logo > 0 && <p className="text-xs text-muted-foreground mt-1">× {fmt(logoPrice)} = {fmt(logo)} ريال</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">تطريز قبعة</Label>
              <Input type="number" min="0" placeholder="0" value={hatEmbroideryCount} onChange={e => setHatEmbroideryCount(e.target.value)} disabled={!enabled} />
              {enabled && hatEmb > 0 && <p className="text-xs text-muted-foreground mt-1">× {fmt(hatEmbPrice)} = {fmt(hatEmb)} ريال</p>}
            </div>
            <div>
              <Label className="text-sm">بكج Purple</Label>
              <Input type="number" min="0" placeholder="0" value={purpleCount} onChange={e => setPurpleCount(e.target.value)} disabled={!enabled} />
              {enabled && purple > 0 && <p className="text-xs text-muted-foreground mt-1">× {fmt(purplePrice)} = {fmt(purple)} ريال</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">المجموع النهائي</p>
          <p className="text-4xl font-bold text-primary">
            {enabled ? fmt(total) : '—'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">ريال سعودي</p>
        </CardContent>
      </Card>
    </div>
  );
}
