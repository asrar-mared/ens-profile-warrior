import { logs } from 'named-logs';
import { hookup, factory as Logging } from 'named-logs-console';
// import ora from 'ora-cjs';
hookup();
export function setLogLevel(level) {
    Logging.level = level;
    if (Logging.level > 0) {
        Logging.enable();
    }
    else {
        Logging.disable();
    }
}
export const logger = logs('rocketh');
const loggerProgressIndicator = {
    start(msg) {
        if (msg) {
            console.log(msg);
        }
        return this;
    },
    stop() {
        return this;
    },
    succeed(msg) {
        if (msg) {
            console.log(msg);
        }
        return this;
    },
    fail(msg) {
        if (msg) {
            console.error(msg);
        }
        return this;
    },
};
const voidProgressIndicator = {
    start() {
        return this;
    },
    stop() {
        return this;
    },
    succeed() {
        return this;
    },
    fail() {
        return this;
    },
};
// export function spin(message: string): PartialOra {
// 	return Logging.level > 0 ? ora(message).start() : voidProgressIndicator;
// }
// let lastSpin = ora('rocketh');
let lastSpin = loggerProgressIndicator;
export function spin(message) {
    if (Logging.level > 0) {
        lastSpin = lastSpin.start(message);
        return lastSpin;
    }
    else {
        return voidProgressIndicator;
    }
}
export function log(message) {
    if (Logging.level > 0) {
        console.log(message);
    }
}
//# sourceMappingURL=logging.js.map