/**
 * Firebase/Firestore foi removido do app.
 *
 * A vinculação de perfis agora acontece no backend/Supabase, principalmente em
 * `/users/me?invite_professor_id=...` dentro do AuthProvider.
 *
 * Mantemos esta função como compatibilidade para código legado que eventualmente
 * ainda importe `linkExistingProfile`.
 */
export async function linkExistingProfile(): Promise<void> {
  return;
}
