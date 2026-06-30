import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="flex-1 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        
        {/* Header */}
        <div className="border-b pb-6 text-center sm:text-right">
          <span className="text-5xl">🛡️</span>
          <h1 className="text-3xl font-black text-slate-900 mt-4">سياسة الخصوصية</h1>
          <p className="text-slate-400 text-sm mt-1.5">تاريخ آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* Content Section */}
        <div className="space-y-6 text-slate-650 leading-relaxed text-sm sm:text-base">
          <p>
            نحن في <strong>متجر 50 فاكهة</strong>، نلتزم بحماية خصوصية بيانات مستخدمينا وزوارنا. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية البيانات الشخصية التي تشاركها معنا عند استخدامك لتطبيقنا أو موقعنا.
          </p>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">1. البيانات التي نجمعها</h2>
          <p>عند قيامك بالتسجيل أو تقديم طلب في التطبيق، فإننا نجمع المعلومات التالية:</p>
          <ul className="list-disc list-inside mr-4 space-y-2 text-slate-600">
            <li><strong>الاسم الكامل:</strong> لتعريف حسابك وإضافة اسمك على الفواتير والشحنات.</li>
            <li><strong>البريد الإلكتروني:</strong> للتواصل وتفعيل الحساب واستلام الإشعارات.</li>
            <li><strong>رقم الهاتف:</strong> للتنسيق الهاتفي وتأكيد التوصيل وإرسال الفواتير التلقائية عبر الواتساب.</li>
            <li><strong>العنوان:</strong> لتسهيل وتوجيه مندوب التوصيل لموقعك بدقة.</li>
            <li><strong>إشعار التحويل البنكي:</strong> في حال اختيارك الدفع عبر التحويل البنكي، نطلب إرفاق صورة الإشعار للتحقق المالي من المعاملة.</li>
          </ul>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">2. استخدام المعلومات</h2>
          <p>نستخدم البيانات التي نجمعها للأغراض التالية:</p>
          <ul className="list-disc list-inside mr-4 space-y-2 text-slate-600">
            <li>معالجة طلباتك وتوصيل العصائر والمنتجات الطازجة لك.</li>
            <li>تحديثك بحالة الطلب وإرسال الفاتورة التفصيلية عبر الواتساب.</li>
            <li>تحسين جودة الخدمة وتوفير تجربة مستخدم مخصصة ومريحة.</li>
            <li>التحقق من الدفع المالي وضمان أمان المعاملات.</li>
          </ul>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">3. حماية ومشاركة البيانات</h2>
          <p>
            نحن لا نبيع أو نشارك أو نؤجر معلوماتك الشخصية لأي جهات خارجية لأغراض تسويقية. يتم تخزين بياناتك بشكل آمن على منصات قواعد البيانات المشفرة (Supabase)، ولا يتم الكشف عنها إلا لجهات التوصيل الداخلية لغرض إيصال طلبك فحسب.
          </p>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">4. حقوق المستخدم وحذف البيانات</h2>
          <p>
            يحق لك في أي وقت مراجعة بياناتك الشخصية أو تعديلها من خلال صفحة "حسابي الشخصي". كما يمكنك طلب حذف حسابك وبياناتك بالكامل نهائياً من أنظمتنا عبر مراسلتنا مباشرة على رقم الواتساب المدرج في إعدادات التطبيق أو عبر التواصل مع الإدارة.
          </p>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">5. التغييرات على سياسة الخصوصية</h2>
          <p>
            قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر لمواكبة التغييرات التقنية أو التشريعية. سيتم تحديث تاريخ آخر تعديل في أعلى هذه الصفحة عند نشر أي تغييرات.
          </p>

          <div className="border-t pt-6 text-center text-slate-400 text-xs sm:text-sm">
            إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر الرقم المعتمد للمتجر.
          </div>
        </div>

      </div>
    </div>
  );
}
