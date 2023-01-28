/**
 * Yes, I'm aware NodeJS has its own argument parser, and also am aware of the other libraries.
 * The entire point of this repo is me doing things in various languages from scratch - I would not write
 * everything from scratch in any real world scenario.
 */

/**
 * Parses an argument array
 * Assumes arguments are in form: arg_n=val_n
 * @param {} argv 
 */
function parseArgs(argv) {
    let parsedArgs = new Map();
    for (let argument of argv) {
        let i = 0;
        let leftAcc = "";
        let rightAcc = "";
        while (i < argument.length) {
            if (argument[i] === "=") {
                leftAcc = argument.slice(0, i);
                rightAcc = argument.slice(i + 1);
                parsedArgs.set(leftAcc, rightAcc);
                break;
            }
            i++;
        }
    }
    return parsedArgs;
}


export { parseArgs }

export default parseArgs;