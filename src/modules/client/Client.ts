import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import Storage from '../../utils/storage.js';
import MyAlgo from '../../connectors/MyAlgo.js';
import Pera from '../../connectors/Pera.js';
import { ConnectorStrings } from './types.js';

/**
 * Client class
 * ==================================================
 */
export default class Client {
  protected options: Options;
  protected storage: Storage;
  private _connector?: MyAlgo | Pera | undefined = undefined; 
  private _connected?: ConnectorStrings = undefined;
  private _addresses: string[] = [];

  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.storage = forwarded.storage;
    this.optionallyLoadPersisted();
  }

  //
  // Accessors (readonly outside of class)
  // ----------------------------------------------
  get connector() {
    return this._connector;
  }
  get connected() {
    return this._connected;
  }
  get addresses() {
    return this._addresses;
  }


  //
  // MYALGO
  // ----------------------------------------------
  public async connectMyAlgo() {
    this.useMyAlgo();
    const connected = await this.connect();
    return connected;
  }
  private useMyAlgo() {
    this._connected = 'MYALGO'; 
    this._connector = new MyAlgo();
  }


  //
  // PERA
  // ----------------------------------------------
  public async connectPera() {
    this.usePera();
    const connected = await this.connect();
    return connected;
  }
  private usePera() {
    this._connected = 'PERA'; 
    this._connector = new Pera();
  }
  

  //
  // Connect
  // ----------------------------------------------
  private async connect() {
    if (!this._connector) return false;
    const addresses = await this._connector.connect();
    if (addresses) {
      this._addresses = addresses;
      this.optionallyPersist();
      return this._addresses;
    }
    else {
      this.disconnect();
      return false;
    }
  }


  //
  // disconnect
  // ----------------------------------------------
  public disconnect() {
    if (this._connector) this._connector.disconnect();
    this._connected = undefined;
    this._connector = undefined;
    this._addresses = [];
    this.optionallyPersist();
  }


  //
  // Persist connection
  // ----------------------------------------------
  private optionallyPersist() {
    if (!this.options.persistConnection) return;
    this.storage.set('client', {
      connected: this._connected,
      addresses: this._addresses,
    });
  }
  private optionallyLoadPersisted() {
    if (!this.options.persistConnection) return;
    const persisted = this.storage.get('client');
    if (!persisted || !persisted.connected) return;
    if (persisted.connected === 'MYALGO') this.useMyAlgo();
    if (persisted.connected === 'PERA') this.usePera();
    if (persisted.addresses) this._addresses = persisted.addresses;
  }
}

