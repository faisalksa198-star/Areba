# تحليل مشروع Areba

> تم إعداد هذا المستند بعد قراءة ملفات المشروع ومجلداته من الفرع `main`، بما في ذلك كود الواجهة، إعدادات البناء، تكامل Supabase، الدوال الطرفية، المايغريشنز، وأنواع قاعدة البيانات المولدة. لم يتم تضمين قيم `.env` الحساسة، وتم الاكتفاء بذكر أسماء المتغيرات المطلوبة.

> حالة المستند: هذا الملف هو المرجع الرسمي الحالي لفهم المشروع. عند تنفيذ أي تعديل مستقبلي يجب البدء منه لفهم البنية والتدفقات والقيود المعروفة، ثم فحص الملفات الفعلية المرتبطة بالتعديل للتأكد من عدم تغير الكود عن هذا الوصف.

## 1. وصف المشروع والغرض منه

مشروع `Areba` هو نظام ويب لإدارة الطلبات الجماعية لمتجر Areba، ويبدو أنه موجه لإدارة طلبات أطقم/عبايات/أوشحة/قبعات للمدارس أو المجموعات. النظام يوفر لوحة تحكم للموظفين والإدارة، إنشاء طلبات جديدة، مشاركة روابط عامة لقائدة الطلب أو الطالبات لإدخال البيانات، متابعة حالة الطلب، إدارة المنتجات والبيانات المرجعية، إنشاء فواتير، وتصدير تقارير Excel/CSV/PDF.

النظام يدعم مسارين رئيسيين للطلبات:

- طلبات الموقع/النظام الداخلي: تبدأ من موظف ينشئ طلبا، ثم يتم جمع بيانات الطالبات عبر رابط عام، ثم تمر الطلبات بمراحل مراجعة وتنفيذ وشحن وتسليم.
- طلبات "سلة": إدارة يدوية لطلبات قادمة من متجر/قناة سلة، مع منتجات وخيارات ديناميكية وتصدير مستقل.

## 2. البنية المعمارية للنظام

البنية العامة بسيطة ومباشرة:

- واجهة أمامية SPA مبنية بـ `Vite + React + TypeScript`.
- تنقل داخلي عبر `react-router-dom`.
- واجهة عربية RTL باستخدام Tailwind CSS ومكونات shadcn/Radix.
- عميل Supabase موحد في `src/integrations/supabase/client.ts`.
- قاعدة بيانات PostgreSQL على Supabase مع RLS.
- مصادقة Supabase Auth.
- تخزين ملفات في Supabase Storage bucket باسم `images`.
- Edge Functions لإدارة الموظفين باستخدام `SUPABASE_SERVICE_ROLE_KEY`.
- أدوات تصدير محلية في المتصفح لـ PDF وExcel وCSV.

تدفق معماري مختصر:

```text
React Pages/Components
        |
        | supabase-js
        v
Supabase Auth + Postgres + Storage
        |
        | Edge Functions للعمليات الإدارية الحساسة
        v
create-employee / list-employees / delete-employee
```

الواجهة تتعامل مباشرة مع معظم جداول Supabase عبر `supabase.from(...)`. أما عمليات إنشاء/حذف/قائمة الموظفين فتتم عبر Edge Functions لأنها تحتاج صلاحيات إدارية غير متاحة للعميل.

## 3. شرح المجلدات الرئيسية

### `public/`

يحتوي على أصول عامة يتم تقديمها كما هي من Vite:

- `logo.svg`: شعار Areba.
- `favicon.ico`: أيقونة الموقع.
- `placeholder.svg`: صورة بديلة.
- `robots.txt`: إعدادات الزحف.
- `_redirects`: غالبا مخصص للنشر على Netlify/استضافة مشابهة لدعم توجيه SPA.
- `fonts/`: خطوط Tajawal محلية.

### `src/`

كود التطبيق الأمامي بالكامل.

- `App.tsx`: تعريف المزودات العامة والمسارات.
- `main.tsx`: نقطة تشغيل React.
- `index.css`: Tailwind وTheme variables واتجاه RTL.
- `App.css`: بقايا CSS من قالب Vite الافتراضي ويبدو أنه غير محوري.

### `src/pages/`

شاشات التطبيق الرئيسية. يحتوي على لوحات الإدارة والصفحات العامة وصفحات الطلبات والفواتير وسلة. ليست كل الملفات هنا مرتبطة بمسار مباشر في `App.tsx`؛ بعض الصفحات أو محتوياتها تستخدم كتبعيات داخل صفحات أخرى مثل مركز البيانات.

