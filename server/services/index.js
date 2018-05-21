const HistoryService = require('./historyService');
const NotificationService = require('./notificationService');
const TaxonomyService = require('./taxonomyService');
const TorrentService = require('./torrentService');

const historyServices = new Map();
const notificationServices = new Map();
const taxonomyServices = new Map();
const torrentServices = new Map();
const allServiceMaps = [historyServices, notificationServices, taxonomyServices, torrentServices];

const getHistoryService = userId => {
  let historyService = historyServices.get(userId);
  if (!historyService) {
    historyService = new HistoryService(userId);
    historyServices.set(userId, historyService);
  }

  return historyService;
};

const getNotificationService = userId => {
  let notificationService = notificationServices.get(userId);
  if (!notificationService) {
    notificationService = new NotificationService(userId);
    notificationServices.set(userId, notificationService);
  }

  return notificationService;
};

const getTaxonomyService = userId => {
  let taxonomyService = taxonomyServices.get(userId);
  if (!taxonomyService) {
    taxonomyService = new TaxonomyService(userId);
    taxonomyServices.set(userId, taxonomyService);
  }

  return taxonomyService;
};

const getTorrentService = userId => {
  let torrentService = torrentServices.get(userId);
  if (!torrentService) {
    torrentService = new TorrentService(userId);
    torrentServices.set(userId, torrentService);
  }

  return torrentService;
};


const destroyUserServices = userId => {
  allServiceMaps.forEach(serviceMap => {
    const currentService = serviceMap.get(userId);

    if (currentService && currentService.destroy) {
      currentService.destroy();
    }

    serviceMap.delete(userId);
  });
};

module.exports = {
  destroyUserServices,
  getHistoryService,
  getNotificationService,
  getTaxonomyService,
  getTorrentService
};