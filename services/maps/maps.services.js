import axios from 'axios';

class MapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  async geocodeAddress(address) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/geocode/json`,
        {
          params: {
            address,
            key: this.apiKey
          }
        }
      );

      const { results } = response.data;
      if (results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        return { latitude: lat, longitude: lng };
      }
      throw new Error('No results found');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/place/details/json`,
        {
          params: {
            place_id: placeId,
            key: this.apiKey
          }
        }
      );
      return response.data.result;
    } catch (error) {
      console.error('Place details error:', error);
      throw error;
    }
  }
}
