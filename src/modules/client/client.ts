import type { ConnectionSettings } from '@randlabs/myalgo-connect';
import AlgoStack, { Connectors } from '../../index.js';
import options from '../../utils/options.js';
import Storage from '../../utils/storage.js';
import MyAlgo from '../../connectors/myalgo.js';
import Pera from '../../connectors/pera.js';
import Defly from '../../connectors/defly.js';
import Mnemonic from '../../connectors/mnemonic.js';

/**
 * Client class
 * ==================================================
 */
export default class Client {
  protected storage: Storage;
  private _connector?: MyAlgo | Pera | Defly | Mnemonic | undefined = undefined; 
  private _connected?: Connectors = undefined;
  private _addresses: string[] = [];

  constructor(forwarded: AlgoStack) {
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
  // Mnemonic
  // ----------------------------------------------
  public connectMnemonic(mnemonic: string = '') {
    this._connected = Connectors.MNEMONIC; 
    this._connector = new Mnemonic(mnemonic);
    return this._connector.ready;
  }

  //
  // MYALGO
  // ----------------------------------------------
  public async connectMyAlgo(options: ConnectionSettings = {}) {
    this.useMyAlgo();
    const connected = await this.connect(options);
    return connected;
  }
  private useMyAlgo() {
    this._connected = Connectors.MYALGO; 
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
    this._connected = Connectors.PERA; 
    this._connector = new Pera();
  }

  //
  // DEFLY
  // ----------------------------------------------
  public async connectDefly() {
    this.useDefly();
    const connected = await this.connect();
    return connected;
  }
  private useDefly() {
    this._connected = Connectors.DEFLY; 
    this._connector = new Defly();
  }
  

  //
  // Connect
  // ----------------------------------------------
  private async connect(options?: ConnectionSettings) {
    if (!this._connector) return undefined;
    const addresses = await this._connector.connect(options);
    if (addresses) {
      this._addresses = addresses;
      this.optionallyPersist();
      return this._addresses;
    }
    else {
      this.disconnect();
      return undefined;
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
    if (!options.persistConnection) return;
    this.storage.set('client', {
      connected: this._connected,
      addresses: this._addresses,
    });
  }
  private optionallyLoadPersisted() {
    if (!options.persistConnection) return;
    const persisted = this.storage.get('client');
    if (!persisted || !persisted.connected) return;
    if (persisted.connected === Connectors.MYALGO) this.useMyAlgo();
    if (persisted.connected === Connectors.PERA) this.usePera();
    if (persisted.connected === Connectors.DEFLY) this.useDefly();
    if (persisted.addresses) this._addresses = persisted.addresses;
  }
}

