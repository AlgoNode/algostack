import MyAlgoConnect from '@randlabs/myalgo-connect';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal/dist/umd/index.min";
// import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Algolib from '../index';
import Options from './Options';
import Storage from './Storage';
import { windowIsDefined } from '../helpers/isDefined';


export type Connectors = 'myalgo' | 'pera' | 'mnemonic';

//
// Connector class
// ----------------------------------------------
export default class Connector {
  protected options: Options;
  protected storage: Storage;
  protected client?: any = undefined; 
  protected currentClient?: Connectors = undefined;
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
  setMyalgoClient() {
    this.currentClient = 'myalgo'; 
    this.client = new MyAlgoConnect();
    this.sign = this.client.signTransaction;
  }
  async myalgo() {
    if (!windowIsDefined()) return;
    this.setMyalgoClient();
    try {
      const accounts = await this.client.connect({shouldSelectOneAccount: true});
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
    this.currentClient = 'pera'; 
    this.client = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: QRCodeModal.default,
    });
    this.sign = this.client.sendCustomRequest;
  }
  async pera() {
    if (!windowIsDefined()) return;
    return new Promise(async (resolve) => {
      this.setPeraClient();
      try {
        if (!this.client.currentClient) {
          await this.client.createSession();
        }
        this.client.on("connect", (error, payload) => {
          if (error) throw error;
          this.addresses = payload.params[0].accounts;
          if (this.options.persistConnection) this.persist();
          resolve(this.addresses);
        });
        this.client.on("session_update", (error, payload) => {
          if (error)  throw error;
          this.addresses = payload.params[0].accounts;
          if (this.options.persistConnection) this.persist();
          resolve(this.addresses);
        });
        this.client.on("disconnect", (error, payload) => {
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
    if (this.currentClient === 'pera') {
      this.client.killSession();
    }
    this.currentClient = undefined;
    this.client = undefined;
    this.addresses = [];
    this.sign = undefined;
    if (this.options.persistConnection) this.persist();
  }

  //
  // Persist connection
  // ----------------------------------------------
  persist() {
    this.storage.set('connection', {
      currentClient: this.currentClient,
      addresses: this.addresses,
    });
  }
  loadPersisted() {
    const connection = this.storage.get('connection');
    if (!connection.currentClient) return;
    if (connection.currentClient === 'myalgo') this.setMyalgoClient();
    if (connection.currentClient === 'pera') this.setPeraClient();
    if (connection.addresses) this.addresses = connection.addresses;
  }
}

