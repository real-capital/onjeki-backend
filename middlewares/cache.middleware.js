export const cacheMiddleware = (duration = 3600) => {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
  
      const key = `cache:${req.originalUrl}`;
      const cachedResponse = await cacheService.get(key);
  
      if (cachedResponse) {
        return res.json(JSON.parse(cachedResponse));
      }
  
      res.originalJson = res.json;
      res.json = (body) => {
        cacheService.set(key, body, duration);
        res.originalJson(body);
      };
  
      next();
    };
  };