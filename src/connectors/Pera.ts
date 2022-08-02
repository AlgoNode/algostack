
import algosdk, { Transaction } from 'algosdk';
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import BaseConnector from './Base';

export default class Pera extends BaseConnector {
  protected connector?: WalletConnect;
  constructor() {
    super();
    if (typeof window === 'undefined') return;
    this.connector = new WalletConnect({
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: QRCodeModal,
    });
  }

  //
  // Connect account
  // ----------------------------------------------
  public connect = (): Promise<string[]|false> => {
    return new Promise(async (resolve) => {
      if (!this.connector) {
        resolve(false);
        return;
      }
      try {
        if (this.connector.connected) {
          this.connector.killSession();
        }

        await this.connector.createSession();

        this.connector.on("connect", (error, payload) => {
          if (error) throw error;
          const addresses = payload.params[0].accounts;
          resolve(addresses);
        });
        this.connector.on("session_update", (error, payload) => {
          if (error)  throw error;
          const addresses = payload.params[0].accounts;
          resolve(addresses);
        });
        this.connector.on("disconnect", (error, payload) => {
          if (error)  throw error;
        });
      } 
      catch (err) {
        console.error(err);
        resolve(false);
      }
    });
  }

  //
  // Sign transaction(s)
  // ----------------------------------------------
  public async sign(txns: Transaction[]): Promise<Uint8Array[]|false> { 
    if (!this.connector) return false;
    const encoded = txns.map(txn => ({
      txn: Buffer
        .from(algosdk.encodeUnsignedTransaction(txn))
        .toString("base64"),
    }));
    const request = formatJsonRpcRequest("algo_signTxn", [encoded]);
    try {
      const result = await this.connector.sendCustomRequest(request);
      const signedBytes = result.map(arr => Uint8Array.from(arr));
      return signedBytes;
    } catch(err) {
      console.log(err);
      return false;
    }
  };

  //
  // Disconnect
  // ----------------------------------------------
  disconnect() {
    if (!this.connector) return;
    this.connector.killSession();
  }
}