### `src/components/`

مكونات مشتركة ومكونات منطقية مثل الشريط الجانبي، حاسبة الأسعار، تبويبات الأسعار، مودال التصدير، إدارة منتجات سلة داخل مركز البيانات، ومكون إنشاء الطلب.

### `src/components/ui/`

مكتبة مكونات UI مبنية على shadcn/Radix مثل Button, Dialog, Table, Tabs, Sidebar, Toast وغيرها. هذه طبقة عرض قابلة لإعادة الاستخدام ولا تحتوي عادة منطق أعمال.

### `src/hooks/`

Hooks مشتركة:

- `useAuth.tsx`: إدارة جلسة المستخدم والمصادقة.
- `useActiveSeason.ts`: جلب الموسم النشط.
- `use-mobile.tsx`: كشف عرض الموبايل.
- `use-toast.ts`: نظام التنبيهات.

### `src/integrations/supabase/`

تكامل Supabase:

- `client.ts`: إنشاء عميل Supabase.
- `types.ts`: أنواع TypeScript المولدة من قاعدة البيانات.

### `src/lib/`

خدمات مساعدة وتصدير:

- إنشاء PDF للفواتير والتقارير.
- تصدير CSV/XLSX للطلبات.
- تحويل بيانات الطلب إلى شكل مناسب للتصدير.
- أدوات عامة مثل `cn`.

### `src/test/`

إعداد اختبارات Vitest واختبار تجريبي بسيط.

### `supabase/`

إعدادات Supabase:

- `config.toml`: يحتوي `project_id`.
- `functions/`: Edge Functions.
- `migrations/`: تعريف الجداول والسياسات والدوال والتعديلات.

## 4. أهم الملفات ووظيفة كل ملف

### ملفات الجذر

- `package.json`: يحدد سكربتات التشغيل والبناء والاختبار والحزم الأساسية. السكربتات المهمة: `dev`, `build`, `lint`, `preview`, `test`.
- `vite.config.ts`: إعداد Vite، المنفذ `8080`، alias `@` إلى `src/`، وتفعيل `lovable-tagger` في وضع التطوير.
- `vitest.config.ts`: إعداد Vitest مع `jsdom`.
- `tailwind.config.ts`: إعداد Tailwind، الألوان المبنية على CSS variables، ودعم shadcn.
- `components.json`: إعداد shadcn/ui.
- `.env`: يحتوي أسماء متغيرات Supabase المطلوبة: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`.
- `README.md`: ملف Lovable الافتراضي مع تعليمات تشغيل عامة.

### ملفات التطبيق

- `src/App.tsx`: يربط `QueryClientProvider`, `TooltipProvider`, `BrowserRouter`, و`AuthProvider`. يعرف كل Routes مثل `/dashboard`, `/orders`, `/employees`, `/order/:orderId/leader`, `/salla-orders`.
- `src/main.tsx`: يقوم بتركيب React داخل `#root`.
- `src/index.css`: يعرف الخطوط، متغيرات الألوان، RTL، وطبقات Tailwind.
- `src/integrations/supabase/client.ts`: ينشئ عميل Supabase باستخدام متغيرات Vite ويضبط حفظ الجلسة في `localStorage`.
- `src/hooks/useAuth.tsx`: يتابع حالة Supabase Auth ويوفر `signIn`, `signUp`, `signOut`.
- `src/components/AdminRoute.tsx`: يحمي الصفحات الإدارية بناء على `user_roles` وقبول أدوار `owner` و`manager`.
- `src/components/DashboardLayout.tsx`: Layout للصفحات الداخلية مع Sidebar، ويتطلب تسجيل الدخول.
- `src/components/AppSidebar.tsx`: قائمة التنقل، وتظهر عناصر الإدارة فقط للمالك/المدير.

### ملفات الأعمال الرئيسية

