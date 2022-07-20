import MyAlgoConnect from '@randlabs/myalgo-connect';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal/dist/umd/index.min";
// import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Algolib from '../index';
import Options from '../utils/options';
import Storage from '../utils/storage';
import { windowIsDefined } from '../helpers/isDefined';

export type ClientModule = typeof Client;
export type ConnectorStrings = 'MYALGO' | 'PERA' | 'MNEMONIC';

//
// Client class
// ----------------------------------------------
export default class Client {
  protected options: Options;
  protected storage: Storage;
  protected connector?: any = undefined; 
  protected connected?: ConnectorStrings = undefined;
  protected addresses: string[] = [];
  public sign;

  constructor(forwarded: Algolib) {
    this.options = forwarded.options;
    this.storage = forwarded.storage;
    if (this.options.persistConnection) this.loadPersisted();
  }


  //
  // MYALGO
  // ----------------------------------------------
  setMyAlgoClient() {
    this.connected = 'MYALGO'; 
    this.connector = new MyAlgoConnect();
    this.sign = this.connector.signTransaction;
  }
  async connectMyAlgo() {
    if (!windowIsDefined()) return;
    this.setMyAlgoClient();
    try {
      const accounts = await this.connector.connect({shouldSelectOneAccount: true});
      this.addresses = accounts.map(account => account.address);
      if (this.options.persistConnection) this.persist();
    } 
    catch (err) {
      console.error(err);
      this.disconnect();
    }
    return this.addresses;
  }


  //
  // PERA
  // ----------------------------------------------
  setPeraClient() {
    this.connected = 'PERA'; 
    this.connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: QRCodeModal.default,
    });
    this.sign = this.connector.sendCustomRequest;
  }
  async connectPera() {
    if (!windowIsDefined()) return;
    return new Promise(async (resolve) => {
      this.setPeraClient();
      try {
        if (!this.connector.connector) {
          await this.connector.createSession();
        }
        this.connector.on("connect", (error, payload) => {
          if (error) throw error;
          this.addresses = payload.params[0].accounts;
          if (this.options.persistConnection) this.persist();
          resolve(this.addresses);
        });
        this.connector.on("session_update", (error, payload) => {
          if (error)  throw error;
          this.addresses = payload.params[0].accounts;
          if (this.options.persistConnection) this.persist();
          resolve(this.addresses);
        });
        this.connector.on("disconnect", (error, payload) => {
          if (error)  throw error;
        });
      } 
      catch (err) {
        this.disconnect();
        resolve(this.addresses);
      }
    });
  }
  
  
  //
  // disconnect
  // ----------------------------------------------
  disconnect() {
    if (this.connected === 'PERA') {
      this.connector.killSession();
    }
    this.connected = undefined;
    this.connector = undefined;
    this.addresses = [];
    this.sign = undefined;
    if (this.options.persistConnection) this.persist();
  }

  //
  // Persist connection
  // ----------------------------------------------
  persist() {
    this.storage.set('connect', {
      connector: this.connected,
      addresses: this.addresses,
    });
  }
  loadPersisted() {
    const persisted = this.storage.get('client');
    if (!persisted || !persisted.connector) return;
    if (persisted.connector === 'MYALGO') this.setMyAlgoClient();
    if (persisted.connector === 'PERA') this.setPeraClient();
    if (persisted.addresses) this.addresses = persisted.addresses;
  }
}

