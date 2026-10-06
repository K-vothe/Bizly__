import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Store,
  TrendingUp,
  Shield,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, saveSession } from '../services/api';
import OtpInput from '../components/OtpInput';

export type AuthStep = 'IDLE' | 'SUBMITTING_USER' | 'AWAITING_OTP' | 'VERIFYING_OTP' | 'SUCCESS';

interface RegisterPageProps {
  onLogin?: (accessToken: string, refreshToken: string, usuario: any) => void;
  onIrLogin?: () => void;
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function RegisterPage({ onLogin, onIrLogin }: RegisterPageProps) {
  // Máquina de estados estricta
  const [step, setStep] = useState<AuthStep>('IDLE');

  // Datos del formulario de registro
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  // Estados de verificación OTP
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [registeredSession, setRegisteredSession] = useState<{ token: string; usuario: any } | null>(null);

  // Contador regresivo para reenvío de OTP (60s)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'AWAITING_OTP' && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  // Manejo del formulario de creación de cuenta
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreEmpresa.trim()) {
      toast.error('Por favor ingresa el nombre de tu empresa o negocio');
      return;
    }
    if (!nombreCompleto.trim()) {
      toast.error('Por favor ingresa tu nombre completo');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Por favor ingresa un correo electrónico válido');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!aceptaTerminos) {
      toast.error('Debes aceptar los términos y la política de tratamiento de datos personales');
      return;
    }

    setStep('SUBMITTING_USER');

    try {
      const response = await api.post('/auth/register', {
        nombre_empresa: nombreEmpresa.trim(),
        nombre: nombreCompleto.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data;
      setRegisteredSession({
        token: data.token,
        usuario: data.usuario,
      });

      toast.success('¡Registro completado! Hemos enviado tu código de seguridad.');
      setStep('AWAITING_OTP');
      setCooldown(60);
      setOtpCode('');
    } catch (error: any) {
      console.error('[RegisterPage] Error en registro:', error);
      const msg =
        error.response?.data?.error ||
        error.message ||
        'No se pudo completar el registro. Intenta nuevamente.';
      toast.error(msg);
      setStep('IDLE');
    }
  };

  // Manejo de verificación del código OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('Por favor ingresa los 6 dígitos del código de verificación');
      return;
    }

    setStep('VERIFYING_OTP');