- `src/pages/Orders.tsx`: إدارة الطلبات الداخلية: عرض، بحث، تصفية، إنشاء، تعديل، حذف، تحديث حالة، تصدير، إنشاء روابط قصيرة، واستيراد JSON.
- `src/components/orders/CreateOrderDialog.tsx`: نموذج إنشاء/تعديل الطلب. يجمع بيانات القائدة، نوع الطلب، الطقم الجاهز أو التصميم المخصص، الأوشحة، التطريز، الصور، والعدادات.
- `src/pages/LeaderPage.tsx`: صفحة عامة/شبه عامة لقائدة الطلب لإدخال بيانات الطالبات والشحن والإضافات، ثم إرسال الطلب للمراجعة.
- `src/pages/StudentRegister.tsx`: صفحة عامة مبسطة لتسجيل طالبة واحدة في طلب.
- `src/pages/OrderStatus.tsx`: صفحة عامة لمتابعة حالة الطلب.
- `src/pages/Dashboard.tsx`: لوحة مؤشرات تجمع طلبات النظام وطلبات سلة، وتعرض إحصاءات ورسوم ونشاطات.
- `src/pages/DataCenter.tsx`: مركز البيانات المرجعية مثل المدن، التصاميم، الخطوط، أنماط الأكمام، إلخ.
- `src/components/PricingRulesTab.tsx`: إدارة نطاقات تسعير الأطقم حسب الكمية داخل مركز البيانات.
- `src/components/AddonPricesTab.tsx`: إدارة أسعار الإضافات التي تستخدمها الحاسبة.
- `src/pages/Kits.tsx`: إدارة الأطقم الجاهزة وربطها بخيارات التصميم والألوان.
- `src/pages/Employees.tsx`: إدارة الموظفين عبر Edge Functions.
- `src/pages/Invoices.tsx`: إنشاء وإدارة الفواتير المرتبطة بالطلبات.
- `src/pages/SallaOrders.tsx`: إدارة طلبات سلة والمنتجات المختارة داخل كل طلب.
- `src/components/SallaProductsContent.tsx`: إدارة منتجات سلة بشكل متقدم مع خيارات ديناميكية وقيم افتراضية.
- `src/pages/SallaProducts.tsx`: نسخة أبسط لإدارة منتجات سلة، لكنها ليست Route مباشر في `App.tsx` في النسخة الحالية.
- `src/pages/SeasonSettings.tsx`: إدارة المواسم وتحديد موسم نشط. المكوّن `SeasonSettingsContent` مستخدم داخل `/data-center`، أما الصفحة نفسها فليست Route مباشر في `App.tsx` في النسخة الحالية.
- `src/pages/PrintCustomerReport.tsx`: عرض تقرير عميل قابل للطباعة.
- `src/lib/orderReportData.ts`: تجميع بيانات تقرير الطلب من الجداول المرتبطة.
- `src/lib/orderXlsxExporter.ts`: تصدير الطلبات الداخلية إلى Excel متعدد الأوراق.
- `src/lib/sallaOrderXlsxExporter.ts`: تصدير طلبات سلة إلى Excel.
- `src/lib/orderCsvExporter.ts`: تصدير الطلبات إلى CSV.
- `src/lib/invoicePdfGenerator.ts`: إنشاء PDF للفاتورة باستخدام DOM + html2canvas + jsPDF.
- `src/lib/orderPdfGenerator.tsx`: فتح صفحة تقرير الطلب للطباعة.

## 5. تدفق البيانات من واجهة المستخدم إلى قاعدة البيانات

### إنشاء طلب داخلي

1. الموظف يسجل الدخول عبر `/login`.
2. يدخل إلى `/orders`.
3. يفتح `CreateOrderDialog`.
4. الواجهة تجلب بيانات مرجعية من:
   - `ready_kits`
   - `abaya_designs`
   - `sleeve_styles`
   - `scarf_styles`
   - `scarf_methods`
   - `date_types`
   - `embroidery_directions`
   - `fonts`
   - `hat_embroideries`
5. إذا اختار المستخدم صورا، ترفع إلى bucket `images`.
6. يتم إدخال صف في `orders`.
7. يتم إدخال تصاميم الأوشحة المرتبطة في `order_scarf_designs`.
8. بعد الإنشاء تعرض الصفحة روابط:
   - رابط القائدة `/order/:orderId/leader`
   - رابط تسجيل طالبة `/order/:orderId/register`
   - رابط المتابعة `/order/:orderId/status`
9. يمكن إنشاء روابط قصيرة في `short_links`.

### إدخال بيانات الطالبات

1. القائدة تفتح `/order/:orderId/leader`.
2. الصفحة تجلب الطلب وتصاميم الأوشحة والقبعات والمدن والطالبات والإضافات.
3. عند الحفظ:
   - تحذف بيانات الطلاب القديمة لهذا الطلب من `students`.
   - تدخل القائمة الجديدة في `students`.
   - تحدث `extra_scarves` و`extra_hats`.
   - تحدث بيانات الشحن داخل `orders`.
4. عند الإرسال النهائي:
   - تحدث `orders.data_submitted = true`.
   - تغير الحالة إلى `under_review`.
   - تحفظ `submitted_at`.
