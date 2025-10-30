import { API_BASE_URL } from '../config/api';

// Elimina tutti gli asset che non hanno più un civico associato
export async function deleteOrphanAssets() {
  const res = await fetch(`${API_BASE_URL}/api/assets/orfani`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Errore nella cancellazione asset orfani');
  return await res.json();
}
