import {fn, set} from './app/module';

fn();

const arr = [1, 'dfgd', 654, {}];

console.log(arr.find((it) => typeof it === 'string'));