5. تصبح الصفحة مقفلة إذا تم إرسال البيانات أو خرجت الحالة من `pending_data`.

### معالجة الطلب

1. الموظف يتابع الطلب من `/orders`.
2. يمكن تغيير الحالة إلى:
   - `pending_data`
   - `under_review`
   - `in_progress`
   - `shipped`
   - `completed`
   - `cancelled`
3. عند الشحن يتم حفظ `tracking_number` وتغيير الحالة إلى `shipped`.
4. عند الاكتمال تتغير الحالة إلى `completed`.
5. صفحة `/order/:orderId/status` تقرأ الحالة وتعرضها للعميل.

### الفواتير

1. صفحة `/invoices` تجلب الطلبات والفواتير الموجودة.
2. المستخدم يختار طلبا ويحسب البنود عبر `PublicCalculator`.
3. يتم إدخال فاتورة في `invoices` مع `line_items`, totals, discount, tax.
4. يمكن تنزيل PDF عبر `invoicePdfGenerator`.

### طلبات سلة

1. المنتجات تعرف في `salla_products` وخياراتها في `salla_product_options`.
2. صفحة `/salla-orders` تنشئ طلبا في `salla_orders`.
3. العناصر تحفظ في `salla_order_items` مع `option_values` كـ JSON.
4. التصدير يتم عبر `sallaOrderXlsxExporter`.

### الحاسبة والتسعير

1. `PublicCalculator` يقرأ نطاقات الأسعار من `pricing_rules` وأسعار الإضافات من `addon_prices`.
2. السعر الأساسي يحسب عبر مطابقة عدد الأطقم مع نطاق `min_quantity` و`max_quantity`.
3. الإضافات الثابتة مثل تطريز الخلف والشعار وتطريز القبعة وبكج Purple تسحب أسعارها من `addon_prices` مع قيم fallback داخل المكون.
4. توجد حقول يدوية لبعض الإضافات مثل الأوشحة الإضافية والقبعات، ويمكن تمرير ملخص الحاسبة إلى الفواتير عبر `onSummaryChange`.

## 6. جداول Supabase والعلاقات بينها

### Enums

- `app_role`: القيم `owner`, `manager`, `customer_service`.
- `order_status`: القيم `pending_data`, `under_review`, `in_progress`, `shipped`, `completed`, `cancelled`.

### جداول المستخدمين والصلاحيات

- `profiles`: ملف المستخدم. يرتبط بـ `auth.users` عبر `user_id`.
- `user_roles`: أدوار المستخدمين. يرتبط بـ `auth.users` عبر `user_id`.

### جداول البيانات المرجعية

- `abaya_designs`: تصاميم العبايات.
- `sleeve_styles`: أنماط الأكمام.
- `scarf_styles`: أنماط الأوشحة.
- `scarf_methods`: طرق/أساليب الوشاح.
- `fonts`: الخطوط.
- `cities`: المدن.
- `hat_styles`: أنماط القبعات.
- `hat_embroideries`: خيارات تطريز القبعات.
- `embroidery_directions`: اتجاهات التطريز.
- `date_types`: أنواع التاريخ.

معظم هذه الجداول تحتوي أعمدة مشتركة مثل `id`, `name`, `image_url`, `is_active`, `sort_order`, `created_at`, `updated_at`.

### جداول التسعير والحاسبة

- `pricing_rules`: نطاقات سعر الطقم حسب الكمية، وتستخدمها الحاسبة العامة والداخلية.
- `addon_prices`: أسعار الإضافات المعرفة بمفتاح ثابت مثل `scarf_qitan`, `back_embroidery`, `logo_embroidery`, `hat_embroidery`, و`purple_package`.

تدار هذه الجداول من `/data-center` عبر `PricingRulesTab` و`AddonPricesTab`. سياساتها تسمح بالقراءة العامة/للكل حسب المايغريشنز، بينما الإنشاء والتعديل والحذف محصور غالبا في `owner` و`manager`.

### جداول الطلبات الداخلية

- `ready_kits`: الأطقم الجاهزة. ترتبط بعدة جداول مرجعية مثل `abaya_designs`, `sleeve_styles`, `scarf_styles`, `scarf_methods`, `hat_styles`, `fonts`, `date_types`, `embroidery_directions`.
- `orders`: الجدول المركزي للطلبات. يرتبط بـ:
  - `auth.users` عبر `employee_id`.
  - `ready_kits` عبر `kit_id`.
  - `cities` عبر `city_id` و`shipping_city_id`.
  - `abaya_designs` عبر `abaya_design_id`.
  - `sleeve_styles` عبر `sleeve_style_id`.
