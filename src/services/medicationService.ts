import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Medication, MedicationLog } from '../types';

export const medicationService = {
  // Create a new medication
  async createMedication(
    patientId: string,
    name: string,
    dosage: string,
    intervalHours: number = 4
  ): Promise<string> {
    const medication: Omit<Medication, 'id'> = {
      patientId,
      name,
      dosage,
      intervalHours,
      startTime: new Date(),
      isActive: true,
      createdAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'medications'), medication);
    return docRef.id;
  },

  // Get patient's active medications
  subscribeToMedications(patientId: string, callback: (medications: Medication[]) => void) {
    const q = query(
      collection(db, 'medications'),
      where('patientId', '==', patientId),
      where('isActive', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
      const medications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Medication));
      callback(medications);
    });
  },

  // Log medication as taken
  async logMedicationTaken(
    medicationId: string,
    scheduledTime: Date,
    painLevel?: number,
    notes?: string
  ): Promise<void> {
    const log: Omit<MedicationLog, 'id'> = {
      medicationId,
      scheduledTime,
      takenTime: new Date(),
      status: 'taken',
      painLevel,
      notes
    };

    await addDoc(collection(db, 'medicationLogs'), log);
  },

  // Get next scheduled dose time
  getNextDoseTime(medication: Medication, lastTakenTime?: Date): Date {
    const baseTime = lastTakenTime || medication.startTime;
    const nextDose = new Date(baseTime);
    nextDose.setHours(nextDose.getHours() + medication.intervalHours);
    return nextDose;
  },

  // Get medication logs for today
  async getTodayLogs(medicationId: string): Promise<MedicationLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'medicationLogs'),
      where('medicationId', '==', medicationId),
      where('scheduledTime', '>=', Timestamp.fromDate(today)),
      orderBy('scheduledTime', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MedicationLog));
  },

  // Get last medication log
  async getLastLog(medicationId: string): Promise<MedicationLog | null> {
    const q = query(
      collection(db, 'medicationLogs'),
      where('medicationId', '==', medicationId),
      where('status', '==', 'taken'),
      orderBy('takenTime', 'desc')
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as MedicationLog;
  }
};
