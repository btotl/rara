import React, { useState } from 'react';
import { User, UrgencyLevel } from '../types';
import { helpRequestService } from '../services/helpRequestService';

interface Props {
  helpers: User[];
  patientId: string;
}

const urgencyLevels: { level: UrgencyLevel; label: string; emoji: string; color: string }[] = [
  { level: 'emergency', label: 'Emergency', emoji: '🆘', color: 'bg-emergency' },
  { level: 'high', label: 'High', emoji: '🔴', color: 'bg-high' },
  { level: 'medium', label: 'Medium', emoji: '🟡', color: 'bg-medium' },
  { level: 'low', label: 'Low', emoji: '🟢', color: 'bg-low' },
];

const quickMessages = [
  "Can't reach my medication",
  "Need help getting up",
  "In pain, need assistance",
  "Need water",
  "Need to use bathroom",
  "Just checking in / want company",
];

export const HelpRequestPanel: React.FC<Props> = ({ helpers, patientId }) => {
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [message, setMessage] = useState('');
  const [selectedHelpers, setSelectedHelpers] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendRequest = async () => {
    if (!message.trim()) {
      alert('Please enter a message or select a quick message');
      return;
    }

    if (selectedHelpers.length === 0) {
      alert('Please select at least one helper');
      return;
    }

    setSending(true);
    setSuccess(false);

    try {
      await helpRequestService.sendHelpRequest(
        patientId,
        selectedHelpers,
        urgency,
        message,
        location || undefined
      );

      setSuccess(true);
      setMessage('');
      setLocation('');

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error sending help request:', error);
      alert(error.message || 'Failed to send help request');
    } finally {
      setSending(false);
    }
  };

  const toggleHelper = (helperId: string) => {
    setSelectedHelpers(prev =>
      prev.includes(helperId)
        ? prev.filter(id => id !== helperId)
        : [...prev, helperId]
    );
  };

  const selectAllHelpers = () => {
    setSelectedHelpers(helpers.map(h => h.id));
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Need Help?</h2>

      {/* Urgency Level */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgency Level
        </label>
        <div className="grid grid-cols-2 gap-2">
          {urgencyLevels.map(({ level, label, emoji, color }) => (
            <button
              key={level}
              onClick={() => setUrgency(level)}
              className={`p-3 rounded-lg font-medium transition-all ${
                urgency === level
                  ? `${color} text-white shadow-lg scale-105`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-xl mr-2">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Messages */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Messages
        </label>
        <div className="grid grid-cols-2 gap-2">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => setMessage(msg)}
              className={`p-2 text-sm rounded-lg transition-all ${
                message === msg
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Message */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          rows={3}
        />
      </div>

      {/* Location (Optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Where are you? (Optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Bedroom, Kitchen"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Select Helpers */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Send to
          </label>
          <button
            onClick={selectAllHelpers}
            className="text-sm text-primary hover:underline"
          >
            Select All
          </button>
        </div>
        {helpers.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            No helpers added yet. Ask family/friends to sign up as helpers.
          </div>
        ) : (
          <div className="space-y-2">
            {helpers.map((helper) => (
              <label
                key={helper.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  checked={selectedHelpers.includes(helper.id)}
                  onChange={() => toggleHelper(helper.id)}
                  className="mr-3 h-5 w-5 text-primary"
                />
                <div>
                  <div className="font-medium text-gray-800">{helper.name}</div>
                  <div className="text-sm text-gray-600">{helper.relationship}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          ✓ Help request sent successfully!
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSendRequest}
        disabled={sending || helpers.length === 0}
        className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-all ${
          urgency === 'emergency'
            ? 'btn-emergency'
            : urgency === 'high'
            ? 'btn-high'
            : urgency === 'medium'
            ? 'btn-medium'
            : 'btn-low'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
      >
        {sending ? 'Sending...' : '📞 Send Help Request'}
      </button>
    </div>
  );
};
