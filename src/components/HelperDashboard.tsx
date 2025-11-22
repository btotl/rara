import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { helpRequestService } from '../services/helpRequestService';
import { HelpRequest, RequestCooldown } from '../types';
import { formatDistanceToNow } from 'date-fns';

const urgencyColors = {
  emergency: 'bg-emergency border-emergency',
  high: 'bg-high border-high',
  medium: 'bg-medium border-medium',
  low: 'bg-low border-low',
};

const urgencyEmojis = {
  emergency: '🆘',
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

export const HelperDashboard: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [cooldownInfo, setCooldownInfo] = useState<RequestCooldown | null>(null);
  const [unavailableHours, setUnavailableHours] = useState(1);

  useEffect(() => {
    if (!userProfile) return;

    // Subscribe to help requests
    const unsubscribe = helpRequestService.subscribeToHelperRequests(
      userProfile.id,
      setRequests
    );

    // Load cooldown info
    loadCooldownInfo();

    return () => unsubscribe();
  }, [userProfile]);

  useEffect(() => {
    // Refresh cooldown info every minute
    const interval = setInterval(loadCooldownInfo, 60000);
    return () => clearInterval(interval);
  }, [userProfile]);

  const loadCooldownInfo = async () => {
    if (!userProfile) return;
    const info = await helpRequestService.getCooldownInfo(userProfile.id);
    setCooldownInfo(info);
  };

  const handleToggleAvailability = async () => {
    if (!userProfile) return;

    const newAvailability = !isAvailable;
    let unavailableUntil: Date | undefined;

    if (!newAvailability) {
      unavailableUntil = new Date();
      unavailableUntil.setHours(unavailableUntil.getHours() + unavailableHours);
    }

    await helpRequestService.setAvailability(
      userProfile.id,
      newAvailability,
      unavailableUntil
    );

    setIsAvailable(newAvailability);
  };

  const handleRespond = async (requestId: string, status: 'accepted' | 'completed') => {
    if (!userProfile) return;

    try {
      await helpRequestService.respondToRequest(requestId, userProfile.id, status);
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to respond to request');
    }
  };

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Hello, {userProfile.name}
              </h1>
              <p className="text-gray-600 text-sm">
                Helper Dashboard ({userProfile.relationship})
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-gray-600 hover:text-gray-800 px-4 py-2"
            >
              Sign Out
            </button>
          </div>

          {/* Availability Toggle */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAvailability}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  isAvailable ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isAvailable ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="font-medium text-gray-800">
                {isAvailable ? '✓ Available' : '✗ Unavailable'}
              </span>
            </div>

            {!isAvailable && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">For:</label>
                <select
                  value={unavailableHours}
                  onChange={(e) => setUnavailableHours(parseInt(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled={isAvailable}
                >
                  <option value={1}>1 hour</option>
                  <option value={2}>2 hours</option>
                  <option value={4}>4 hours</option>
                  <option value={8}>8 hours</option>
                </select>
              </div>
            )}
          </div>

          {/* Cooldown Status */}
          {cooldownInfo && cooldownInfo.isOnCooldown && cooldownInfo.cooldownUntil && (
            <div className="mt-4 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">☕</span>
                <div>
                  <div className="font-medium">You're on a break</div>
                  <div className="text-sm">
                    Available again in {formatDistanceToNow(cooldownInfo.cooldownUntil.toDate())}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Requests */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Help Requests
          </h2>

          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-lg">No pending requests</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`border-l-4 ${urgencyColors[request.urgency]} bg-white p-5 rounded-lg shadow-md`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{urgencyEmojis[request.urgency]}</span>
                      <div>
                        <div className="font-bold text-lg capitalize">
                          {request.urgency} Request
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                      urgencyColors[request.urgency].split(' ')[0]
                    }`}>
                      {request.urgency.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-lg text-gray-800 mb-2">
                      "{request.message}"
                    </div>
                    {request.location && (
                      <div className="text-sm text-gray-600">
                        📍 Location: {request.location}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(request.id, 'accepted')}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all active:scale-95"
                    >
                      ✓ On My Way
                    </button>
                    <button
                      onClick={() => handleRespond(request.id, 'completed')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-all active:scale-95"
                    >
                      ✓ Completed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
