// Solo la credencial temporal, por pestaña. Nunca guardar contraseña ni confiar en roles cacheados.
const KEY = 'catalogo.session.v1';
export function readSession(storage, now = Date.now()) {
 try {
  const saved = JSON.parse(storage.getItem(KEY) || 'null');
  if (saved && typeof saved.access_token === 'string' && Number.isFinite(saved.expiresAt) && saved.expiresAt > now) return saved;
  storage.removeItem(KEY);
 } catch { try { storage.removeItem(KEY); } catch {} }
 return null;
}
export function rememberSession(storage, session, now = Date.now()) {
 const saved = {access_token: session.access_token, expiresAt: now + session.expires_in * 1000};
 try { storage.setItem(KEY, JSON.stringify(saved)); } catch { /* Almacenamiento bloqueado: sesión solo en memoria. */ }
 return saved;
}
export function forgetSession(storage, token) {
 try {
  const saved = JSON.parse(storage.getItem(KEY) || 'null');
  if (!token || saved?.access_token === token) storage.removeItem(KEY);
 } catch { try { storage.removeItem(KEY); } catch {} }
}
export async function restoreSession(storage, fetcher, now = Date.now()) {
 const saved = readSession(storage, now);
 if (!saved) return null;
 const response = await fetcher('/api/auth/me', {headers: {Authorization: `Bearer ${saved.access_token}`}});
 if (response.status === 401) { forgetSession(storage, saved.access_token); return null; }
 if (!response.ok) throw new Error('No se pudo validar la sesión. Intenta nuevamente.');
 const user = await response.json();
 if (saved.expiresAt <= Date.now()) { forgetSession(storage, saved.access_token); return null; }
 return {...saved, user};
}
