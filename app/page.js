import React from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="bg-emerald-950 text-emerald-100 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <span>📞 PTCL: 046-2512722</span>
            <span>📱 0345-3326318 | 0318-6392322 | 0331-6379110</span>
            <span>✉️ golaninternational322@gmail.com</span>
          </div>
          <div className="font-semibold text-amber-400">
            GOVT. APPROVED: OEP LICENSE #4003 | DTS REGISTERED
          </div>
        </div>
      </div>

      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-900 tracking-tight">
              GOLAN INTERNATIONAL
            </h1>
            <p className="text-xs md:text-sm font-semibold text-amber-600 tracking-widest uppercase">
              Travel & Tours • Overseas Employment Promoters (Lic #4003)
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">Chief Executive</p>
            <p className="font-bold text-slate-800">Shan Chairman</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 space-y-6">
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            B2B AGENT & SUB-AGENT PORTAL
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
            Pakistan’s Trusted B2B Portal for <span className="text-emerald-700">Group Flights, Umrah & Work Visas</span>
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Welcome to <strong>Golan International Travel & Tours</strong> B2B partner network. Book instant Saudi/UAE group seats, customized Umrah packages, and track OEP License #4003 work visa & protector cases directly from one dashboard.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-emerald-700 font-bold text-lg">✈️ Group Fares</div>
              <p className="text-xs text-slate-500 mt-1">Instant seat hold & auto-ticketing for KSA, UAE & UK.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-emerald-700 font-bold text-lg">🕋 Umrah B2B</div>
              <p className="text-xs text-slate-500 mt-1">Makkah/Madinah hotels, transport & instant visa vouchers.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-emerald-700 font-bold text-lg">🛂 OEP #4003</div>
              <p className="text-xs text-slate-500 mt-1">Live work visa stamping, Gamca & Protector tracking.</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">B2B Partner Login</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Enter your registered agency credentials to access live rates.
          </p>

          <form className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agent Email / Agency ID
              </label>
              <input
                type="email"
                placeholder="agency@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="button"
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-lg text-sm transition"
            >
              Sign In to B2B Dashboard
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Want to become a registered sub-agent?
            </p>
            <button
              type="button"
              className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition"
            >
              Register New Travel Agency (Free)
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>
            © {new Date().getFullYear()} <strong>Golan International Travel & Tours</strong> (OEP License #4003). All Rights Reserved.
          </p>
          <p>Toba Tek Singh • Support: 046-2512722 | 0345-3326318</p>
        </div>
      </footer>
    </div>
  );
}
