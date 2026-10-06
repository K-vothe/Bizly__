import React, { useState } from 'react';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

export interface ForgotPasswordPageProps {
  onIrLogin?: () => void;
}

export default function ForgotPasswordPage({ onIrLogin }: ForgotPasswordPageProps) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [devCode, setDevCode] = useState('');

  const handleSolicitarCodigo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      const msg = 'Por favor ingresa un correo electrónico válido';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError('');
    setExito('');

    try {
      const response = await api.post('/auth/forgot-password', {
        email: cleanEmail,
        correo: cleanEmail,
      });

      const data = response.data;
      setDevCode(data.devCode || '');
      setPaso(2);

      const msg =
        data.mensaje ||
        data.message ||
        'Código de recuperación enviado. Revisa tu bandeja de entrada.';
      setExito(msg);
      toast.success(msg);
    } catch (err: any) {
      console.error('[ForgotPasswordPage] Error al solicitar código:', err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        'No se pudo procesar la solicitud de recuperación.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!codigo.trim() || codigo.trim().length < 4) {
      const msg = 'Ingresa el código de recuperación';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!nuevaPassword || nuevaPassword.length < 6) {
      const msg = 'La nueva contraseña debe tener al menos 6 caracteres';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      const msg = 'Las contraseñas no coinciden';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim();
      const response = await api.post('/auth/reset-password', {
        email: cleanEmail,
        correo: cleanEmail,
        codigo: codigo.trim(),
        nuevaPassword,
        password: nuevaPassword,
      });

      const data = response.data;
      const msg =
        data.mensaje ||
        data.message ||
        '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión.';
      setExito(msg);
      toast.success(msg);

      setTimeout(() => {
        if (onIrLogin) onIrLogin();
      }, 1500);
    } catch (err: any) {
      console.error('[ForgotPasswordPage] Error al cambiar contraseña:', err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        'El código ingresado es inválido o ha expirado.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 text-white mb-2">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Recuperar Contraseña
          </h1>
          <p className="text-sm text-gray-500">
            {paso === 1
              ? 'Ingresa tu correo para recibir un enlace o código de recuperación'
              : `Ingresa el código enviado a ${email}`}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {exito && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{exito}</span>
          </div>
        )}

        {devCode && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
            Modo desarrollo / demo: Código <strong>{devCode}</strong>
          </div>
        )}

        {paso === 1 ? (
          <form onSubmit={handleSolicitarCodigo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enviar código'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Código de Recuperación <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 text-center tracking-widest font-mono text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                />
                <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Actualizar contraseña'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPaso(1);
                setError('');
                setExito('');
                setDevCode('');
              }}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1 cursor-pointer"
            >
              ← Volver a ingresar correo
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={onIrLogin}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Iniciar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
