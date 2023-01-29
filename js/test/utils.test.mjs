import fc from 'fast-check';
import { ArgumentParser } from '../utils.mjs';

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
