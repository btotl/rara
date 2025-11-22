import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { medicationService } from '../services/medicationService';
import { helpRequestService } from '../services/helpRequestService';
import { Medication, UrgencyLevel, User } from '../types';
import { MedicationTimer } from './MedicationTimer';
import { HelpRequestPanel } from './HelpRequestPanel';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export const PatientDashboard: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [helpers, setHelpers] = useState<User[]>([]);
  const [showNewMedForm, setShowNewMedForm] = useState(false);

  // New medication form
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medInterval, setMedInterval] = useState(4);

  useEffect(() => {
    if (!userProfile) return;

    // Subscribe to medications
    const unsubscribe = medicationService.subscribeToMedications(
      userProfile.id,
      setMedications
    );

    // Load helpers
    loadHelpers();

    return () => unsubscribe();
  }, [userProfile]);

  const loadHelpers = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'helper'));
    const snapshot = await getDocs(q);
    const helpersList = snapshot.docs.map(doc => doc.data() as User);
    setHelpers(helpersList);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      await medicationService.createMedication(
        userProfile.id,
        medName,
        medDosage,
        medInterval
      );
      setMedName('');
      setMedDosage('');
      setMedInterval(4);
      setShowNewMedForm(false);
    } catch (error) {
      console.error('Error adding medication:', error);
      alert('Failed to add medication');
    }
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Hello, {userProfile.name}
            </h1>
            <p className="text-gray-600 text-sm">Patient Dashboard</p>
          </div>
          <button
            onClick={signOut}
            className="text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Medications Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">My Medications</h2>
            <button
              onClick={() => setShowNewMedForm(!showNewMedForm)}
              className="btn-primary"
            >
              {showNewMedForm ? 'Cancel' : '+ Add Medication'}
            </button>
          </div>

          {showNewMedForm && (
            <form onSubmit={handleAddMedication} className="bg-blue-50 p-4 rounded-lg mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g., Ibuprofen"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  placeholder="e.g., 200mg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval (hours)
                </label>
                <input
                  type="number"
                  value={medInterval}
                  onChange={(e) => setMedInterval(parseInt(e.target.value))}
                  min="1"
                  max="24"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Add Medication
              </button>
            </form>
          )}

          {medications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No medications added yet.</p>
              <p className="text-sm">Click "Add Medication" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {medications.map(medication => (
                <MedicationTimer key={medication.id} medication={medication} />
              ))}
            </div>
          )}
        </div>

        {/* Help Request Panel */}
        <HelpRequestPanel helpers={helpers} patientId={userProfile.id} />
      </div>
    </div>
  );
};
