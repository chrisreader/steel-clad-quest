
import React, { useState } from 'react';
import { KnightGame } from '../components/Game/KnightGame';

const Index: React.FC = () => {
  const [isGameLoading, setIsGameLoading] = useState<boolean>(true);

  const handleGameLoadingComplete = () => {
    setIsGameLoading(false);
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      {isGameLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Knight's Quest</h1>
            <p className="mb-6">Loading game resources...</p>
            <div className="w-64 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse rounded-full w-3/4"></div>
            </div>
          </div>
        </div>
      )}
      <KnightGame onLoadingComplete={handleGameLoadingComplete} />
    </div>
  );
};

export default Index;
