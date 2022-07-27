import algosdk, { Transaction } from 'algosdk';
import MyAlgoConnect from '@randlabs/myalgo-connect';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Algolib from '../index';
import Options from '../utils/options';
import Storage from '../utils/storage';
import { windowIsDefined } from '../helpers/isDefined';
import { encodeObj } from '../helpers/encoder';

export type ClientModule = typeof Client;
export type ConnectorStrings = 'MYALGO' | 'PERA' | 'MNEMONIC';

//
// Client class
// ----------------------------------------------
export default class Client {
  protected options: Options;
  protected storage: Storage;
  private _connector?: any = undefined; 
  private _connected?: ConnectorStrings = undefined;
  private _addresses: string[] = [];
  private _sign?: (...args: any) => any;

  constructor(forwarded: Algolib) {
    this.options = forwarded.options;
    this.storage = forwarded.storage;
    if (this.options.persistConnection) this.loadPersisted();
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
  get sign() {
    return this._sign;
  }
  //
  // MYALGO
  // ----------------------------------------------
  setMyAlgoClient() {
    this._connected = 'MYALGO'; 
    this._connector = new MyAlgoConnect();
    this._sign = this.signMyAlgo;
  }
  async connectMyAlgo() {
    if (!windowIsDefined()) return;
    this.setMyAlgoClient();
    try {
      const accounts = await this._connector.connect({shouldSelectOneAccount: true});
      this._addresses = accounts.map(account => account.address);
      if (this.options.persistConnection) this.persist();
    } 
    catch (err) {
      console.error(err);
      this.disconnect();
    }
    return this._addresses;
  }

  async signMyAlgo (txn: Transaction) {
    const txnBytes = txn.toByte();
    try {
      const result = await this._connector.signTransaction(txnBytes);
      const signedBytes = result.blob;
      return signedBytes;
    } catch(err) {
      console.log(err);
      return false;
    }
  }


  //
  // PERA
  // ----------------------------------------------
  setPeraClient() {
    this._connected = 'PERA'; 
    this._connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: QRCodeModal,
    });
    this._sign = this.signPera;
  }

  async connectPera() {
    if (!windowIsDefined()) return;
    return new Promise(async (resolve) => {
      this.setPeraClient();
      try {
        if (!this._connector.connector) {
          await this._connector.createSession();
        }
        this._connector.on("connect", (error, payload) => {
          if (error) throw error;
          this._addresses = payload.params[0].accounts;
          if (this.options.persistConnection) this.persist();
          resolve(this._addresses);
        });
        this._connector.on("session_update", (error, payload) => {
          if (error)  throw error;
          this._addresses = payload.params[0].accounts;
          if (this.options.persistConnection) this.persist();
          resolve(this._addresses);
        });
        this._connector.on("disconnect", (error, payload) => {
          if (error)  throw error;
        });
      } 
      catch (err) {
        this.disconnect();
        resolve(this._addresses);
      }
    });
  }

  async signPera(txn: Transaction) {
    if (this._connected !== 'PERA') return false;
    const encoded = [{
      txn: Buffer
        .from(algosdk.encodeUnsignedTransaction(txn))
        .toString("base64"),
        message: 'test',
    }];
    const request = formatJsonRpcRequest("algo_signTxn", [encoded]);
    try {
      const result = await this._connector.sendCustomRequest(request);
      const signedBytes = result.map(arr => Uint8Array.from(arr));
      return signedBytes;
    } catch(err) {
      console.log(err);
      return false;
    }
  }
  
  
  //
  // disconnect
  // ----------------------------------------------
  disconnect() {
    if (this._connected === 'PERA') {
      this._connector.killSession();
    }
    this._connected = undefined;
    this._connector = undefined;
    this._addresses = [];
    this._sign = undefined;
    if (this.options.persistConnection) this.persist();
  }

  //
  // Persist connection
  // ----------------------------------------------
  persist() {
    this.storage.set('client', {
      connected: this._connected,
      addresses: this._addresses,
    });
  }
  loadPersisted() {
    const persisted = this.storage.get('client');
    if (!persisted || !persisted.connected) return;
    if (persisted.connected === 'MYALGO') this.setMyAlgoClient();
    if (persisted.connected === 'PERA') this.setPeraClient();
    if (persisted.addresses) this._addresses = persisted.addresses;
  }
}

