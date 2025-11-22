import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { HelpRequest, UrgencyLevel, HelperAvailability, RequestCooldown } from '../types';

const COOLDOWN_THRESHOLD = 4; // requests per hour
const COOLDOWN_DURATION_MS = 45 * 60 * 1000; // 45 minutes
const COOLDOWN_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const helpRequestService = {
  // Send a help request
  async sendHelpRequest(
    patientId: string,
    helperIds: string[],
    urgency: UrgencyLevel,
    message: string,
    location?: string
  ): Promise<string> {
    // Filter out helpers on cooldown (unless emergency)
    let finalHelperIds = helperIds;
    if (urgency !== 'emergency') {
      const availableHelpers = await this.filterAvailableHelpers(helperIds, patientId);
      finalHelperIds = availableHelpers;
    }

    if (finalHelperIds.length === 0) {
      throw new Error('No available helpers. All helpers are on cooldown or unavailable.');
    }

    const request: Omit<HelpRequest, 'id'> = {
      patientId,
      helperIds: finalHelperIds,
      urgency,
      message,
      status: 'pending',
      createdAt: new Date(),
      location
    };

    const docRef = await addDoc(collection(db, 'helpRequests'), request);

    // Update request counts for cooldown tracking
    if (urgency !== 'emergency') {
      for (const helperId of finalHelperIds) {
        await this.updateRequestCount(helperId);
      }
    }

    return docRef.id;
  },

  // Filter helpers based on availability and cooldown
  async filterAvailableHelpers(helperIds: string[], patientId: string): Promise<string[]> {
    const available: string[] = [];

    for (const helperId of helperIds) {
      const isAvailable = await this.checkHelperAvailability(helperId);
      const isOnCooldown = await this.checkCooldown(helperId);

      if (isAvailable && !isOnCooldown) {
        available.push(helperId);
      }
    }

    return available;
  },

  // Check if helper is available
  async checkHelperAvailability(helperId: string): Promise<boolean> {
    const availDoc = await getDoc(doc(db, 'helperAvailability', helperId));

    if (!availDoc.exists()) {
      return true; // Default to available if not set
    }

    const data = availDoc.data() as HelperAvailability;

    if (!data.isAvailable) {
      // Check if unavailable period has expired
      if (data.unavailableUntil && new Date() > data.unavailableUntil.toDate()) {
        // Auto-update to available
        await setDoc(doc(db, 'helperAvailability', helperId), {
          isAvailable: true,
          unavailableUntil: null,
          updatedAt: new Date()
        }, { merge: true });
        return true;
      }
      return false;
    }

    return true;
  },

  // Check if helper is on cooldown
  async checkCooldown(helperId: string): Promise<boolean> {
    const cooldownDoc = await getDoc(doc(db, 'requestCooldowns', helperId));

    if (!cooldownDoc.exists()) {
      return false;
    }

    const cooldown = cooldownDoc.data() as RequestCooldown;
    const now = new Date();

    // Check if cooldown period has expired
    if (cooldown.cooldownUntil && now < cooldown.cooldownUntil.toDate()) {
      return true; // Still on cooldown
    }

    // Check if window has expired
    const windowStart = cooldown.windowStart.toDate();
    const windowEnd = new Date(windowStart.getTime() + COOLDOWN_WINDOW_MS);

    if (now > windowEnd) {
      // Reset the cooldown tracking
      await updateDoc(doc(db, 'requestCooldowns', helperId), {
        requestCount: 0,
        windowStart: now,
        cooldownUntil: null,
        isOnCooldown: false
      });
      return false;
    }

    return false;
  },

  // Update request count for cooldown tracking
  async updateRequestCount(helperId: string): Promise<void> {
    const cooldownRef = doc(db, 'requestCooldowns', helperId);
    const cooldownDoc = await getDoc(cooldownRef);
    const now = new Date();

    if (!cooldownDoc.exists()) {
      // Create new cooldown tracking
      await setDoc(cooldownRef, {
        helperId,
        requestCount: 1,
        windowStart: now,
        isOnCooldown: false
      });
      return;
    }

    const cooldown = cooldownDoc.data() as RequestCooldown;
    const newCount = cooldown.requestCount + 1;

    // Check if we've hit the threshold
    if (newCount >= COOLDOWN_THRESHOLD) {
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_DURATION_MS);

      await updateDoc(cooldownRef, {
        requestCount: newCount,
        cooldownUntil,
        isOnCooldown: true
      });
    } else {
      await updateDoc(cooldownRef, {
        requestCount: newCount
      });
    }
  },

  // Subscribe to help requests for a helper
  subscribeToHelperRequests(helperId: string, callback: (requests: HelpRequest[]) => void) {
    const q = query(
      collection(db, 'helpRequests'),
      where('helperIds', 'array-contains', helperId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HelpRequest));
      callback(requests);
    });
  },

  // Subscribe to patient's sent requests
  subscribeToPatientRequests(patientId: string, callback: (requests: HelpRequest[]) => void) {
    const q = query(
      collection(db, 'helpRequests'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HelpRequest));
      callback(requests);
    });
  },

  // Respond to a help request
  async respondToRequest(requestId: string, helperId: string, status: 'accepted' | 'completed'): Promise<void> {
    await updateDoc(doc(db, 'helpRequests', requestId), {
      status,
      respondedBy: helperId,
      respondedAt: new Date()
    });
  },

  // Set helper availability
  async setAvailability(helperId: string, isAvailable: boolean, unavailableUntil?: Date): Promise<void> {
    const availRef = doc(db, 'helperAvailability', helperId);

    await setDoc(availRef, {
      id: helperId,
      helperId,
      isAvailable,
      unavailableUntil: unavailableUntil || null,
      updatedAt: new Date()
    }, { merge: true });
  },

  // Get cooldown info for a helper
  async getCooldownInfo(helperId: string): Promise<RequestCooldown | null> {
    const cooldownDoc = await getDoc(doc(db, 'requestCooldowns', helperId));

    if (!cooldownDoc.exists()) {
      return null;
    }

    return cooldownDoc.data() as RequestCooldown;
  }
};
