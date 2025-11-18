/**
 * This module exposes a single function as default export
 *
 * @module dotenv-set
 */

import {parse as dotenvParse} from 'dotenv';
import {expand} from 'dotenv-expand';
import fs from 'node:fs';
import {lookupFile, lookupMultipleFiles} from './utils';

/**
 * Configuration Options
 */
export type Config = {
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

type ResolvedConfig = Config;

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
export function loadEnv(config?: Config): Record<string, string> {
	const resolvedConfig: ResolvedConfig = {...config};
	let {mode, folder, useModeEnv} = resolvedConfig;

	if (!folder) {
		folder = process.env['ENV_ROOT_FOLDER'];
		if (!folder) {
			try {
				const parsed = dotenvParse(fs.readFileSync('.env', {encoding: 'utf-8'}));
				Object.entries(parsed).forEach(function ([key, value]) {
					if (key === 'ENV_ROOT_FOLDER') {
						folder = value;
					}
				});
			} catch {}
			try {
				const parsed2 = dotenvParse(fs.readFileSync('.env.local', {encoding: 'utf-8'}));
				Object.entries(parsed2).forEach(function ([key, value]) {
					if (key === 'ENV_ROOT_FOLDER') {
						folder = value;
					}
				});
			} catch {}
			try {
				folder = fs.readFileSync('.root.env', {encoding: 'utf-8'});
			} catch {}
		}
	}

	const env_root = folder || '.';

	if (!useModeEnv) {
		// we first get the MODE_ENV name
		// we get from the environment if there else we get from the .env and .env.local
		let mode_env_name = process.env['MODE_ENV'];
		if (!mode_env_name) {
			try {
				const content = lookupFile('.', ['.env'], {rootDir: env_root});
				if (content) {
					const parsed = dotenvParse(content);
					Object.entries(parsed).forEach(function ([key, value]) {
						if (key === 'MODE_ENV') {
							mode_env_name = value;
						}
					});
				}
			} catch {}
			try {
				const content = lookupFile('.', ['.env.local'], {rootDir: env_root});
				if (content) {
					const parsed = dotenvParse(content);
					Object.entries(parsed).forEach(function ([key, value]) {
						if (key === 'MODE_ENV') {
							mode_env_name = value;
						}
					});
				}
			} catch {}
		}
		// we fallback on MODE
		useModeEnv = mode_env_name || 'MODE';
	}

	if (!mode) {
		if (typeof useModeEnv === 'string') {
			mode = process.env[useModeEnv];
		} else {
			for (const variable of useModeEnv) {
				mode = process.env[variable];
				if (mode) {
					break;
				}
			}
		}
	}

	if (!mode) {
		mode = config?.defaultMode || 'local';
	}

	const env: Record<string, string> = {};
	const envFiles = [/** default file */ `.env`, /** local file */ `.env.local`];
	if (config?.defaultEnvFile) {
		envFiles.unshift(config.defaultEnvFile);
	}
	if (mode && mode !== 'local') {
		envFiles.push(/** mode file */ `.env.${mode}`, /** mode local file */ `.env.${mode}.local`);
	}

	const parsed = Object.fromEntries(
		envFiles.flatMap((file) => {
			const paths = lookupMultipleFiles('', [file], {
				pathOnly: true,
				rootDir: env_root,
			});
			if (paths.length === 0) return [];
			const result: [string, string][] = [];
			// we reverse the list as we want the first fetch (child) to take precedence
			for (const path of paths.reverse()) {
				const newEntries = Object.entries(dotenvParse(fs.readFileSync(path)));
				result.push(...newEntries);
			}
			return result;
		})
	);

	// let environment variables use each other and set them to process.env
	expand({parsed});

	for (const [key, value] of Object.entries(parsed)) {
		env[key] = value;
	}

	if (typeof useModeEnv === 'string') {
		process.env[useModeEnv] = mode;
		env[useModeEnv] = mode;
	} else {
		for (const v of useModeEnv) {
			process.env[v] = mode;
			env[v] = mode;
		}
	}

	// return the resulting parsed env
	return env;
}
