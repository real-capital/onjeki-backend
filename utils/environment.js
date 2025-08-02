// // utils/environment.js
// export const isWorker = () => {
//   return (
//     process.env.NODE_ENV === 'worker' || process.argv[1]?.includes('worker.js')
//   );
// };

// export const isVercel = () => {
//   return (
//     process.env.VERCEL === '1' ||
//     (process.env.NODE_ENV === 'production' && !isWorker())
//   );
// };

// export const isDevelopment = () => {
//   return process.env.NODE_ENV === 'development';
// };

// export const getEnvironmentInfo = () => {
//   return {
//     isWorker: isWorker(),
//     isVercel: isVercel(),
//     isDevelopment: isDevelopment(),
//     environment: process.env.NODE_ENV,
//   };
// };


// utils/environment.js
export const isWorker = () => {
  return (
    process.env.NODE_ENV === 'worker' || 
    process.argv[1]?.includes('worker.js') ||
    process.env.RUN_WORKER === 'true'
  );
};

export const isVercel = () => {
  return (
    process.env.VERCEL === '1' ||
    process.env.VERCEL_ENV !== undefined
  );
};

export const isRender = () => {
  return (
    process.env.RENDER === 'true' || 
    process.env.RENDER_SERVICE_ID !== undefined
  );
};

export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

export const getEnvironmentInfo = () => {
  return {
    isWorker: isWorker(),
    isVercel: isVercel(),
    isRender: isRender(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    environment: process.env.NODE_ENV,
    platform: isVercel() ? 'Vercel' : isRender() ? 'Render' : 'Local/Other'
  };
};