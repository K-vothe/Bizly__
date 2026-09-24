import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  ShieldCheck,
  TrendingUp,
  Database,
  CheckCircle2,
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Header / Navbar Corporativa */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Store className="w-6 h-6" />
            </div>
            <div className="flex items-center">
              <span className="text-xl font-black text-slate-900 tracking-tight">BIZLY</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 ml-2 px-2 py-0.5 bg-sky-50 rounded-full border border-sky-200">
                SaaS Enterprise
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#caracteristicas" className="hover:text-sky-600 transition-colors">
              Características
            </a>
            <a href="#precios" className="hover:text-sky-600 transition-colors">
              Planes y Precios
            </a>
            <Link to="/quienes-somos" className="hover:text-sky-600 transition-colors">
              Quiénes Somos
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors cursor-pointer"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/registro"
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Comenzar gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Nueva Generación SaaS B2B · Alta Disponibilidad</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              El sistema de ventas e inventario que tu negocio merece
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              BIZLY es la plataforma integral de punto de venta, gestión de stock, auditoría transaccional e inteligencia de negocios diseñada para escalar sin fricción.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/registro"
                className="w-full sm:w-auto px-8 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                <span>Comenzar gratis</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center text-base cursor-pointer"
              >
                Iniciar Sesión
              </Link>
            </div>

            {/* Badges de Garantía */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sin tarjeta de crédito requerida</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Punto de Venta con latencia cero</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-sky-600" />
                <span>Aislamiento estricto de datos</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Mockup Demostrativa en Vivo */}
          <div className="mt-16 max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">app.bizly.com/dashboard</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                ● En vivo
              </span>
            </div>

            <div className="p-6 sm:p-8 bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Facturación Total</span>
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">$14.200.000 COP</div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">+24.8% vs mes anterior</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Transacciones POS</span>
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">3.840</div>
                <div className="text-xs text-slate-500 font-medium mt-1">99.9% aprobadas</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Auditoría & Compliance</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">100% Inmutable</div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">Trazabilidad ISO 27001</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="caracteristicas" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Funcionalidades Clave
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Diseñado para la velocidad y el control absoluto
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Herramientas pensadas para maximizar la productividad de tu equipo comercial y proteger cada centavo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Punto de Venta (POS)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Venta con lector de código de barras, búsqueda predictiva latencia cero, selección automática de cantidades y cálculo fiscal instantáneo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Auditoría & Trazabilidad</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Registro inmutable de cada venta, anulación y modificación de stock por usuario, IP y marca de tiempo para control interno total.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Aislamiento Multi-Tenant</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aislamiento riguroso por tenant y optimización con índices compuestos para responder en milisegundos incluso con millones de filas.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Analítica en Tiempo Real</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Motor analítico basado en el patrón Kleene.ai: series de tiempo, Top 5 productos y visualización interactiva con Chart.js.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Planes Transparentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Precios diseñados para crecer con tu empresa
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Comienza gratis hoy mismo y escala tus capacidades conforme se expanda tu operación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plan Starter */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Plan Starter</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ideal para nuevos emprendimientos y pruebas de concepto.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">$0</span>
                  <span className="text-sm font-medium text-slate-500">/ mes (Gratis)</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Hasta 50 productos</strong> en inventario</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Hasta 2 usuarios</strong> colaboradores</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Punto de Venta (POS) estándar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Gestión de clientes básica</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/registro"
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-center block text-sm transition-all cursor-pointer"
                >
                  Comenzar Gratis
                </Link>
              </div>
            </div>

            {/* Plan Business */}
            <div className="bg-white p-8 rounded-2xl border-2 border-sky-600 shadow-xl flex flex-col justify-between relative">
              <div className="absolute -top-3.5 right-6 bg-sky-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                Más Popular
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Plan Business</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Para empresas en crecimiento que requieren máxima potencia.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">$99.000</span>
                  <span className="text-sm font-medium text-slate-500">COP / mes (~$29 USD)</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span><strong>Productos ilimitados</strong> en inventario</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span><strong>Usuarios colaboradores ilimitados</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Módulo de Auditoría y Trazabilidad completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Motor de Inteligencia de Negocios y Reportes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Soporte prioritario 24/7 y respaldos continuos</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/registro"
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-center block text-sm shadow-md shadow-sky-600/25 transition-all cursor-pointer"
                >
                  Crear Cuenta Business
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">BIZLY</span>
            <span className="text-xs text-slate-500 ml-2">© 2026 Bizly Inc. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link to="/quienes-somos" className="hover:text-white transition-colors">
              Quiénes Somos
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Iniciar Sesión
            </Link>
            <Link to="/registro" className="hover:text-white transition-colors">
              Crear Cuenta
            </Link>
            <a href="http://localhost:4001/api/docs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              API OpenAPI / Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
