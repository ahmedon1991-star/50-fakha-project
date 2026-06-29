import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-center text-sm mt-auto">
      <div className="max-w-6xl mx-auto px-4 space-y-4">
        {/* Brand/Icons */}
        <div className="flex justify-center items-center gap-2 text-white font-black text-lg">
          <span>🍉</span>
          <span className="bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">50 فاكهة</span>
        </div>

        {/* Address & Details */}
        <div className="space-y-1.5 text-xs sm:text-sm">
          <p className="flex items-center justify-center gap-1.5 text-slate-300 font-semibold">
            <span>📍</span>
            <span>العنوان: السودان - الولاية الشمالية - دنقلا</span>
          </p>
          <p className="text-slate-500 text-xs">أجود أنواع العصائر الطبيعية وسلطات الفواكه الطازجة يومياً</p>
        </div>

        {/* Divider */}
        <div className="w-16 h-0.5 bg-slate-800 mx-auto rounded-full"></div>

        {/* Copyright */}
        <p className="text-slate-500 text-xs font-medium">
          &copy; {new Date().getFullYear()} جميع الحقوق محفوظة لمتجر 50 فاكهة
        </p>
      </div>
    </footer>
  );
}
