const Chalk = require('chalk');

class Log {
    static line(count = 1){
        for (var i = 0; i < count; i++) {
            console.log("");
        }
    }

    static info(message) {
        console.log(Chalk.black.bgBlueBright(' INFO '), Chalk.blueBright(message));
    }

    static success(message) {
        console.log(Chalk.black.bgGreenBright('  OK  '), Chalk.green(message));
    }

    static warning(message) {
        console.log(Chalk.black.bgYellow(' WARN '), Chalk.yellow(message));
    }

    static error(message) {
        console.log(Chalk.black.bgRedBright(' ERR  '), Chalk.red(message));
    }
}

module.exports = Log;