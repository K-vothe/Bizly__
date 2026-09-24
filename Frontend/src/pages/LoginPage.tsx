import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Store,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, saveSession } from '../services/api';
import OtpInput from '../components/OtpInput';

export interface LoginPageProps {
  onLogin?: (accessToken: string, refreshToken: string, usuario: any) => void;
  onIrRegistro?: () => void;
  onIrRecuperar?: () => void;
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

export default function LoginPage({ onLogin, onIrRegistro, onIrRecuperar }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modo de verificación directa en caso de cuenta no activada
  const [verificandoOtp, setVerificandoOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingLoading, setVerifyingLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      const msg = 'Por favor ingresa tu correo y contraseña';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: cleanEmail,
        correo: cleanEmail,
        password,
      });

      const data = response.data;
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || '';
      const usuario = data.usuario || data.user;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
      }
      saveSession({ accessToken, refreshToken, usuario });
      toast.success('¡Bienvenido de vuelta a Bizly!');

      if (onLogin) {
        onLogin(accessToken, refreshToken, usuario);
      }
    } catch (err: any) {
      console.error('[LoginPage] Error al iniciar sesión:', err);

      // Si la cuenta no está verificada, ofrecemos verificar OTP de inmediato
      if (err.response?.status === 403 && err.response?.data?.noVerificado) {
        toast.info('Tu cuenta no ha sido verificada. Ingresa el código OTP enviado a tu correo.');
        setVerificandoOtp(true);
        try {
          await api.post('/auth/send-otp', { correo: cleanEmail });
        } catch {}
        return;
      }

      const msg = err.response?.data?.error || err.message || 'Credenciales inválidas. Verifica tus datos.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('Ingresa los 6 dígitos del código de verificación');
      return;
    }

    setVerifyingLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        correo: email.trim().toLowerCase(),
        codigo: otpCode,
      });

      const data = response.data;
      const token = data.token;
      const usuario = data.usuario;

      if (token) {
        localStorage.setItem('token', token);
        saveSession({ accessToken: token, usuario });
      }

      toast.success('¡Cuenta activada exitosamente! Iniciando sesión...');
      setVerificandoOtp(false);

      if (onLogin && token) {
        onLogin(token, '', usuario);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Código incorrecto o expirado.';
      toast.error(msg);
      setOtpCode('');
    } finally {
      setVerifyingLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* PANEL IZQUIERDO: Formulario de Login / Verificación */}
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

          {!verificandoOtp ? (
            <div className="space-y-6">
              {/* Título */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Iniciar sesión
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Ingresa tus credenciales para acceder a tu plataforma de gestión.
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
                  <span>Iniciar sesión con Google</span>
                </button>

                {/* Separador */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium">
                      O continuar con
                    </span>
                  </div>
                </div>
              </div>

              {/* Alerta de Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={onIrRecuperar}
                      className="text-xs text-sky-600 hover:text-sky-700 font-medium hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Iniciar sesión</span>
                        <LogIn className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Registro Footer */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-600">
                  ¿No tienes una cuenta aún?{' '}
                  <button
                    type="button"
                    onClick={onIrRegistro}
                    className="font-semibold text-sky-600 hover:text-sky-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    Crear mi Negocio
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* Pantalla de Activación OTP si el usuario no estaba verificado */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Activa tu cuenta
                </h2>
                <p className="text-sm text-slate-500">
                  Tu cuenta aún no ha sido verificada. Hemos enviado un código a:
                </p>
                <div className="inline-block bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1 rounded-lg">
                  {email}
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <OtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={verifyingLoading}
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={otpCode.length !== 6 || verifyingLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  {verifyingLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Verificar y Acceder</span>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setVerificandoOtp(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                  >
                    ← Volver a inicio de sesión
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: Hero Split-Screen Estándar Zoho */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 border-l border-slate-200 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg w-full space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Bizly Suite Corporativa · Estándar Enterprise
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Control total de tu negocio en tiempo real.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Inicia sesión para gestionar transacciones en punto de venta, compras a proveedores y análisis financiero con latencia cero.
            </p>
          </div>

          {/* Tarjeta de visualización */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900">Resumen Ejecutivo</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                En vivo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                  <span>Facturación Total</span>
                </div>
                <div className="text-lg font-bold text-slate-900">$184.200.000</div>
                <div className="text-[11px] text-emerald-600 font-medium">+24.8% este mes</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>Transacciones</span>
                </div>
                <div className="text-lg font-bold text-slate-900">3.840</div>
                <div className="text-[11px] text-slate-500 font-medium">99.9% aprobadas</div>
              </div>
            </div>

            <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-medium text-slate-700">Autenticación RBAC y Multi-tenant</span>
              </div>
              <ArrowRight className="w-4 h-4 text-sky-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
