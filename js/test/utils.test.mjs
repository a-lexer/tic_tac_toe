import fc from 'fast-check';
import { ArgumentParser, TYPES } from '../utils.mjs';

// code under test
let argParser = ArgumentParser({ prog: 'Tic-Tac-Toe', description: 'A 2 player Tic-Tac-Toe terminal app over web sockets', epilog: '_' })

// Properties
describe('argument parsing', () => {
  // string text always contains itself
  it('when parsed should always contain the key and value either side of the first equals sign', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
      argParser.add_argument({ name: a, description: 'an argument', required: false })
      let parsedArgs = argParser.parse_args([`${a}=${b}`]);
      if (a === '') return true;
      return (parsedArgs.has(a) && (parsedArgs.get(a) === b));
    }));
  });
});


describe('float argument type parsing', () => {
  // string text always contains itself
  it('when parsed should have the correct float type and not throw an error', () => {
    fc.assert(fc.property(fc.float(), (a) => {
      let floatString = a.toString();
      // will throw if an error
      TYPES['float'](floatString);
      return true;
    }));
  });
});