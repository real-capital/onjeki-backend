// config/i18n.js
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    ns: ['common', 'errors', 'emails'],
    defaultNS: 'common',
  });

export const i18nMiddleware = middleware.handle(i18next);

// locales/en/common.json
// {
//   "property": {
//     "notFound": "Property not found",
//     "created": "Property created successfully",
//     "updated": "Property updated successfully",
//     "deleted": "Property deleted successfully"
//   },
//   "booking": {
//     "confirmed": "Booking confirmed",
//     "cancelled": "Booking cancelled",
//     "notAvailable": "Property not available for selected dates"
//   }
// }

// locales/fr/common.json
// {
//   "property": {
//     "notFound": "Propriété non trouvée",
//     "created": "Propriété créée avec succès",
//     "updated": "Propriété mise à jour avec succès",
//     "deleted": "Propriété supprimée avec succès"
//   },
//   "booking": {
//     "confirmed": "Réservation confirmée",
//     "cancelled": "Réservation annulée",
//     "notAvailable": "Propriété non disponible pour les dates sélectionnées"
//   }
// }
