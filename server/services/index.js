const FeedService = require('./feedService');
const HistoryService = require('./historyService');
const NotificationService = require('./notificationService');
const TaxonomyService = require('./taxonomyService');
const TorrentService = require('./torrentService');

const feedServices = new Map();
const historyServices = new Map();
const notificationServices = new Map();
const taxonomyServices = new Map();
const torrentServices = new Map();
const allServiceMaps = [
  feedServices,
  historyServices,
  notificationServices,
  taxonomyServices,
  torrentServices
];

const getService = ({servicesMap, service, user}) => {
  let serviceInstance = servicesMap.get(user._id);
  if (!serviceInstance) {
    serviceInstance = new service(user);
    servicesMap.set(user._id, serviceInstance);
  }

  return serviceInstance;
};

const getFeedService = user => {
  return getService({servicesMap: feedServices, service: FeedService, user});
};

const getHistoryService = user => {
  return getService({servicesMap: historyServices, service: HistoryService, user});
};

const getNotificationService = user => {
  return getService({servicesMap: notificationServices, service: NotificationService, user});
};

const getTaxonomyService = user => {
  return getService({servicesMap: taxonomyServices, service: TaxonomyService, user});
};

const getTorrentService = user => {
  return getService({servicesMap: torrentServices, service: TorrentService, user});
};

const destroyUserServices = user => {
  allServiceMaps.forEach(serviceMap => {
    const currentService = serviceMap.get(user._id);

    if (currentService && currentService.destroy) {
      currentService.destroy();
    }

    serviceMap.delete(user._id);
  });
};

const getAllServices = user => {
  return {
    get feedService() {
      return getFeedService(user);
    },

    get historyService() {
      return getHistoryService(user);
    },

    get notificationService() {
      return getNotificationService(user);
    },

    get taxonomyService() {
      return getTaxonomyService(user);
    },

    get torrentService() {
      return getTorrentService(user);
    }
  };
};

module.exports = {
  destroyUserServices,
  getAllServices,
  getHistoryService,
  getNotificationService,
  getTaxonomyService,
  getTorrentService
};