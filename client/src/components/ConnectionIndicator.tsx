import React from 'react';
import { useWebSocketStore } from '../stores/websocketStore';

const ConnectionIndicator: React.FC = () => {
  const { connected, reconnecting, connectionQuality, latency } = useWebSocketStore();

  // Don't show anything if fully connected with good quality
  if (connected && !reconnecting && connectionQuality === 'good') {
    return null;
  }

  const getStatusColor = () => {
    if (!connected || reconnecting) return 'bg-red-500';
    if (connectionQuality === 'poor') return 'bg-yellow-500';
    if (connectionQuality === 'good') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (reconnecting) return 'Reconnecting...';
    if (!connected) return 'Disconnected';
    if (connectionQuality === 'poor') return `Slow Connection (${latency}ms)`;
    return 'Connected';
  };

  const getPulseAnimation = () => {
    if (reconnecting) return 'animate-pulse';
    return '';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm bg-gray-900/90 border border-gray-700 ${getPulseAnimation()}`}>
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-white font-medium">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default ConnectionIndicator;
