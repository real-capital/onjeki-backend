// utils/error-tracking.js
import * as Sentry from '@sentry/node';

export const trackError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
};