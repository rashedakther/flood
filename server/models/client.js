'use strict';

const fs = require('fs');
const path = require('path');
const series = require('run-series');
const tar = require('tar-stream');

const ClientRequest = require('./ClientRequest');
const clientResponseUtil = require('../util/clientResponseUtil');
const clientSettingsMap = require('../../shared/constants/clientSettingsMap');
const settings = require('./settings');
const torrentFilePropsMap = require('../../shared/constants/torrentFilePropsMap');
const torrentPeerPropsMap = require('../../shared/constants/torrentPeerPropsMap');
const torrentStatusMap = require('../../shared/constants/torrentStatusMap');
const services = require('../services');
const torrentTrackerPropsMap = require('../../shared/constants/torrentTrackerPropsMap');

var client = {
  addFiles (user, req, callback) {
    let files = req.files;
    let path = req.body.destination;
    let isBasePath = req.body.isBasePath;
    let request = new ClientRequest(user);
    let start = req.body.start;
    let tags = req.body.tags;

    if (!Array.isArray(tags)) {
      tags = tags.split(',');
    }

    request.createDirectory({path});
    request.send();

    const torrentService = services.getTorrentService(user);

    // Each torrent is sent individually because rTorrent accepts a total
    // filesize of 524 kilobytes or less. This allows the user to send many
    // torrent files reliably.
    files.forEach((file, index) => {
      file.originalname = encodeURIComponent(file.originalname);

      let fileRequest = new ClientRequest(user);
      fileRequest.addFiles({files: file, path, isBasePath, start, tags});

      // Set the callback for only the last request.
      if (index === files.length - 1) {
        fileRequest.onComplete((response, error) => {
          torrentService.fetchTorrentList();
          callback(response, error);
        });
      }

      fileRequest.send();
    });

    settings.set(user, {id: 'startTorrentsOnLoad', data: start});
  },

  addUrls (user, data, callback) {
    let urls = data.urls;
    let path = data.destination;
    let isBasePath = data.isBasePath;
    let start = data.start;
    let tags = data.tags;
    let request = new ClientRequest(user);

    request.createDirectory({path});
    request.addURLs({urls, path, isBasePath, start, tags});
    request.onComplete(callback);
    request.send();

    settings.set(user, {id: 'startTorrentsOnLoad', data: start});
  },

  checkHash (user, hashes, callback) {
    let request = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);

    request.checkHash({hashes});
    request.onComplete((response, error) => {
      torrentService.fetchTorrentList();
      callback(response, error);
    });
    request.send();
  },

  downloadFiles (user, hash, fileString, res) {
    try {
      const torrentService = services.getTorrentService(user);
      const selectedTorrent = torrentService.getTorrent(hash);
      if (!selectedTorrent) return res.status(404).json({error: 'Torrent not found.'});

      this.getTorrentDetails(user, hash, (torrentDetails) => {
        if (!torrentDetails) return res.status(404).json({error: 'Torrent details not found'});

        let files;
        if (!fileString) {
          files = torrentDetails.fileTree.files.map((x, i) => `${i}`);
        } else {
          files = fileString.split(',');
        }

        const filePathsToDownload = this.findFilesByIndicies(
          files,
          torrentDetails.fileTree
        ).map((file) => {
          return path.join(selectedTorrent.directory, file.path);
        });

        if (filePathsToDownload.length === 1) {
          const file = filePathsToDownload[0];
          if (!fs.existsSync(file)) return res.status(404).json({error: 'File not found.'});

          res.attachment(path.basename(file));
          return res.download(file);
        }

        res.attachment(`${selectedTorrent.name}.tar`);

        const pack = tar.pack()
        pack.pipe(res);

        let tasks = filePathsToDownload.map((filePath) => {
          const filename = path.basename(filePath);

          return (next) => {
            fs.stat(filePath, (err, stats) => {
              if (err) return next(err);

              let stream = fs.createReadStream(filePath);
              let entry = pack.entry({
                name: filename,
                size: stats.size
              }, next);
              stream.pipe(entry);
            });
          }
        });

        series(tasks, (error) => {
          if (error) return res.status(500).json(error);

          pack.finalize();
        });
      });
    } catch (error) {
      res.status(500).json(error);
    }
  },

  findFilesByIndicies (indices, fileTree = {}) {
    const {directories, files = []} = fileTree;

    let selectedFiles = files.filter(file => {
      return indices.includes(`${file.index}`);
    });

    if (directories != null) {
      selectedFiles = selectedFiles.concat(Object.keys(directories).reduce(
        (accumulator, directory) => {
          return accumulator.concat(
            this.findFilesByIndicies(indices, directories[directory])
          );
        },
        []
      ));
    }

    return selectedFiles;
  },

  getSettings (user, options, callback) {
    let requestedSettingsKeys = [];
    let request = new ClientRequest(user);
    let response = {};

    let outboundTransformation = {
      throttleGlobalDownMax: (apiResponse) => {
        return Number(apiResponse) / 1024;
      },
      throttleGlobalUpMax: (apiResponse) => {
        return Number(apiResponse) / 1024;
      },
      piecesMemoryMax: (apiResponse) => {
        return Number(apiResponse) / (1024 * 1024);
      }
    };

    request.fetchSettings({
      options,
      setRequestedKeysArr: (requestedSettingsKeysArr) => {
        requestedSettingsKeys = requestedSettingsKeysArr;
      }
    });

    request.postProcess((data) => {
      if (!data) {
        return null;
      }

      data.forEach((datum, index) => {
        let value = datum[0];
        let settingsKey = clientSettingsMap[requestedSettingsKeys[index]];

        if (outboundTransformation[settingsKey]) {
          value = outboundTransformation[settingsKey](value);
        }

        response[settingsKey] = value;
      });

      return response;
    });
    request.onComplete(callback);
    request.send();
  },

  getTorrentDetails (user, hash, callback) {
    let request = new ClientRequest(user);

    request.getTorrentDetails({
      hash,
      fileProps: torrentFilePropsMap.methods,
      peerProps: torrentPeerPropsMap.methods,
      trackerProps: torrentTrackerPropsMap.methods
    });
    request.postProcess(clientResponseUtil.processTorrentDetails);
    request.onComplete(callback);
    request.send();
  },

  listMethods (user, method, args, callback) {
    let request = new ClientRequest(user);

    request.listMethods({method, args});
    request.onComplete(callback);
    request.send();
  },

  moveTorrents (user, data, callback) {
    let destinationPath = data.destination;
    let isBasePath = data.isBasePath;
    let hashes = data.hashes;
    let filenames = data.filenames;
    let moveFiles = data.moveFiles;
    let sourcePaths = data.sources;
    let mainRequest = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);
    const hashesToRestart = hashes.filter((hash) => {
      return !torrentService.getTorrent(hash).status.includes(torrentStatusMap.stopped);
    });

    let afterCheckHash;

    if (hashesToRestart.length) {
      afterCheckHash = () => {
        const startTorrentsRequest = new ClientRequest(user);
        startTorrentsRequest.startTorrents({hashes: hashesToRestart});
        startTorrentsRequest.onComplete(callback);
        startTorrentsRequest.send();
      };
    } else {
      afterCheckHash = callback;
    }

    const checkHash = () => {
      const checkHashRequest = new ClientRequest(user);
      checkHashRequest.checkHash(user, {hashes});
      checkHashRequest.onComplete(afterCheckHash);
      checkHashRequest.send();
    };

    const moveTorrents = () => {
      const moveTorrentsRequest = new ClientRequest(user);
      moveTorrentsRequest.onComplete(checkHash);
      moveTorrentsRequest.moveTorrents({
        filenames, sourcePaths, destinationPath
      });
    };

    let afterSetPath = checkHash;

    if (moveFiles) {
      afterSetPath = moveTorrents;
    }

    mainRequest.stopTorrents({hashes});
    mainRequest.setDownloadPath({hashes, path: destinationPath, isBasePath});
    mainRequest.onComplete(afterSetPath);
    mainRequest.send();
  },

  setFilePriority (user, hashes, data, callback) {
    // TODO Add support for multiple hashes.
    let fileIndices = data.fileIndices;
    let request = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);

    request.setFilePriority({hashes, fileIndices, priority: data.priority});
    request.onComplete((response, error) => {
      torrentService.fetchTorrentList();
      callback(response, error);
    });
    request.send();
  },

  setPriority (user, hashes, data, callback) {
    let request = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);

    request.setPriority({hashes, priority: data.priority});
    request.onComplete((response, error) => {
      torrentService.fetchTorrentList();
      callback(response, error);
    });
    request.send();
  },

  setSettings (user, payloads, callback) {
    let request = new ClientRequest(user);
    if (payloads.length === 0) return callback({});

    let inboundTransformation = {
      throttleGlobalDownMax: (userInput) => {
        return {
          id: userInput.id,
          data: Number(userInput.data) * 1024
        };
      },
      throttleGlobalUpMax: (userInput) => {
        return {
          id: userInput.id,
          data: Number(userInput.data) * 1024
        };
      },
      piecesMemoryMax: (userInput) => {
        return {
          id: userInput.id,
          data: (Number(userInput.data) * 1024 * 1024).toString()
        };
      }
    };

    let transformedPayloads = payloads.map((payload) => {
      if (inboundTransformation[payload.id]) {
        return inboundTransformation[payload.id](payload);
      }

      return payload;
    });

    request.setSettings({settings: transformedPayloads});
    request.onComplete(callback);
    request.send();
  },

  setSpeedLimits (user, data, callback) {
    let request = new ClientRequest(user);

    request.setThrottle({
      direction: data.direction,
      throttle: data.throttle
    });
    request.onComplete(callback);
    request.send();
  },

  setTaxonomy (user, data, callback) {
    let request = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);

    request.setTaxonomy(data);
    request.onComplete((response, error) => {
      // Fetch the latest torrent list to re-index the taxonomy.
      torrentService.fetchTorrentList();
      callback(response, error);
    });
    request.send();
  },

  stopTorrent (user, hashes, callback) {
    let request = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);

    request.stopTorrents({hashes});
    request.onComplete((response, error) => {
      torrentService.fetchTorrentList();
      callback(response, error);
    });
    request.send();
  },

  startTorrent (user, hashes, callback) {
    let request = new ClientRequest(user);

    const torrentService = services.getTorrentService(user);

    request.startTorrents({hashes});
    request.onComplete((response, error) => {
      torrentService.fetchTorrentList();
      callback(response, error);
    });
    request.send();
  }
};

module.exports = client;