- `order_scarf_designs`: تصاميم أوشحة متعددة لكل طلب. يرتبط بـ `orders`, `scarf_styles`, `date_types`, `scarf_methods`, `embroidery_directions`, `fonts`.
- `students`: طالبات الطلب. يرتبط بـ `orders`, `order_scarf_designs`, `hat_embroideries`.
- `extra_scarves`: أوشحة إضافية. يرتبط بـ `orders` و`order_scarf_designs`.
- `extra_hats`: قبعات إضافية. يرتبط بـ `orders` و`hat_embroideries`.
- `invoices`: فاتورة واحدة لكل طلب تقريبا عبر `UNIQUE(order_id)`. ترتبط بـ `orders`.
- `short_links`: روابط قصيرة للروابط العامة.
- `audit_logs`: سجل تغييرات على `orders` و`students`.
- `season_settings`: مواسم تشغيل/تقارير، مع Trigger يضمن موسما نشطا واحدا.

### جداول سلة

- `salla_products`: منتجات سلة، مع حقول افتراضية شبيهة بالأطقم الجاهزة.
- `salla_product_options`: خيارات ديناميكية لكل منتج، ترتبط بـ `salla_products`.
- `salla_orders`: طلبات سلة، مع رقم داخلي تلقائي.
- `salla_order_items`: عناصر طلب سلة، ترتبط بـ `salla_orders` و`salla_products`.

### العلاقات الأهم

- `orders` 1..N `students`
- `orders` 1..N `order_scarf_designs`
- `orders` 1..N `extra_scarves`
- `orders` 1..N `extra_hats`
- `orders` 1..1 `invoices`
- `ready_kits` N..1 جداول البيانات المرجعية
- `salla_products` 1..N `salla_product_options`
- `salla_orders` 1..N `salla_order_items`
- `pricing_rules` و`addon_prices` لا ترتبط بعلاقات مباشرة مع الطلبات، لكنها تؤثر على حساب عروض الأسعار والفواتير.

## 7. APIs والخدمات المستخدمة

### Supabase Auth

يستخدم لتسجيل الدخول والخروج وجلسات المستخدمين:

- `signInWithPassword`
- `signUp`
- `signOut`
- `onAuthStateChange`
- `getSession`

### Supabase Database

تتم القراءة والكتابة مباشرة عبر `supabase.from(table)` من الواجهة في معظم الصفحات. العمليات تشمل:

- `select`
- `insert`
- `update`
- `delete`
- `maybeSingle`
- `single`
- `in`
- `eq`
- `order`

### Supabase Storage

bucket عام باسم `images` لتخزين:

- صور التصاميم.
- صور الأطقم.
- صور منتجات سلة.
- صور ألوان الطلبات.
- ملفات/صور تطريز الشعار والخلف.

### Supabase Edge Functions

- `list-employees`: يرجع قائمة الموظفين وأدوارهم باستخدام service role.
- `create-employee`: ينشئ مستخدما في Supabase Auth ويضيف دوره.
- `delete-employee`: يحذف الدور ثم المستخدم، ويمنع حذف المستخدم لنفسه.

كل هذه الدوال تتحقق من أن المستدعي `owner` أو `manager`.

### مكتبات التصدير

- `exceljs`: إنشاء ملفات Excel.
- `jspdf`: إنشاء PDF.
- `html2canvas`: تحويل DOM إلى صورة داخل PDF.
- `@react-pdf/renderer`: موجود كاعتماد، لكن الاستخدام الفعلي الظاهر يعتمد أكثر على `jspdf/html2canvas`.

### خدمات/أدوات أخرى

- `@tanstack/react-query`: مزود موجود في التطبيق، لكن الاستخدام العملي للبيانات في الصفحات يتم غالبا بـ `useEffect` وليس React Query hooks.
- `react-router-dom`: التوجيه.
- `Radix UI` و`shadcn-ui`: مكونات واجهة.
- `lucide-react`: الأيقونات.
- `Lovable`: المشروع يحمل إعدادات وقالب Lovable.
- `Google Fonts`: `index.css` يستورد Tajawal وPlayfair Display من Google Fonts، مع وجود خطوط Tajawal محلية أيضا.

### مركز البيانات

`/data-center` ليس مجرد CRUD للجداول المرجعية البسيطة. الصفحة تحتوي شبكة أقسام داخلية، وبعض الأقسام تستخدم مكونات متخصصة:

