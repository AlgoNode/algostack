import Options, { OptionsProps } from './modules/Options';
import Filters from './modules/Filters';
import Query from './modules/Query';
export default class Algolib {
    options: Options;
    filters: Filters;
    query: Query;
    constructor(userOptions?: OptionsProps);
}
