import React, { useState, useEffect } from 'react';
import { Medication } from '../types';
import { medicationService } from '../services/medicationService';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  medication: Medication;
}

export const MedicationTimer: React.FC<Props> = ({ medication }) => {
  const [nextDoseTime, setNextDoseTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [painLevel, setPainLevel] = useState<number>(5);
  const [showPainInput, setShowPainInput] = useState(false);
  const [takingMed, setTakingMed] = useState(false);

  useEffect(() => {
    loadNextDoseTime();
  }, [medication]);

  useEffect(() => {
    if (!nextDoseTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextDoseTime.getTime() - now.getTime();

      if (diff <= 0) {
        setIsOverdue(true);
        setTimeRemaining('Time to take medication!');
      } else {
        setIsOverdue(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextDoseTime]);

  const loadNextDoseTime = async () => {
    const lastLog = await medicationService.getLastLog(medication.id);
    const lastTakenTime = lastLog?.takenTime;
    const nextDose = medicationService.getNextDoseTime(medication, lastTakenTime);
    setNextDoseTime(nextDose);
  };

  const handleTakeMedication = async () => {
    if (!nextDoseTime) return;

    setTakingMed(true);
    try {
      await medicationService.logMedicationTaken(
        medication.id,
        nextDoseTime,
        showPainInput ? painLevel : undefined
      );

      // Calculate next dose
      const newNextDose = new Date(nextDoseTime);
      newNextDose.setHours(newNextDose.getHours() + medication.intervalHours);
      setNextDoseTime(newNextDose);
      setShowPainInput(false);
      setPainLevel(5);
    } catch (error) {
      console.error('Error logging medication:', error);
      alert('Failed to log medication');
    } finally {
      setTakingMed(false);
    }
  };

  return (
    <div className={`border-2 rounded-xl p-5 ${
      isOverdue ? 'border-red-400 bg-red-50' : 'border-blue-200 bg-blue-50'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            {medication.name}
          </h3>
          <p className="text-gray-600">{medication.dosage}</p>
          <p className="text-sm text-gray-500">
            Every {medication.intervalHours} hours
          </p>
        </div>
        {isOverdue && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            DUE NOW
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className={`text-3xl font-bold ${
          isOverdue ? 'text-red-600' : 'text-blue-600'
        }`}>
          {timeRemaining}
        </div>
        {nextDoseTime && !isOverdue && (
          <div className="text-sm text-gray-600 mt-1">
            Next dose at {nextDoseTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        )}
      </div>

      {showPainInput && (
        <div className="mb-4 bg-white p-3 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pain Level (1-10)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="10"
              value={painLevel}
              onChange={(e) => setPainLevel(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-2xl font-bold text-gray-800 w-10">
              {painLevel}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleTakeMedication}
          disabled={takingMed}
          className={`flex-1 py-3 rounded-lg font-bold text-white text-lg transition-all ${
            isOverdue
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
        >
          {takingMed ? 'Logging...' : '✓ Take Now'}
        </button>
        <button
          onClick={() => setShowPainInput(!showPainInput)}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-all active:scale-95"
        >
          {showPainInput ? 'Hide' : 'Pain'}
        </button>
      </div>
    </div>
  );
};
