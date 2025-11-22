export type UserRole = 'patient' | 'helper';

export type UrgencyLevel = 'emergency' | 'high' | 'medium' | 'low';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  relationship?: string; // For helpers: 'daughter', 'son', 'friend', etc.
  createdAt: Date;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  intervalHours: number; // Default 4 hours
  startTime: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: 'pending' | 'taken' | 'skipped';
  painLevel?: number; // 1-10 scale
  notes?: string;
}

export interface HelpRequest {
  id: string;
  patientId: string;
  helperIds: string[]; // Can send to multiple helpers
  urgency: UrgencyLevel;
  message: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  createdAt: Date;
  respondedAt?: Date;
  respondedBy?: string; // Helper ID who responded
  location?: string; // bedroom, kitchen, etc.
}

export interface HelperAvailability {
  id: string;
  helperId: string;
  isAvailable: boolean;
  unavailableUntil?: Date;
  updatedAt: Date;
}

export interface RequestCooldown {
  helperId: string;
  requestCount: number;
  windowStart: Date;
  cooldownUntil?: Date;
  isOnCooldown: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  urgency?: UrgencyLevel;
  requestId?: string;
  type: 'medication' | 'help-request' | 'helper-response' | 'reminder';
}
