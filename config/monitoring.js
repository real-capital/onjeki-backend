// config/monitoring.js
import prometheus from 'prom-client';
import responseTime from 'response-time';

// Initialize metrics
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 3, 5]
});

const databaseOperationDuration = new prometheus.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

export const setupMonitoring = (app) => {
  // Response time monitoring
  app.use(responseTime((req, res, time) => {
    if (req?.route?.path) {
      httpRequestDurationMicroseconds
        .labels(req.method, req.route.path, res.statusCode)
        .observe(time / 1000); // Convert to seconds
    }
  }));

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  });

  // Database operation monitoring
  mongoose.set('debug', (collection, operation, ...args) => {
    const startTime = process.hrtime();
    
    const originalCallback = args[args.length - 1];
    args[args.length - 1] = (...cbArgs) => {
      const diff = process.hrtime(startTime);
      const duration = diff[0] + diff[1] / 1e9;
      
      databaseOperationDuration
        .labels(operation, collection)
        .observe(duration);
      
      originalCallback(...cbArgs);
    };
  });
};