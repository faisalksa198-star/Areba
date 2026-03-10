import PublicCalculator from '@/components/PublicCalculator';

export default function PublicCalculatorPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="Areba" className="h-12 w-12 mx-auto mb-3 rounded-xl" />
          <h1 className="text-2xl font-bold text-foreground">حاسبة الأسعار</h1>
          <p className="text-muted-foreground text-sm mt-1">احسب التكلفة الإجمالية لطلبك</p>
        </div>
        <PublicCalculator />
      </div>
    </div>
  );
}
