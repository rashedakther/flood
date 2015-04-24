var AppDispatcher = require('../dispatcher/AppDispatcher');
var EventEmitter = require('events').EventEmitter;
var TorrentConstants = require('../constants/TorrentConstants');
var UIConstants = require('../constants/UIConstants');
var assign = require('object-assign');

var _selectedTorrents = [];
var _torrentCount = 0;
var _torrentHeight = 53;
var _viewportHeight = 200;
var _minTorrentRendered = 0;
var _maxTorrentRendered = 10;
var _torrentRenderBuffer = 2;
var _spaceTop = 0;
var _spaceBottom = 0;

var UIStore = assign({}, EventEmitter.prototype, {

    getSelectedTorrents: function() {

        return _selectedTorrents;
    },

    getMinTorrentRendered: function() {

        return _minTorrentRendered;
    },

    getMaxTorrentRendered: function() {

        return _maxTorrentRendered;
    },

    getSpaceTop: function(hiddenTorrents) {

        return _spaceTop;
    },

    getSpaceBottom: function(hiddenTorrents) {

        return _spaceBottom;
    },

    emitSelectionChange: function() {
        this.emit(TorrentConstants.TORRENT_SELECTION_CHANGE);
    },

    emitViewportPaddingChange: function() {
        this.emit(UIConstants.TORRENT_LIST_PADDING_CHANGE);
    },

    addSelectionChangeListener: function(callback) {
        this.on(TorrentConstants.TORRENT_SELECTION_CHANGE, callback);
    },

    addViewportPaddingChangeListener: function(callback) {
        this.on(UIConstants.TORRENT_LIST_PADDING_CHANGE, callback);
    },

    removeSelectionChangeListener: function(callback) {
        this.removeListener(TorrentConstants.TORRENT_SELECTION_CHANGE, callback);
    },

    removeViewportPaddingChangeListener: function(callback) {
        this.removeListener(UIConstants.TORRENT_LIST_PADDING_CHANGE, callback);
    }

});

var dispatcherIndex = AppDispatcher.register(function(action) {

    var text;

    switch(action.actionType) {

        case TorrentConstants.TORRENT_CLICK:
            var hash = action.hash;
            var hashLocation = _selectedTorrents.indexOf(hash);
            var isSelected = hashLocation > -1;

            if (!event.metaKey && !event.shiftKey && !event.ctrlKey) {
                // if command, shift, and control are not pressed, clear other selected torrents
                _selectedTorrents = [hash];
            } else if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
                // if command or control are pressed, but shift is not, then see
                // if it's already selected. if so, remove it. if not, add it
                if (isSelected) {
                    _selectedTorrents.splice(hashLocation, 1);
                } else {
                    _selectedTorrents.push(hash);
                }
            }

            UIStore.emitSelectionChange();
            break;

        case UIConstants.TORRENT_LIST_SCROLL:
            setRenderLimit(event.target.scrollTop, action.torrentCount);
            UIStore.emitViewportPaddingChange();
            break;

        case UIConstants.TORRENT_LIST_VIEWPORT_RESIZE:
            setViewportHeight(action.viewportHeight);
            UIStore.emitViewportPaddingChange();
            break;

    }
});

var setViewportHeight = function(height) {
    _viewportHeight = height;
}

var getSpacer = function(torrents) {

    var spacerHeight = 0;

    if (torrents > 0) {
        spacerHeight = torrents * _torrentHeight;
    }

    return spacerHeight;
}

var setRenderLimit = function(scrollPosition, torrentCount) {

    var elementsInView = Math.floor(_viewportHeight / _torrentHeight);

    _minTorrentRendered = Math.floor(scrollPosition / _torrentHeight) - _torrentRenderBuffer;
    _maxTorrentRendered = _minTorrentRendered + elementsInView + (_torrentRenderBuffer * 2);

    console.log(_minTorrentRendered, _maxTorrentRendered);

    _spaceTop = getSpacer(_minTorrentRendered);
    _spaceBottom = getSpacer(torrentCount - 1 - _maxTorrentRendered);
}

module.exports = UIStore;
