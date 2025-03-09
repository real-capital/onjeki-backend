import { logger } from "../utils/logger.js";

class ServiceContainer {
    static instance = null;
  
    constructor() {
      if (ServiceContainer.instance) {
        return ServiceContainer.instance;
      }
      this.services = new Map();
      ServiceContainer.instance = this;
    }
  
    static getInstance() {
      if (!ServiceContainer.instance) {
        ServiceContainer.instance = new ServiceContainer();
      }
      return ServiceContainer.instance;
    }
  
    register(name, service) {
      this.services.set(name, service);
      logger.info(`Service registered: ${name}`);
    }
  
    get(name) {
      if (!this.services.has(name)) {
        logger.error(`Service not found: ${name}`);
        logger.debug(`Available services: ${Array.from(this.services.keys()).join(', ')}`);
        throw new Error(`Service ${name} not found`);
      }
      return this.services.get(name);
    }
  
    hasService(name) {
      return this.services.has(name);
    }
  
    listServices() {
      return Array.from(this.services.keys());
    }
  }
  
  export default ServiceContainer.getInstance();