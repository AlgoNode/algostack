export declare type Modes = 'MAINNET' | 'TESTNET' | 'BETANET';
export declare type Cases = 'kebabcase' | 'snakecase' | 'camelcase' | 'none';
export interface OptionsProps {
    mode?: Modes;
    indexerAPI?: string;
    nodeAPI?: string;
    convertCase?: Cases;
}
export default class Options {
    mode: string;
    indexerAPI: string;
    nodeAPI: string;
    convertCase: string;
    constructor(userOptions?: OptionsProps);
}
