'use client';
import { useIsMobile } from '@/app/hooks/useIsMobile';

import { useCallback, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AUTH_DOMAIN = 'lingxichaguan.app';

function toEmail(username) {
  return `${username.trim().toLowerCase()}@${AUTH_DOMAIN}`;
}

export default function LoginModal({ onClose, showToast, isExplicitLoginRef, initialError = '' }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (m) => {
    setMode(m);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const user = username.trim();
    if (!user) {
      setError('请输入用户名');
      return;
    }
    if (user.length < 2 || user.length > 20) {
      setError('用户名长度应为 2-20 个字符');
      return;
    }
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(user)) {
      setError('用户名只支持中文、字母、数字、下划线和连字符');
      return;
    }

    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少 6 位');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (!isSupabaseConfigured) {
      showToast('未配置 Supabase，无法登录', 'error');
      return;
    }

    setLoading(true);
    const email = toEmail(user);

    try {
      if (mode === 'register') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: user } }
        });
        if (err) throw err;
        setSuccess('注册成功！请使用用户名和密码登录');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        if (isExplicitLoginRef) isExplicitLoginRef.current = true;
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (err) throw err;
        if (data?.user) {
          onClose();
        }
      }
    } catch (err) {
      const msg = err.message || '操作失败，请稍后再试';
      if (msg.includes('Invalid login credentials')) {
        setError('用户名或密码错误');
      } else if (msg.includes('User already registered')) {
        setError('该用户名已被注册');
      } else if (msg.includes('rate limit')) {
        setError('操作过于频繁，请稍后再试');
      } else {
        setError(msg);
      }
      if (mode === 'login' && isExplicitLoginRef) isExplicitLoginRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="登录" onClick={onClose}>
      <div className="glass card modal login-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="title" style={{ marginBottom: 16 }}>
          <span>灵犀茶馆</span>
          <span className="muted">{mode === 'login' ? '用户登录' : '用户注册'}</span>
        </div>

        {/* 切换标签 */}
        <div
          className="login-tab-bar"
          style={{
            display: 'flex',
            marginBottom: 20,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}
        >
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: mode === 'login' ? 600 : 400,
              background: mode === 'login' ? 'var(--primary)' : 'var(--bg)',
              color: mode === 'login' ? 'var(--primary-foreground)' : 'var(--text)',
              transition: 'all 0.2s'
            }}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: mode === 'register' ? 600 : 400,
              background: mode === 'register' ? 'var(--primary)' : 'var(--bg)',
              color: mode === 'register' ? 'var(--primary-foreground)' : 'var(--text)',
              transition: 'all 0.2s'
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <div className="muted" style={{ marginBottom: 6, fontSize: '0.8rem' }}>
              用户名
            </div>
            <input
              style={{ width: '100%' }}
              className="input"
              type="text"
              placeholder="输入用户名（中文/字母/数字）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <div className="muted" style={{ marginBottom: 6, fontSize: '0.8rem' }}>
              密码
            </div>
            <input
              style={{ width: '100%' }}
              className="input"
              type="password"
              placeholder={mode === 'register' ? '设置密码（至少6位）' : '输入密码'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <div className="muted" style={{ marginBottom: 6, fontSize: '0.8rem' }}>
                确认密码
              </div>
              <input
                style={{ width: '100%' }}
                className="input"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          {success && (
            <div className="login-message success" style={{ marginBottom: 12 }}>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="login-message error" style={{ marginBottom: 12 }}>
              <span>{error}</span>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button type="button" className="button secondary" onClick={onClose}>
              取消
            </button>
            <button className="button" type="submit" disabled={loading}>
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
