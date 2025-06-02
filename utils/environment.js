// utils/environment.js
export const isWorker = () => {
  return (
    process.env.NODE_ENV === 'worker' || process.argv[1]?.includes('worker.js')
  );
};

export const isVercel = () => {
  return (
    process.env.VERCEL === '1' ||
    (process.env.NODE_ENV === 'production' && !isWorker())
  );
};

export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

export const getEnvironmentInfo = () => {
  return {
    isWorker: isWorker(),
    isVercel: isVercel(),
    isDevelopment: isDevelopment(),
    environment: process.env.NODE_ENV,
  };
};