- الأقسام المرجعية العامة تستخدم CRUD موحدا داخل `DataCenter.tsx`.
- `pricing_rules` يستخدم `PricingRulesTab`.
- `addon_prices` يستخدم `AddonPricesTab`.
- `salla_products` يستخدم `SallaProductsContent`.
- `season_settings` يستخدم `SeasonSettingsContent`.

لذلك عند تعديل أي قسم من مركز البيانات يجب تحديد هل هو من الأقسام العامة أم من الأقسام ذات المكوّن المتخصص.

## 8. نظام المصادقة والصلاحيات

### المصادقة

المصادقة مبنية على Supabase Auth. `AuthProvider` يحفظ `user` و`session` في React Context، ويتابع تغير الجلسة.

### الأدوار

الأدوار مخزنة في جدول `user_roles`:

- `owner`: أعلى صلاحية، يمكنه إدارة الأدوار والبيانات.
- `manager`: مدير، يمكنه الوصول إلى الصفحات الإدارية وإدارة معظم البيانات.
- `customer_service`: موظف خدمة عملاء، يستطيع إدارة الطلبات الأساسية وطلبات سلة حسب السياسات.

### حماية الواجهة

- `DashboardLayout` يمنع الوصول للصفحات الداخلية دون تسجيل دخول.
- `AdminRoute` يسمح فقط لـ `owner` و`manager` بدخول صفحات مثل مركز البيانات، الأطقم، والموظفين.
- `AppSidebar` يخفي عناصر الإدارة عن غير المدير/المالك.

### حماية قاعدة البيانات

تستخدم Row Level Security. أهم الملامح:

- الجداول المرجعية يمكن قراءتها للمستخدمين المصرح لهم، وبعضها أضيفت له سياسات قراءة للـ `anon` لدعم الصفحات العامة.
- إدارة الجداول المرجعية محصورة غالبا في `owner` و`manager`.
- إنشاء الطلبات الداخلية يتطلب مستخدما موثقا، ويكون `employee_id = auth.uid()`.
- تحديث الطلبات مسموح للمالك/المدير أو الموظف صاحب الطلب.
- صفحات القائدة/الطالبات تعتمد على سياسات `anon` للسماح بقراءة/إدخال بيانات محددة للطلبات المفتوحة.
- `invoices` يمكن قراءتها للموثقين، وهناك سياسة قراءة `anon` كذلك.

## 9. الصفحات والشاشات

- `/`: يحول إلى `/dashboard`.
- `/login`: تسجيل الدخول.
- `/dashboard`: لوحة تحكم وإحصاءات ومؤشرات نشاط.
- `/data-center`: مركز إدارة البيانات المرجعية، محمي إداريا.
- `/kits`: إدارة الأطقم الجاهزة، محمي إداريا.
- `/orders`: إدارة كل الطلبات الداخلية.
- `/my-orders`: عرض طلبات المستخدم الحالي فقط.
- `/employees`: إدارة الموظفين، محمي إداريا.
- `/order/:orderId/leader`: صفحة القائدة لإدخال بيانات الطالبات والشحن والإضافات.
- `/order/:orderId/register`: صفحة تسجيل طالبة واحدة.
- `/order/:orderId/status`: صفحة متابعة حالة الطلب.
- `/calculator`: حاسبة أسعار عامة.
- `/admin-calculator`: حاسبة أسعار داخل لوحة الإدارة.
- `/public-calculator`: نسخة عامة من الحاسبة.
- `/invoices`: إنشاء وإدارة الفواتير.
- `/salla-orders`: إدارة طلبات سلة.
- `/print/customer-report/:orderId`: تقرير عميل للطباعة.
- `/r/:code`: إعادة توجيه رابط قصير.
- `*`: صفحة 404.

ملاحظة: لا يظهر Route مباشر لـ `src/pages/SallaProducts.tsx` أو `src/pages/SeasonSettings.tsx` في `App.tsx` حسب النسخة الحالية. إدارة منتجات سلة والمواسم تتم فعليا من داخل `/data-center` عبر `SallaProductsContent` و`SeasonSettingsContent`.

## 10. مشاكل تقنية محتملة

