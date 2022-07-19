import MyAlgoConnect from '@randlabs/myalgo-connect';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal/dist/umd/index.min";
// import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import Algolib from '../index';
import Options from './Options';


export type Connectors = 'myalgo' | 'pera' | 'mnemonic';

//
// Connector class
// ----------------------------------------------
export default class Connector {
  protected options: Options;
  protected client?: any = undefined; 
  protected connected?: Connectors = undefined;
  protected addresses: string[] = [];

  public sign;

  constructor(forwarded: Algolib) {
    this.options = forwarded.options;
  }


  //
  // MYALGO
  // ----------------------------------------------
  async myalgo() {
    if (typeof window === 'undefined') {
      console.warn('MyAlgoConnect can only be used on a browser.');
      return false;
    }
    try {
      this.connected = 'myalgo'; 
      this.client = new MyAlgoConnect();
      const accounts = await this.client.connect({shouldSelectOneAccount: true});
      this.addresses = accounts.map(account => account.address);
      this.sign = this.client.signTransaction;
    } 
    catch (err) {
      console.warn(err);
      this.disconnect();
    }
    return this.addresses;
  }


  //
  // PERA
  // ----------------------------------------------
  async pera() {
    return new Promise(async (resolve) => {
      try {
        this.connected = 'pera'; 
        this.client = new WalletConnect({
          bridge: "https://bridge.walletconnect.org",
          qrcodeModal: QRCodeModal.default,
        });
        this.sign = this.client.sendCustomRequest;

        if (!this.client.connected) {
          await this.client.createSession();
        }

        this.client.on("connect", (error, payload) => {
          if (error) throw error;
          this.addresses = payload.params[0];
          resolve(this.addresses);
        });

        this.client.on("session_update", (error, payload) => {
          if (error)  throw error;
          this.addresses = payload.params[0];
          this.sign = this.client.sendCustomRequest;
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
    if (this.connected === 'pera') {
      this.client.killSession();
    }
    this.connected = undefined;
    this.client = undefined;
    this.addresses = [];
    this.sign = undefined;
  }
}

