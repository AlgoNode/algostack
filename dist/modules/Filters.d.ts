import Algolib from '../index';
import Options, { Cases } from './Options';
export interface FiltersProps {
    [key: string]: string | number | boolean | undefined;
}
export default class Filters {
    protected options: Options;
    constructor(forwarded: Algolib);
    convertCase(obj: Object, toCase?: Cases): any;
    convertCaseOut: (obj: Object, toCase?: Cases) => any;
    convertCaseIn(obj: Object): any;
    stringifyValues(params: object): {
        [k: string]: string;
    };
}