1. ملف `.env` موجود داخل المستودع العام، و`.gitignore` لا يستثني `.env` صراحة في النسخة الحالية. حتى لو كانت المفاتيح publishable، وجود ملفات بيئة في GitHub العام يحتاج مراجعة أمنية فورية.
2. بعض سياسات RLS تسمح للـ `anon` بقراءة أو إدخال أو تحديث بيانات حساسة نسبيا مثل الطلاب والطلبات المفتوحة. هذا مناسب للروابط العامة لكنه يحتاج تضييق شديد عبر رموز وصول أو short tokens.
3. روابط الطلب تعتمد على `orderId` مباشرة في URL. إذا عرف شخص UUID الطلب قد يتمكن من الوصول إلى صفحات عامة حسب السياسات.
4. `short_links` تستخدم كودا عشوائيا قصيرا بـ `Math.random().toString(36).substring(2, 8)` بدون تحقق قوي من التصادم سوى البحث عن URL موجود. الأفضل استخدام مولد آمن وتحقق من uniqueness للكود.
5. حذف الطلبات في الواجهة يحذف يدويا `students` و`order_scarf_designs` قبل حذف `orders`، بينما بعض الجداول الأخرى مثل `extra_scarves`, `extra_hats`, `invoices` تعتمد على cascade أو قد تحتاج مراجعة لضمان عدم بقاء بيانات يتيمة.
6. استخدام واسع لـ `as any` يقلل فائدة TypeScript وقد يخفي أخطاء عند تغير schema.
7. `App.css` يحتوي CSS افتراضي من Vite وقد يسبب قيودا غير مرغوبة مثل `#root { max-width: 1280px; padding: 2rem; text-align:center; }` إذا كان مستوردا في مكان ما مستقبلا. حاليا `App.tsx` لا يستورده مباشرة.
8. الاعتماد على `useEffect` وطلبات Supabase اليدوية في أغلب الصفحات مع أن `React Query` موجود. هذا قد يصعب التخزين المؤقت وإعادة المحاولة وتوحيد حالات التحميل.
9. لا توجد اختبارات فعلية للمنطق الحرج؛ الاختبار الحالي تجريبي فقط.
10. الفواتير والتقارير تعتمد على DOM و`html2canvas`، وهذا قد يسبب فروقات بين المتصفحات أو مشاكل مع الخطوط والصور الخارجية.
11. بعض النصوص العربية ظهرت في مخرجات القراءة المحلية بشكل غير صحيح الترميز؛ قد يكون ذلك من PowerShell فقط، لكنه يستحق التحقق داخل الملفات والمتصفح.
12. لا يظهر تكامل API مباشر مع منصة سلة؛ الموجود هو إدارة داخلية لطلبات ومنتجات تحمل اسم سلة. إذا كان المطلوب مزامنة حقيقية مع سلة، فهذا غير موجود في الكود المقروء.
13. بعض الصفحات العامة تقرأ جداول مرجعية وصور عامة. هذا مقبول وظيفيا لكنه يحتاج مراجعة خصوصية.
14. لا توجد طبقة Services مركزية لعمليات Supabase، ما يجعل الاستعلامات موزعة عبر الصفحات والمكونات.
15. لا يوجد Error Boundary عام، ومعالجة الأخطاء تختلف من صفحة لأخرى.
16. `DataCenter` يجمع أقساما عامة وأقساما ذات مكونات متخصصة. أي تعديل على مركز البيانات يحتاج الانتباه إلى أن بعض المفاتيح لا تستخدم مسار CRUD العام.

## 11. تحسينات مقترحة

1. إزالة `.env` من المستودع العام، تدوير المفاتيح إذا لزم، وإضافة `.env` إلى `.gitignore` مع `.env.example`.
2. إضافة token خاص لكل رابط عام بدلا من الاعتماد على `orderId` فقط.
3. تضييق سياسات RLS للصفحات العامة بحيث تسمح بالوصول بناء على token أو حالة الطلب.
4. نقل استعلامات Supabase المتكررة إلى طبقة خدمات مثل `src/services/orders.ts`, `src/services/masterData.ts`.
5. استخدام React Query فعليا للاستعلامات المتكررة والكاش وإعادة التحميل.
6. تقليل `as any` بتحديث `types.ts` بعد كل migration والالتزام بالأنواع.
7. إضافة اختبارات للمنطق الحرج: إنشاء الطلب، حساب الأسعار، توليد روابط، حفظ بيانات القائدة، التصدير.
8. إضافة قيود فريدة وفهارس إضافية عند الحاجة، مثل `short_links.code`.
9. تحسين توليد أرقام الطلبات: يوجد Trigger لتوليد `order_number` في قاعدة البيانات، وفي الواجهة توجد دوال توليد أيضا؛ الأفضل توحيد المصدر في قاعدة البيانات.
10. فصل صفحات عامة عن صفحات الإدارة بصلاحيات ومسارات أوضح.
11. إضافة Error Boundary وواجهة موحدة للأخطاء.
12. تحسين توثيق التشغيل المحلي وSupabase migrations في README.
13. مراجعة النصوص العربية والترميز، والتأكد من أن الملفات محفوظة UTF-8.
14. توحيد إدارة الصور: حذف الصور غير المستخدمة عند حذف السجلات أو تعديلها.
15. إضافة CI لتشغيل `npm run lint`, `npm run test`, و`npm run build`.
16. توثيق مفاتيح `addon_prices` المتوقعة وقواعد `pricing_rules` في README أو في قسم تشغيلي منفصل، لأن تغييرها يؤثر مباشرة على الحاسبة والفواتير.

