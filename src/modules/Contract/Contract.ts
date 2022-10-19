
import type { Programs } from './types.js';
import AlgoStack from '../../index.js';
import Options from '../../utils/options.js';
import Txns from '../Txns/Txns.js';
import Client from '../Client/Client.js';

/**
 * Contract class
 * ==================================================
 */
export default class Contract {
  protected options: Options;
  protected txns: Txns;
  protected client: Client;

  constructor(forwarded: AlgoStack) {
    this.options = forwarded.options;
    this.txns = forwarded.txns;
    this.client = forwarded.client;
  }


  /**
  * Compile teal
  * ==================================================
  */
  public async compileTeal(teal: string) {
    try {
      const encoder = new TextEncoder();
      const programBytes = encoder.encode(teal);
      const compileResponse = await this.txns.algod.compile(programBytes).do();
      const compiledBytes = new Uint8Array(Buffer.from(compileResponse.result, "base64"));
      return compiledBytes;
    } catch (err) {
      console.error(err);
    }
  }


  /**
  * Deploy teal code
  * ==================================================
  */
  public async deployTeal(programs: Programs) {
    const [approval, clear] = await Promise.all([
      this.compileTeal(programs.approval),
      this.compileTeal(programs.clear),
    ])
    const response = await this.txns.sendTxn({
      type: 'appl',
      from: this.client.addresses[0],
      appApprovalProgram: approval,
      appClearProgram: clear,
      appOnComplete: 0,
    });
    return response;
  }

}

