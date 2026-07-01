import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import MemberOrdersPage from './pages/MemberOrdersPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import { supabase } from './supabaseClient';

function ConfigErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#EFE3CF] font-sans" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
        {/* Banner decoration */}
        <div className="bg-orange-500 p-6 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white bg-opacity-20 mb-3 animate-bounce">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-wide">تنبيه: لم يتم ربط قاعدة البيانات</h2>
          <p className="text-sm text-orange-50 opacity-90 mt-1">مشروع "50 فاكهة" يتطلب إعداد مفاتيح Supabase للعمل بشكل صحيح</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed text-right">
            أنت ترى هذه الرسالة لأن التطبيق لم يجد المتغيرات البيئية اللازمة للاتصال بقاعدة بيانات <strong>Supabase</strong>. يرجى اتباع الخطوات التالية لتفعيل الموقع على <strong>Render</strong>:
          </p>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-right text-xs">
            <div className="flex items-start gap-2">
              <span className="flex items-center justify-center bg-orange-100 text-orange-700 font-bold rounded-full w-5 h-5 shrink-0 mt-0.5">١</span>
              <p className="text-slate-700">افتح لوحة تحكم <strong>Render</strong> واذهب إلى الخدمة الخاصة بهذا المشروع.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex items-center justify-center bg-orange-100 text-orange-700 font-bold rounded-full w-5 h-5 shrink-0 mt-0.5">٢</span>
              <p className="text-slate-700">اضغط على قسم <strong>Environment</strong> في القائمة الجانبية.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex items-center justify-center bg-orange-100 text-orange-700 font-bold rounded-full w-5 h-5 shrink-0 mt-0.5">٣</span>
              <p className="text-slate-700">أضف المتغيرين البيئيين التاليين وقيمهم:</p>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="bg-slate-950 text-slate-300 p-3 rounded-lg relative group">
              <span className="text-[10px] text-slate-500 absolute left-3 top-1 select-none">KEY</span>
              <p className="pt-2 text-orange-400 select-all font-semibold">REACT_APP_SUPABASE_URL</p>
              <span className="text-[10px] text-slate-500 block border-t border-slate-800 pt-1 mt-1 select-none font-sans">VALUE</span>
              <p className="text-emerald-400 select-all overflow-x-auto whitespace-nowrap">https://bxfxwzthalglvcsbkwfo.supabase.co</p>
            </div>

            <div className="bg-slate-950 text-slate-300 p-3 rounded-lg relative group">
              <span className="text-[10px] text-slate-500 absolute left-3 top-1 select-none">KEY</span>
              <p className="pt-2 text-orange-400 select-all font-semibold">REACT_APP_SUPABASE_ANON_KEY</p>
              <span className="text-[10px] text-slate-500 block border-t border-slate-800 pt-1 mt-1 select-none font-sans">VALUE</span>
              <p className="text-emerald-400 select-all overflow-x-auto whitespace-nowrap">sb_publishable_OxBFs_W-w3CxgTSyfzeqmg_7TlVz1hu</p>
            </div>
          </div>

          <div className="text-right text-xs bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100">
            <strong>ملاحظة هامة:</strong> بعد حفظ المتغيرات في Render، سيقوم الموقع بإعادة بناء ونشر نفسه تلقائياً (Rebuild & Deploy) ومباشرة سيعمل الرابط دون أي مشاكل.
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl font-medium transition-all shadow-md shadow-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 text-sm text-center block"
          >
            تحديث الصفحة بعد الحفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }
  return user?.isAdmin ? children : <Navigate to="/login" />;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

function App() {
  if (!supabase) {
    return <ConfigErrorPage />;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col" style={{ background: '#EFE3CF' }}>
            {/* Navbar — visible on all screens */}
            <Navbar />
            <div className="flex-grow flex flex-col">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/profile" element={<ProtectedRoute><MemberDashboard /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><MemberOrdersPage /></ProtectedRoute>} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
              </Routes>
            </div>
            {/* Footer — desktop only */}
            <div className="hidden md:block">
              <Footer />
            </div>
            {/* Bottom Nav — mobile only */}
            <BottomNav />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
export default App;

