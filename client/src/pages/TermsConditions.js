import React from 'react';

export default function TermsConditions() {
  return (
    <div className="flex-1 bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        
        {/* Header */}
        <div className="border-b pb-6 text-center sm:text-right">
          <span className="text-5xl">📄</span>
          <h1 className="text-3xl font-black text-slate-900 mt-4">الشروط والأحكام</h1>
          <p className="text-slate-400 text-sm mt-1.5">تاريخ آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* Content Section */}
        <div className="space-y-6 text-slate-650 leading-relaxed text-sm sm:text-base">
          <p>
            مرحباً بكم في <strong>متجر 50 فاكهة</strong>. باستخدامك لهذا التطبيق أو تقديمك للطلبات من خلاله، فإنك توافق التزاماً كاملاً بالشروط والأحكام التالية. يرجى قراءتها بعناية.
          </p>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">1. شروط الحساب والتسجيل</h2>
          <p>عند التسجيل في التطبيق، يتوجب عليك:</p>
          <ul className="list-disc list-inside mr-4 space-y-2 text-slate-605">
            <li>تقديم معلومات صحيحة ودقيقة (الاسم، البريد، رقم الهاتف، والعنوان).</li>
            <li>الحفاظ على سرية معلومات حسابك وكلمة المرور الخاصة بك.</li>
            <li>تتحمل المسؤولية الكاملة عن كافة الأنشطة والطلبات التي تتم تحت حسابك الشخصي.</li>
          </ul>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">2. الطلبات والأسعار</h2>
          <p>أحكام معالجة وتسليم الطلبات:</p>
          <ul className="list-disc list-inside mr-4 space-y-2 text-slate-605">
            <li>تخضع جميع الطلبات لتوفر المنتجات في المتجر وحالة استقبال الطلبات المعلنة بالأدمن.</li>
            <li>نحتفظ بالحق في تعديل أسعار المنتجات أو رسوم التوصيل في أي وقت ودون إشعار مسبق.</li>
            <li>يتم احتساب سعر التوصيل ديناميكياً بناءً على القيمة المحددة في إعدادات التطبيق وتضاف للإجمالي قبل الشراء.</li>
          </ul>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">3. الدفع والتحويل البنكي</h2>
          <p>نوفر خيارات الدفع عند الاستلام أو التحويل البنكي وفق الضوابط التالية:</p>
          <ul className="list-disc list-inside mr-4 space-y-2 text-slate-605">
            <li>في حال اختيار الدفع بالتحويل البنكي، يتوجب عليك تحويل المبلغ كاملاً وإرفاق صورة إشعار التحويل البنكي كشرط إلزامي لقبول الطلب وتوصيله.</li>
            <li>يجب أن تتطابق قيمة التحويل مع القيمة الإجمالية للطلب شاملة سعر التوصيل.</li>
          </ul>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">4. التوصيل والإلغاء</h2>
          <p>
            نقوم بالتوصيل لجميع أحياء ومناطق مدينة **دنقلا** بالولاية الشمالية. يحق للمتجر إلغاء الطلب في حال تعذر الاتصال بالعميل أو عدم صحة العنوان المكتوب. كما يمكن للعميل إلغاء طلبه ما لم يتم تغيير حالته في المطبخ إلى "قيد التحضير" أو "خارج للتوصيل".
          </p>

          <h2 className="text-xl font-extrabold text-slate-800 pt-4">5. إخلاء المسؤولية والقانون الساري</h2>
          <p>
            تخضع هذه الشروط والأحكام وتفسر وفقاً للقوانين والتشريعات المحلية المعمول بها في جمهورية السودان. نسعى دائماً لتقديم أفضل جودة وصلاحية تامة لعصائرنا ومنتجاتنا لضمان رضاك وصحتك.
          </p>

          <div className="border-t pt-6 text-center text-slate-400 text-xs sm:text-sm">
            باستخدامك للتطبيق، فإنك تقر بأنك قرأت وفهمت هذه الشروط والأحكام ووافقت عليها.
          </div>
        </div>

      </div>
    </div>
  );
}
