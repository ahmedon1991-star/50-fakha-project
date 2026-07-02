import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

export default function MemberDashboard() {
  const { user, logout, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Settings State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [birthdate, setBirthdate] = useState(user?.birthdate || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Phone OTP Update Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setBirthdate(user.birthdate || '');
      setGender(user.gender || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. Update Name in profiles
      if (name !== user.name) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ name })
          .eq('id', user.id);
        
        if (profileErr) throw profileErr;
      }

      // Update metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { name, birthdate, gender }
      });
      if (authErr) throw authErr;

      // 2. Update Password if entered
      if (password) {
        if (password.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        }
        const { error: pwdErr } = await supabase.auth.updateUser({
          password: password
        });
        if (pwdErr) throw pwdErr;
        setPassword('');
      }

      // 3. Update Email if changed (Block for dedicated admin account only)
      if (email !== user.email) {
        if (user?.email?.toLowerCase() === 'admin@50fakha.com') {
          throw new Error('لا يمكن تغيير البريد الإلكتروني لحساب الإدارة الرئيسي (admin@50fakha.com) من داخل التطبيق.');
        }
        const { error: emailErr } = await supabase.auth.updateUser({
          email: email
        });
        if (emailErr) throw emailErr;
        setSuccessMsg('تم تحديث البيانات بنجاح. يرجى مراجعة بريدك الإلكتروني الجديد لتأكيد تغيير البريد.');
      } else {
        setSuccessMsg('تم تحديث بيانات ملفك الشخصي بنجاح! 🎉');
      }
      setIsEditingProfile(false);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneUpdateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanPhone = phone.trim();
      if (!cleanPhone.startsWith('+')) {
        throw new Error('يجب كتابة رقم الهاتف بصيغة دولية تبدأ بعلامة + (مثال: +966558735605)');
      }

      const { error: authErr } = await supabase.auth.updateUser({
        phone: cleanPhone
      });
      
      if (authErr) throw authErr;

      setTempPhone(cleanPhone);
      setOtpError('');
      setOtpToken('');
      setShowOtpModal(true);
    } catch (err) {
      setError(err.message || 'Fails to send OTP verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);

    try {
      await verifyOtp(tempPhone, otpToken, name);
      
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ phone: tempPhone })
        .eq('id', user.id);
      if (dbErr) console.error('Database phone sync error:', dbErr.message);

      setShowOtpModal(false);
      setOtpToken('');
      setSuccessMsg('تم تأكيد رقم الهاتف الجديد بنجاح! 📱✨');
    } catch (err) {
      setOtpError(err.message || 'رمز التأكيد غير صحيح، حاول مرة أخرى');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (user?.email?.toLowerCase() === 'admin@50fakha.com') {
      setDeleteError('لا يمكن حذف حساب الإدارة الرئيسي (admin@50fakha.com) من داخل التطبيق.');
      return;
    }
    if (deleteConfirmText !== 'حذف') {
      setDeleteError('يرجى كتابة كلمة حذف بشكل صحيح');
      return;
    }
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const { error: deleteErr } = await supabase.rpc('delete_user');
      if (deleteErr) throw deleteErr;

      setShowDeleteModal(false);
      logout();
      navigate('/register');
    } catch (err) {
      setDeleteError(err.message || 'حدث خطأ أثناء حذف الحساب، اتصل بالدعم.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  // Get initials for avatar
  const getInitials = (nameStr = '') => {
    const parts = nameStr.trim().split(' ');
    return parts.slice(0, 2).map(p => p[0]).join('');
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pb-36 lg:pb-16 text-right">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-8 shadow-md">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right">
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>ملفي الشخصي</h1>
            <p className="text-emerald-100 text-sm mt-1">تصفح بيانات حسابك الشخصي وقم بتحديثها بسهولة</p>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="bg-white text-emerald-800 hover:bg-emerald-50 hover:scale-[1.02] text-xs font-bold px-4 py-2.5 rounded-xl shadow transition duration-200"
            >
              العودة للمتجر 🏪
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 md:p-6 mt-4">
        {error && (
          <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-4 rounded-xl shadow-sm mb-6 font-semibold text-sm">
            ⚠️ {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 p-4 rounded-xl shadow-sm mb-6 font-semibold text-sm">
            ✅ {successMsg}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Clean Summary Mode */}
          {!isEditingProfile ? (
            <div className="space-y-6">
              {/* Top Avatar Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                {/* Avatar Initials Circle */}
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-md"
                  style={{ background: 'radial-gradient(circle, #F3760C 0%, #C95A06 100%)' }}
                >
                  {getInitials(user?.name)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: "'Cairo', sans-serif" }}>
                    {user?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{user?.email}</p>
                </div>
              </div>

              {/* Profile Details List */}
              <div className="space-y-3">
                {/* 1. الاسم */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-right">
                  <div></div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">الاسم</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block">{user?.name || '-'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                      👤
                    </div>
                  </div>
                </div>

                {/* 2. رقم الهاتف */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-right">
                  <div>
                    {user?.phone && (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">رقم الهاتف</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block font-mono" dir="ltr">{user?.phone || 'غير محدد'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                      📱
                    </div>
                  </div>
                </div>

                {/* 3. تاريخ الميلاد */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-right">
                  <div></div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">تاريخ الميلاد</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block font-mono">{user?.birthdate || 'غير محدد'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                      📅
                    </div>
                  </div>
                </div>

                {/* 4. البريد الإلكتروني */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-right">
                  <div>
                    {user?.email && (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">البريد الإلكتروني</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block font-mono">{user?.email || '-'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                      ✉️
                    </div>
                  </div>
                </div>

                {/* 5. الجنس */}
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-right">
                  <div></div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">الجنس</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block">{user?.gender || 'غير محدد'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                      🚻
                    </div>
                  </div>
                </div>

                {/* 6. تسجيل الخروج كخيار في القائمة */}
                <div 
                  onClick={handleLogoutClick}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-right cursor-pointer hover:bg-rose-50/50 transition duration-150"
                >
                  <div>
                    <span className="text-xs text-rose-500 font-bold font-mono">←</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-bold block">خيارات الحساب</span>
                      <span className="text-sm font-black text-rose-600 mt-1 block">تسجيل الخروج</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 text-lg flex-shrink-0 animate-pulse">
                      🚪
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button: Edit My Profile */}
              <button
                onClick={() => setIsEditingProfile(true)}
                className="w-full py-4 rounded-2xl text-white font-bold text-base cursor-pointer transition shadow-md duration-150 flex items-center justify-center gap-2"
                style={{ background: '#b8295b' }}
              >
                <span>✏️</span> تعديل ملفي الشخصي
              </button>
            </div>
          ) : (
            /* Profile Edit Form Mode */
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md text-right space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl transition"
                >
                  إلغاء ✕
                </button>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>✏️</span>
                  <span>تعديل ملفي الشخصي</span>
                </h3>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b8295b] focus:outline-none transition text-right font-medium"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    disabled={user?.email?.toLowerCase() === 'admin@50fakha.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b8295b] focus:outline-none transition text-left font-medium ${
                      user?.email?.toLowerCase() === 'admin@50fakha.com' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                    }`}
                    dir="ltr"
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">تاريخ الميلاد</label>
                  <input
                    type="text"
                    placeholder="مثال: 18/01/1991"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b8295b] focus:outline-none transition text-right font-medium"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">الجنس</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b8295b] focus:outline-none transition text-right font-medium bg-white"
                  >
                    <option value="">اختر الجنس</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-slate-700 text-sm font-semibold mb-2">كلمة المرور الجديدة (اختياري)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="اتركها فارغة إذا لم ترغب في التغيير"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b8295b] focus:outline-none transition text-right font-medium"
                    dir="ltr"
                  />
                </div>

                {/* Save Changes Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white font-bold rounded-2xl transition duration-200 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: '#b8295b' }}
                >
                  💾 حفظ التغييرات
                </button>
              </form>

              {/* Phone settings form inline inside edit mode */}
              <div className="border-t border-slate-100 pt-5 mt-5 space-y-4">
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <span>📱</span> تحديث رقم الهاتف المؤكد
                </h4>
                <form onSubmit={handlePhoneUpdateSubmit} className="space-y-3">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 558735605"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#b8295b] focus:outline-none transition text-left font-medium"
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition duration-200 shadow-sm text-xs"
                  >
                    طلب رمز تأكيد الهاتف الجديد ✉️
                  </button>
                </form>
              </div>

              {/* Danger Zone: Delete Account (Hide for dedicated admin account) */}
              {user?.email?.toLowerCase() !== 'admin@50fakha.com' && (
                <div className="border-t border-rose-100 pt-5 mt-5 space-y-3">
                  <h4 className="font-black text-rose-800 text-sm flex items-center gap-1.5">
                    <span>⚠️</span> منطقة الخطر
                  </h4>
                  <p className="text-[11px] text-slate-400">سيتم مسح حسابك وكافة بيانات الطلبات نهائياً.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setDeleteError('');
                      setShowDeleteModal(true);
                    }}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition text-xs"
                  >
                    حذف الحساب نهائياً 🚨
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* PHONE OTP VERIFICATION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden text-right transition-all">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">💬 تأكيد رقم الهاتف الجديد</h3>
              <button 
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOtpVerify} className="p-6 space-y-5 text-right">
              {otpError && (
                <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-3 rounded-lg text-xs font-semibold">
                  ⚠️ {otpError}
                </div>
              )}
              
              <div className="text-center space-y-2">
                <p className="text-slate-600 text-sm">أدخل رمز التأكيد (OTP) المكون من 6 أرقام المرسل إلى الرقم الجديد:</p>
                <p className="font-bold text-slate-800 font-mono text-base">{tempPhone}</p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="123456"
                  className="w-full text-center px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition text-2xl font-bold tracking-[0.5em] text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={otpLoading}
                  className="px-6 py-2 bg-[#b8295b] hover:bg-[#c93024] text-white rounded-xl font-bold transition shadow"
                >
                  {otpLoading ? 'جاري التحقق...' : 'تأكيد وحفظ الهاتف 📱'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden text-right transition-all">
            <div className="bg-rose-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold">🚨 تأكيد حذف الحساب نهائياً</h3>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeleteAccount} className="p-6 space-y-5 text-right">
              {deleteError && (
                <div className="bg-rose-50 border-r-4 border-rose-500 text-rose-800 p-3 rounded-lg text-xs font-semibold">
                  ⚠️ {deleteError}
                </div>
              )}
              
              <div className="space-y-2 text-slate-650 text-xs sm:text-sm">
                <p>لتأكيد حذف الحساب، يرجى كتابة الكلمة <span className="font-black text-rose-600">حذف</span> في الحقل أدناه:</p>
                <p className="font-semibold text-rose-800">تنبيه: هذا الإجراء سيقوم بإزالة حسابك كلياً ولا يمكن التراجع عنه!</p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='اكتب "حذف" للتأكيد'
                  className="w-full text-center px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition text-base font-bold text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || deleteConfirmText !== 'حذف'}
                  className={`px-6 py-2 rounded-xl font-bold transition shadow text-white ${
                    deleteConfirmText === 'حذف'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-rose-300 cursor-not-allowed'
                  }`}
                >
                  {deleteLoading ? 'جاري الحذف...' : 'حذف الحساب نهائياً 🚨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
