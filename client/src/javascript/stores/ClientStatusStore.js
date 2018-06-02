import ActionTypes from '../constants/ActionTypes';
import AppDispatcher from '../dispatcher/AppDispatcher';
import BaseStore from './BaseStore';
import ClientActions from '../actions/ClientActions';
import EventTypes from '../constants/EventTypes';

class ClientStatusStoreClass extends BaseStore {
  constructor() {
    super();
    this.errorCount = 0;
    this.isConnected = false;
  }

  initiateConnectionTest() {
    ClientActions.testConnection(); 
  }

  getIsConnected() {
    return this.isConnected;
  }

  handleConnectionTestError() {
    this.isConnected = false;
    this.emit(EventTypes.CLIENT_CONNECTION_STATUS_CHANGE);
  }

  handleConnectionTestSuccess() {
    if (!this.isConnected) {
      this.isConnected = true;
      this.emit(EventTypes.CLIENT_CONNECTION_STATUS_CHANGE);
    }
  }
}

const ClientStatusStore = new ClientStatusStoreClass();

ClientStatusStore.dispatcherID = AppDispatcher.register((payload) => {
  const { action } = payload;

  switch (action.type) {
    case ActionTypes.CLIENT_CONNECTION_TEST_ERROR:
      ClientStatusStore.handleConnectionTestError();
      break;
    case ActionTypes.CLIENT_CONNECTION_TEST_SUCCESS:
      ClientStatusStore.handleConnectionTestSuccess();
      break;
    default:
      break;
  }
});

ClientStatusStore.initiateConnectionTest();

export default ClientStatusStore;
