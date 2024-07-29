import React from 'react';

const WelcomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">
          Welcome to
        </h1>
        <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500">
          Medlytics
        </h1>
        <p className="mt-4 text-xl text-white opacity-80">
          Empowering healthcare through data analytics
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;