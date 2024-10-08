import type { ConnectionSettings } from '@randlabs/myalgo-connect';
import type AlgoStack from '../../index';
import { Connector } from '../../enums.js';
import { BaseModule } from '../_baseModule.js';
import { ClientConfigs } from './types.js';
import Storage from '../../utils/storage.js';
import MyAlgo from '../../connectors/myalgo.js';
import Pera from '../../connectors/pera.js';
import Defly from '../../connectors/defly.js';
import Mnemonic from '../../connectors/mnemonic.js';
import merge from 'lodash-es/merge.js';


/**
 * Client class
 * ==================================================
 */
export default class Client extends BaseModule {
  protected configs: ClientConfigs = {};
  protected storage: Storage;
  private _connector?: MyAlgo | Pera | Defly | Mnemonic | undefined = undefined; 
  private _connected?: Connector = undefined;
  private _addresses: string[] = [];

  constructor(configs: ClientConfigs) {
    super();
    this.setConfigs(configs);
  }

  public setConfigs(configs: ClientConfigs) {
    this.configs = merge({
      namespace: 'algostack',
      persistConnection: true,
    }, this.configs, configs); 
    this.storage = new Storage(this.configs.namespace)
    this.optionallyLoadPersisted();
  }
  
  public init(stack: AlgoStack) {
    super.init(stack);
    if (this.configs.mnemonic) this.connectMnemonic(this.configs.mnemonic);
    return this;
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
  // Connect
  // ----------------------------------------------
  public async connect(connector: Connector, options?: any) {
    if (!this.initiated) await this.waitForInit();
    this.useConnector(connector);
    
    if (!this._connector) return undefined;
    const addresses = await this._connector.connect(options);
    if (addresses) {
      this._addresses = addresses;
      this.optionallyPersist();
      return this._addresses;
    }
    else {
      await this.disconnect();
      return undefined;
    }
  }

  public async disconnect() {
    if (this._connector) await this._connector.disconnect();
    this._connected = undefined;
    this._connector = undefined;
    this._addresses = [];
    this.optionallyPersist();
  }

  //
  // Connectors
  // --------------------------------------------------
  private useConnector(connector: Connector) {
    if (connector === Connector.MYALGO) this.useMyAlgo();
    else if (connector === Connector.PERA) this.usePera();
    else if (connector === Connector.DEFLY) this.useDefly();
    else if (connector === Connector.MNEMONIC) this.useMnemonic();
  }

  //
  // Mnemonic
  // ----------------------------------------------
  public async connectMnemonic(mnemonic: string = '') {
    if (!this.initiated) await this.waitForInit();
    const connected = await this.connect(Connector.MNEMONIC, mnemonic);
    return connected;
  }
  public useMnemonic(mnemonic: string = '') {
    this._connected = Connector.MNEMONIC; 
    this._connector = new Mnemonic();
    return this._connector.ready;
  }

  //
  // MYALGO
  // ----------------------------------------------
  public async connectMyAlgo(options: Record<string, any> = {}) {
    if (!this.initiated) await this.waitForInit();
    const connected = await this.connect(Connector.MYALGO, options as ConnectionSettings);
    return connected;
  }
  private useMyAlgo() {
    this._connected = Connector.MYALGO; 
    this._connector = new MyAlgo();
  }


  //
  // PERA
  // ----------------------------------------------
  public async connectPera() {
    if (!this.initiated) await this.waitForInit();
    const connected = await this.connect(Connector.PERA);
    return connected;
  }
  private usePera() {
    this._connected = Connector.PERA; 
    this._connector = new Pera();
  }

  //
  // DEFLY
  // ----------------------------------------------
  public async connectDefly() {
    if (!this.initiated) await this.waitForInit();
    const connected = await this.connect(Connector.DEFLY);
    return connected;
  }
  private useDefly() {
    this._connected = Connector.DEFLY; 
    this._connector = new Defly();
  }
  

  

  //
  // Persist connection
  // ----------------------------------------------
  private optionallyPersist() {
    if (!this.configs.persistConnection) return;
    this.storage.set('client', {
      connected: this._connected,
      addresses: this._addresses,
    });
  }
  private optionallyLoadPersisted() {
    if (!this.configs.persistConnection) return;
    const persisted = this.storage.get('client');
    if (!persisted || !persisted.connected) return;
    if (persisted.addresses) this._addresses = persisted.addresses;
    this.useConnector(persisted.connected);
  }
}

