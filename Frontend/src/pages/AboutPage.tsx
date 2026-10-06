import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ShieldCheck,
  Zap,
  Lock,
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Server,
  Layers,
  Cpu,
  Target,
  Award,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Header / Navbar Corporativa */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Store className="w-6 h-6" />
            </div>
            <div className="flex items-center">
              <span className="text-xl font-black text-slate-900 tracking-tight">BIZLY</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 ml-2 px-2 py-0.5 bg-sky-50 rounded-full border border-sky-200">
                SaaS Enterprise
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-sky-600 transition-colors">
              Inicio
            </Link>
            <a href="/#caracteristicas" className="hover:text-sky-600 transition-colors">
              Características
            </a>
            <a href="/#precios" className="hover:text-sky-600 transition-colors">
              Planes y Precios
            </a>
            <Link to="/quienes-somos" className="text-sky-600 font-semibold transition-colors">
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
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/50 border-b border-slate-100">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Nuestra Visión · ADN de Grado Industrial</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Democratizando el software empresarial de alto nivel
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              En BIZLY fusionamos rigor transaccional bancario, ingeniería de datos de última generación y diseño centrado en el usuario para entregar a las pymes la potencia que antes solo tenían los grandes conglomerados.
            </p>
          </div>
        </div>
      </section>

      {/* Sección 1: Nuestra Historia & Misión */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-xs font-bold uppercase tracking-wider border border-sky-200">
                <Target className="w-3.5 h-3.5" />
                <span>Nuestra Historia & Misión</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                Nacidos para romper la asimetría tecnológica en los negocios
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Durante décadas, las herramientas con verdadera consistencia transaccional, trazabilidad de auditoría inmutable e inteligencia operativa estuvieron reservadas a corporaciones multimillonarias. La inmensa mayoría de pequeñas y medianas empresas tuvieron que conformarse con hojas de cálculo vulnerables o sistemas rígidos y obsoletos.
              </p>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Fundamos <strong>BIZLY</strong> con una convicción inquebrantable: <em>cada comerciante, franquicia y empresa en expansión merece operar con la misma precisión, velocidad y seguridad que una entidad financiera internacional</em>, sin burocracia técnica ni costos prohibitivos.
              </p>
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cero tolerancia a fugas de inventario</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Alineación estricta a normas fiscales</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Aislamiento absoluto de datos por tenant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Latencia de respuesta sub-milisegundo</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-600/25">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">El Manifiesto BIZLY</h3>
                  <p className="text-xs text-slate-500">Principios de ingeniería que gobiernan nuestro código</p>
                </div>
              </div>

              <blockquote className="border-l-4 border-sky-600 pl-4 py-1 text-sm text-slate-700 italic font-medium leading-relaxed">
                «Un sistema empresarial no es solo una pantalla bonita; es el guardián de la confianza comercial, la verdad financiera y la supervivencia del negocio ante el caos operacional.»
              </blockquote>

              <div className="space-y-3 pt-2">
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs">
                  <strong className="text-slate-900 block font-bold mb-1">Rigor Transaccional sin Concesiones</strong>
                  <span className="text-slate-600">
                    No permitimos estados intermedios. Cada venta, actualización de stock y movimiento contable se ejecuta como una transacción atómica protegida.
                  </span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs">
                  <strong className="text-slate-900 block font-bold mb-1">Trazabilidad Total e Inmutable</strong>
                  <span className="text-slate-600">
                    Auditabilidad forense: cada evento clave registra quién, cuándo, desde qué IP y qué valores modificó exactamente.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección 2: El Equipo y el ADN Técnico */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Arquitectura de Grado Industrial
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Ingeniería diseñada para la alta disponibilidad
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Detrás de una interfaz intuitiva opera una arquitectura enterprise inspirada en los estándares de ciberseguridad, resiliencia y escalabilidad más exigentes del sector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pilar 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Transaccionalidad ACID</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prevención radical de sobreventa mediante bloqueos pesimistas a nivel de fila y aislamiento estricto para garantizar consistencia contable en picos de tráfico.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Tenancy Aislado</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Partición lógica total por tenant apoyada en índices compuestos en motor relacional. Los datos de una empresa jamás son accesibles por otra.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Seguridad & OTP en 2 Pasos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Protección adversarial con rate limiting estricto, mitigación de ataques de fuerza bruta con bloqueo por intentos fallidos y entrega de códigos OTP vía SMTP cifrado.
              </p>
            </div>

            {/* Pilar 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Resiliencia Operacional</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Arquitectura desacoplada, gestión centralizada de excepciones operacionales y documentación interactiva bajo estándar OpenAPI 3.0.0.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              ¿Listo para transformar la gestión de tu empresa?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
              Comienza hoy de forma gratuita con el Plan Starter y descubre cómo BIZLY simplifica tus ventas, protege tu inventario y respalda tu crecimiento.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/registro"
              className="w-full sm:w-auto px-8 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <span>Comenzar gratis ahora</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center text-base cursor-pointer"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">BIZLY</span>
            <span className="text-xs text-slate-500 ml-2">© 2026 Bizly Inc. Todos los derechos reservados.</span>
          </Link>

          <div className="flex items-center gap-6 text-xs">
            <Link to="/quienes-somos" className="text-sky-400 font-medium transition-colors">
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
