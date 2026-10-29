import {useCallback, useEffect, useState} from 'react';
import {forgetSession, rememberSession, restoreSession} from './session';
export default function useSession() {
 const [session, setSession] = useState(null), [restoring, setRestoring] = useState(true);
 const [restoreError, setRestoreError] = useState(''), [attempt, setAttempt] = useState(0);
 // Acceso diferido: algunos navegadores pueden bloquear sessionStorage.
 const storage = {getItem: key => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value), removeItem: key => window.sessionStorage.removeItem(key)};
 useEffect(() => {
  let cancelled = false;
  setRestoring(true); setRestoreError('');
  restoreSession(storage, window.fetch.bind(window)).then(saved => {
   if (!cancelled) {setSession(saved); setRestoring(false);}
  }).catch(() => {
   if (!cancelled) {setRestoreError('No se pudo comprobar la sesión. Revisa la conexión y vuelve a intentar.'); setRestoring(false);}
  });
  return () => {cancelled = true;};
 }, [attempt]);
 const invalidate = useCallback(token => {
  forgetSession(storage, token);
  setSession(current => !token || current?.access_token === token ? null : current);
 }, []);
 const loginSession = useCallback(result => {
  const saved = rememberSession(storage, result);
  setSession({...saved, user: result.user}); setRestoreError('');
 }, []);
 useEffect(() => {
  if (!session) return;
  const timer = setTimeout(() => invalidate(session.access_token), Math.max(0, session.expiresAt - Date.now()));
  return () => clearTimeout(timer);
 }, [session, invalidate]);
 return {session, restoring, restoreError, retry: () => setAttempt(n => n + 1), loginSession, invalidate};
}