## 12. دليل تشغيل المشروع محليا

### المتطلبات

- Node.js إصدار حديث.
- npm أو bun. يوجد `package-lock.json` و`bun.lock/bun.lockb`، لكن السكربتات موثقة عبر npm.
- مشروع Supabase جاهز أو صلاحية الوصول للمشروع الحالي.

### الخطوات

```bash
npm install
```

أنشئ ملف `.env` محليا بالقيم التالية:

```bash
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

شغل خادم التطوير:

```bash
npm run dev
```

المنفذ الافتراضي من `vite.config.ts` هو:

```text
http://localhost:8080
```

للبناء:

```bash
npm run build
```

للمعاينة بعد البناء:

```bash
npm run preview
```

للاختبارات:

```bash
npm run test
```

لـ lint:

```bash
npm run lint
```

### Supabase محليا

المستودع يحتوي migrations وEdge Functions، لكن لا يوجد توثيق تشغيل Supabase CLI داخل README. عند استخدام Supabase CLI عادة ستحتاج:

```bash
supabase start
supabase db reset
supabase functions serve
```

ويجب ضبط أسرار الدوال:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 13. ملخص تنفيذي لمطور جديد

Areba هو تطبيق React عربي لإدارة الطلبات الجماعية. نقطة البداية هي `src/App.tsx` حيث تجد المسارات، و`src/integrations/supabase/client.ts` حيث يتم إنشاء عميل Supabase. المصادقة في `src/hooks/useAuth.tsx` والصلاحيات تعتمد على جدول `user_roles` بأدوار `owner`, `manager`, `customer_service`.

أهم منطق في المشروع موجود في:

- `src/pages/Orders.tsx`
- `src/components/orders/CreateOrderDialog.tsx`
- `src/pages/LeaderPage.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Invoices.tsx`
- `src/pages/SallaOrders.tsx`
- `src/components/SallaProductsContent.tsx`
- `src/components/PublicCalculator.tsx`
- `src/components/PricingRulesTab.tsx`
- `src/components/AddonPricesTab.tsx`

قاعدة البيانات تتمحور حول جدول `orders`. كل طلب يملك طالبات في `students`، وتصاميم أوشحة في `order_scarf_designs`، وإضافات في `extra_scarves` و`extra_hats`، وقد يملك فاتورة في `invoices`. البيانات المرجعية مثل التصاميم والمدن والخطوط تحفظ في جداول منفصلة وتدار من مركز البيانات.

تدفق العمل الأساسي:

1. موظف ينشئ طلبا.
2. النظام يولد روابط عامة.
3. القائدة تدخل بيانات الطالبات والشحن.
4. الطلب ينتقل للمراجعة ثم التنفيذ ثم الشحن ثم الاكتمال.
5. يمكن إصدار فاتورة وتصدير تقارير Excel/PDF.

أول ما يجب مراجعته قبل التطوير الجاد هو الأمن: وجود `.env` في المستودع، سياسات `anon`، وطريقة حماية الروابط العامة. بعد ذلك يفضل تنظيم استعلامات Supabase في طبقة خدمات وإضافة اختبارات للعمليات الحساسة.

## 14. طريقة استخدام هذا المستند مستقبلا

هذا الملف هو مرجع المشروع الرسمي داخل المستودع. استخدامه العملي:

1. قبل أي تعديل، راجع الأقسام المرتبطة بالتغيير لفهم التدفق والجداول والصفحات المتأثرة.
2. بعد ذلك افحص الملفات الفعلية المعنية فقط للتأكد من التفاصيل الحالية، لأن الكود قد يتغير أسرع من التوثيق.
3. إذا كشف التعديل عن سلوك أو جدول أو مسار غير موثق هنا، يجب تحديث `PROJECT_ANALYSIS.md` في نفس التغيير.
4. إذا أصبح هذا الملف طويلا أكثر من اللازم، فالأفضل إنشاء `ARCHITECTURE.md` مختصر يلخص البنية والقرارات، مع إبقاء هذا الملف كتحليل شامل.
