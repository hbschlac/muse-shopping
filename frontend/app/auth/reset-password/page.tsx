'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword, verifyResetToken } from '@/lib/api/auth';

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState<{
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
  }>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid reset link. No token provided.');
        setVerifying(false);
        return;
      }

      try {
        const result = await verifyResetToken(token);
        if (result.valid) {
          setTokenValid(true);
        } else {
          setError('This password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        console.error('Token verification error:', err);
        setError('This password reset link is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength({
      hasMinLength: value.length >= 8,
      hasUppercase: /[A-Z]/.test(value),
      hasLowercase: /[a-z]/.test(value),
      hasNumber: /\d/.test(value),
    });
  };

  const isPasswordValid = () => {
    return (
      passwordStrength.hasMinLength &&
      passwordStrength.hasUppercase &&
      passwordStrength.hasLowercase &&
      passwordStrength.hasNumber
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!isPasswordValid()) {
      setError('Password does not meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(token, password);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src="/muse-wordmark.svg" alt="Muse" className="h-24" />
          </div>
        </div>
        <div className="w-full max-w-sm">
          <div className="bg-red-50 border border-red-200 rounded-[12px] p-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/forgot-password"
                className="block w-full h-12 gradient-primary text-white rounded-[12px] flex items-center justify-center font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                Request new reset link
              </Link>
              <Link
                href="/auth/login"
                className="block w-full h-12 border border-gray-300 bg-white text-gray-900 rounded-[12px] flex items-center justify-center font-medium transition-colors hover:bg-gray-50"
              >
                Return to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src="/muse-wordmark.svg" alt="Muse" className="h-24" />
          </div>
        </div>
        <div className="w-full max-w-sm">
          <div className="bg-green-50 border border-green-200 rounded-[12px] p-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Password Reset Successful
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              Your password has been reset successfully. You'll be redirected to the login page in a moment.
            </p>
            <Link
              href="/auth/login"
              className="block w-full h-12 gradient-primary text-white rounded-[12px] flex items-center justify-center font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to login now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-[var(--color-ecru)] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <img src="/muse-wordmark.svg" alt="Muse" className="h-24" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Reset your password
        </h1>
        <p className="text-base text-gray-600">
          Enter your new password below
        </p>
      </div>

      {/* Reset Password Form */}
      <div className="w-full max-w-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={loading}
                className="w-full h-12 px-4 pr-12 rounded-[12px] border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-3 space-y-1">
                <div className={`text-xs ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordStrength.hasMinLength ? '✓' : '○'} At least 8 characters
                </div>
                <div className={`text-xs ${passwordStrength.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordStrength.hasUppercase ? '✓' : '○'} One uppercase letter
                </div>
                <div className={`text-xs ${passwordStrength.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordStrength.hasLowercase ? '✓' : '○'} One lowercase letter
                </div>
                <div className={`text-xs ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordStrength.hasNumber ? '✓' : '○'} One number
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm new password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full h-12 px-4 rounded-[12px] border border-gray-300 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Re-enter your password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-600 mt-2">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword || !isPasswordValid() || password !== confirmPassword}
            className="w-full h-14 gradient-primary text-white rounded-[12px] flex items-center justify-center font-semibold transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="text-center mt-6">
          <Link
            href="/auth/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>

      {/* Spacing */}
      <div className="h-20" />
    </div>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ecru)]" />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