    try {
      const response = await api.post('/auth/verify-otp', {
        correo: email.trim().toLowerCase(),
        codigo: otpCode,
      });

      const data = response.data;
      const activeToken = data.token || registeredSession?.token;
      const activeUser = data.usuario || registeredSession?.usuario;

      if (activeToken) {
        localStorage.setItem('token', activeToken);
      }
      if (activeUser) {
        saveSession({ accessToken: activeToken, usuario: activeUser });
      }

      toast.success('¡Cuenta verificada y activada con éxito!');
      setStep('SUCCESS');

      setTimeout(() => {
        if (onLogin && activeToken) {
          onLogin(activeToken, '', activeUser);
        }
      }, 1500);
    } catch (error: any) {
      console.error('[RegisterPage] Error al verificar OTP:', error);
      const msg =
        error.response?.data?.error ||
        error.message ||
        'Código inválido o expirado. Verifica e intenta de nuevo.';
      toast.error(msg);
      setStep('AWAITING_OTP');
      setOtpCode('');
    }
  };

  // Reenviar código OTP con rate-limiting y cooldown
  const handleResendOtp = async () => {
    if (cooldown > 0) return;

    try {
      await api.post('/auth/send-otp', {
        correo: email.trim().toLowerCase(),
      });
      toast.success('Nuevo código enviado a tu correo');
      setCooldown(60);
      setOtpCode('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al reenviar código. Espera un momento.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* PANEL IZQUIERDO: Formulario de Alta Conversión / Flujo OTP */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="max-w-[420px] w-full space-y-6">
          {/* Logo y Encabezado de Marca */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-600/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">BIZLY</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 ml-1.5 px-1.5 py-0.5 bg-sky-50 rounded border border-sky-200">
                Enterprise
              </span>
            </div>
          </div>

          {/* PASO 1: Formulario de Registro (IDLE / SUBMITTING_USER) */}
          {(step === 'IDLE' || step === 'SUBMITTING_USER') && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Crea tu cuenta empresarial
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Comienza a gestionar tus ventas, inventario y métricas en minutos.
                </p>
              </div>

              {/* Botón Google SSO */}
              <div>
                <button
                  type="button"
                  onClick={() => toast.info('SSO en configuración')}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-3 shadow-sm hover:border-slate-400 cursor-pointer"
                >
                  <GoogleIcon className="w-5 h-5" />
                  <span>Registrarse con Google</span>
                </button>

                {/* Separador */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium">
                      O regístrate con tu correo
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nombre de la Empresa / Negocio <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. Distribuidora Central S.A.S"
                      value={nombreEmpresa}
                      onChange={(e) => setNombreEmpresa(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <Building2 className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tu Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej. Carlos Rodríguez"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Correo Electrónico Corporativo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="carlos@tuempresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Consentimiento informado y políticas de privacidad */}
                <div className="flex items-start gap-2.5 pt-1 text-left">
                  <input
                    id="aceptaTerminos"
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                  />
                  <label htmlFor="aceptaTerminos" className="text-xs text-slate-600 cursor-pointer select-none leading-relaxed">
                    Acepto los{' '}
                    <span className="font-medium text-sky-600 underline cursor-pointer hover:text-sky-700">
                      Términos y Condiciones
                    </span>{' '}
                    y otorgo mi{' '}
                    <span className="font-medium text-sky-600 underline cursor-pointer hover:text-sky-700">
                      consentimiento informado para el tratamiento de datos personales
                    </span>
                    . <span className="text-red-500">*</span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={step === 'SUBMITTING_USER'}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 cursor-pointer"
                  >
                    {step === 'SUBMITTING_USER' ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creando tu empresa...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar y Verificar Cuenta</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Redirección a Login */}
              <div className="text-center pt-3 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  ¿Ya tienes una cuenta registrada?{' '}
                  <button
                    type="button"
                    onClick={onIrLogin}
                    className="font-semibold text-sky-600 hover:text-sky-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* PASO 2: Verificación OTP (AWAITING_OTP / VERIFYING_OTP) */}
          {(step === 'AWAITING_OTP' || step === 'VERIFYING_OTP') && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-sky-50 border border-sky-200 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Verifica tu correo electrónico
                </h1>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Hemos enviado un código de seguridad de 6 dígitos a:
                </p>
                <div className="inline-block bg-slate-100 text-slate-800 text-sm font-semibold px-3 py-1 rounded-lg border border-slate-200">
                  {email}
                </div>
              </div>

              {/* Componente OTP Reactivo de 6 Dígitos */}
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Ingresa el código de 6 dígitos
                  </label>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={step === 'VERIFYING_OTP'}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpCode.length !== 6 || step === 'VERIFYING_OTP'}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-600/20 cursor-pointer"
                >
                  {step === 'VERIFYING_OTP' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validando código OTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar y Activar Cuenta</span>
                    </>
                  )}
                </button>
              </form>

              {/* Reenvío con Cooldown y Opciones de Regreso */}
              <div className="space-y-3 text-center pt-2">
                <div className="text-xs text-slate-500">
                  {cooldown > 0 ? (
                    <span>
                      Puedes solicitar un nuevo código en{' '}
                      <span className="font-bold text-slate-700">{cooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reenviar código de verificación</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep('IDLE')}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>¿Correo incorrecto? Cambiar datos</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Éxito (SUCCESS) */}
          {step === 'SUCCESS' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                ¡Cuenta activada con éxito!
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Tu empresa <strong className="text-slate-800">{nombreEmpresa}</strong> ha sido verificada.
                Iniciando sesión en tu panel...
              </p>
              <div className="pt-2">
                <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: Hero / Propuesta de Valor (Split Screen Estándar Zoho) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 border-l border-slate-200 items-center justify-center p-12 relative overflow-hidden">
        {/* Decoración geométrica de fondo */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg w-full space-y-8 relative z-10">
          {/* Badge corporativo */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Bizly SaaS · Arquitectura Multi-Tenant Aislada
          </div>

          {/* Mensaje de Propuesta de Valor */}
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Control total de tu negocio en tiempo real.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Punto de venta de alta velocidad, inventario automatizado, control de clientes y analítica fiscal en una sola plataforma corporativa.
            </p>
          </div>

          {/* Ilustración / Mockup de Dashboard Estilizado */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-medium text-slate-400">bizly-pos.app</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                  <span>Ventas del Día</span>
                </div>
                <div className="text-lg font-bold text-slate-900">$2.840.000</div>
                <div className="text-[11px] text-emerald-600 font-medium">+18.5% vs ayer</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>Inventario Activo</span>
                </div>
                <div className="text-lg font-bold text-slate-900">1.420 u.</div>
                <div className="text-[11px] text-slate-500 font-medium">98% en stock óptimo</div>
              </div>
            </div>

            <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-medium text-slate-700">Aislamiento de datos garantizado</span>
              </div>
              <span className="text-[11px] font-semibold text-sky-700">AES-256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
