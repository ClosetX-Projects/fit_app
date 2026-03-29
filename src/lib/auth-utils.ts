
import { collection, query, where, getDocs, limit, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Verifica se existe um perfil de aluno criado por um professor com o mesmo e-mail.
 * Se existir, migra todos os dados para o novo UID do aluno autenticado.
 */
export async function linkExistingProfile(firestore: any, authUid: string, email: string) {
  if (!email || !firestore) return;
  
  const normalizedEmail = email.toLowerCase().trim();
  const usersRef = collection(firestore, 'users');
  
  // Busca por perfil de aluno com o mesmo e-mail que ainda não foi "reivindicado" (ID diferente do UID)
  const q = query(
    usersRef, 
    where('email', '==', normalizedEmail), 
    where('userType', '==', 'student'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return;

  const existingDoc = snapshot.docs[0];
  const oldId = existingDoc.id;
  
  // Se o ID do documento já for o UID do Auth, já está vinculado
  if (oldId === authUid) return;

  const existingData = existingDoc.data();

  // 1. Criar/Atualizar o perfil definitivo com os dados pré-existentes
  await setDoc(doc(firestore, 'users', authUid), {
    ...existingData,
    id: authUid,
    authUid: authUid, // Campo auxiliar de controle
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 2. Lista de subcoleções críticas para migrar
  const subcollections = [
    'physicalAssessments',
    'physicalTests',
    'trainingPrograms',
    'workoutHistory_flat',
    'exerciseHistory_flat',
    'healthData',
    'notifications'
  ];

  for (const sub of subcollections) {
    const colRef = collection(firestore, 'users', oldId, sub);
    const snap = await getDocs(colRef);
    
    for (const sDoc of snap.docs) {
      const data = sDoc.data();
      // Garante que o userId interno nos documentos aponte para o novo ID
      await setDoc(doc(firestore, 'users', authUid, sub, sDoc.id), {
        ...data,
        userId: authUid
      });
      
      // Caso especial: trainingPrograms tem subcoleção de exercícios
      if (sub === 'trainingPrograms') {
        const exRef = collection(firestore, 'users', oldId, sub, sDoc.id, 'prescribedExercises');
        const exSnap = await getDocs(exRef);
        for (const eDoc of exSnap.docs) {
          await setDoc(doc(firestore, 'users', authUid, sub, sDoc.id, 'prescribedExercises', eDoc.id), eDoc.data());
        }
      }
    }
  }

  // 3. Atualizar o vínculo na lista do Professor
  if (existingData.createdBy) {
    const profLinkRef = doc(firestore, 'professors', existingData.createdBy, 'students', authUid);
    await setDoc(profLinkRef, {
      id: authUid,
      name: existingData.name,
      email: existingData.email,
      linkedAt: new Date().toISOString(),
      migratedFrom: oldId
    });
    
    // Deletar o vínculo antigo do professor
    await deleteDoc(doc(firestore, 'professors', existingData.createdBy, 'students', oldId));
  }

  // 4. Deletar o perfil temporário antigo para evitar duplicidade
  await deleteDoc(doc(firestore, 'users', oldId));
}
