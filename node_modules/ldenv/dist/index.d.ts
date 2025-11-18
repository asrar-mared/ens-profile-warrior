/**
 * This module exposes a single function as default export
 *
 * @module dotenv-set
 */
/**
 * Configuration Options
 */
type Config = {
    /** The mode will specify which file to load.
     * by default it will only load `.env` and `.env.local` with `.env.local` taking priority.
     *
     * If a specific mode is provided, it will load them in this order (latter one override the earlier ones):
     * - `.env`
     * - `.env.local`
     * - `.env.<mode>`
     * - `.env.<mode>.local`
     *
     * @remarks if `mode === 'local'` then it will just load `.env` and `env.local`
     */
    mode?: string;
    /** This let you specify the default mode if no mode are specified explicitly.
     * By default it is 'local' */
    defaultMode?: string;
    /** This let you specify a specific folder to load the .env file from.
     * By default it use the current directory */
    folder?: string;
    /** This let you specify the env variable it uses to detect the mode, if not specified in the options.
     * By default it take the mode from the env variable 'MODE'
     * It can also be a list of string and it will take the first one that is defined
     */
    useModeEnv?: string | string[];
    defaultEnvFile?: string;
};
/**
 * Uses [dotenv](https://github.com/motdotla/dotenv) and [dotenv-expand](https://github.com/motdotla/dotenv-expand) to load additional environment variables from the following files in your environment directory:
 *
 * ```
 * .env                # loaded in all cases
 * .env.local          # loaded in all cases, ignored by git
 * .env.[mode]         # only loaded in specified mode
 * .env.[mode].local   # only loaded in specified mode, ignored by git
 * ```
 *
 * @example
 * ```ts
 * import {loadEnv} from 'ldenv';
 * loadEnv();
 * ```
 * @example
 * ```ts
 * import {loadEnv} from 'ldenv';
 * loadEnv({mode: 'production'});
 * ```
 *
 * @param config - The configuration optiom
 * @returns The parsed env variable
 */
declare function loadEnv(config?: Config): Record<string, string>;

export { Config, loadEnv };
