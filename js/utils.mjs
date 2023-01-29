/**
 * Yes, I'm aware NodeJS has its own argument parser, and also am aware of the other libraries.
 * The entire point of this repo is me doing things in various languages from scratch - I would not write
 * everything from scratch in any real world scenario.
 */

const TYPES = {
    'bool': (s) => {
        if (typeof s === 'string') {
            switch (s.toLowerCase()) {
                case "true": return true;
                case "false": return false;
                default: console.error(`ERROR: argument should be bool but it is ${s}`)
            }
        }
    },
    'int': (s) => {
        let maybeInt = parseInt(s);
        if (Number.isNaN(maybeInt)) console.error(`ERROR: not passed an int, was ${s}`);
        return maybeInt;
    }
}


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
            if (argument[i] === "=" && i === 0) break;
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


/**
 * Validates the types of the args.
 * @param {*} parsedArgs 
 * @param {*} argOptions 
 */
function typedArgs(parsedArgs, argOptions) {
    parsedArgs.forEach((val, key) => {
        parsedArgs.set(key, TYPES[argOptions.get(key).type](val))
    });
    return parsedArgs;
}


/**
 * Inspired by Python's argparse module
 * @param {} param0 
 */
function ArgumentParser({ prog, description, epilog }) {

    let args_options = new Map();

    function add_argument({ name, description, required, type }) {
        args_options.set(name, { name, description, required, type })
    }

    function print_arguments() {
        console.log(args_options);
    }

    function display_help() {
        console.log(`usage: ${process.argv[1]} ${Array.from(args_options).map(v => v.required ? v.name + '=<value>' : '[' + v.name + '=<value>]')}`)
    }

    function parse_args(overrideArgs) {
        let parsedArgs = parseArgs(overrideArgs || process.argv);
        if (parsedArgs.has("--help")) {
            display_help();
            process.exit(0);
        }
        if (Array.from(args_options).map(v => v[1]).filter(val => val.required).every((val) => parsedArgs.has(val.name))) {
            return typedArgs(parsedArgs, args_options);
        }
        console.error(`ERROR: missing the following required arguments: ${args_options.filter(val => val.required && !parsedArgs.has(val.name)).map(v => ' ' + v.name)}`);
        process.exit(1);
    }

    return {
        add_argument,
        print_arguments,
        parse_args
    }
}

export { ArgumentParser, parseArgs }

export default ArgumentParser;