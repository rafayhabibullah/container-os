'use client';

export default function PrintButton() {
  return (
    <button
      className="border border-slate-300 text-slate-600 text-sm px-5 py-2 rounded-xl hover:bg-slate-50 transition-colors"
      onClick={() => window.print()}
    >
      Print / Download PDF
    </button>
  );
}
