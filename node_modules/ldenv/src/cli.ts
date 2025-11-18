#!/usr/bin/env node
import {loadEnv} from '.';
import {execFileSync, execSync} from 'child_process';

const args = process.argv.slice(2);

function error(msg: string) {
	console.error(msg);
	process.exit(1);
}

let mode: string | undefined;
let defaultMode: string | undefined;
let mode_env_name: string | undefined;
let parse = true;
let verbose = true;

let commandArgs: string[] = [];
let command: string | undefined;
let useGitBranchNameAsDefaultMode = false;
// basic arg parsing (no long form)
for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (!arg.startsWith('-')) {
		command = arg;
		commandArgs = args.slice(i + 1);
		break;
	} else {
		if (arg === '-m') {
			mode = args[i + 1];
			if (!mode) {
				error(`-m arg specified but no mode`);
			}
			i += 1;
		} else if (arg === '-d') {
			defaultMode = args[i + 1];
			if (!defaultMode) {
				error(`-d arg specified but no default mode`);
			}
			i += 1;
		} else if (arg === '-n') {
			mode_env_name = args[i + 1];
			if (!mode_env_name) {
				error(`-n arg specified but no env var name`);
			}
			i += 1;
		} else if (arg === '--git') {
			useGitBranchNameAsDefaultMode = true;
		} else if (arg === '-P') {
			parse = false;
		} else if (arg === '--verbose') {
			verbose = true;
		} else {
			error(`arg not recognized: ${arg}`);
		}
	}
}

if (!command) {
	error(`no command specified`);
}

if (useGitBranchNameAsDefaultMode) {
	function getGitBranch() {
		// VERCEL need this:
		if (process.env.VERCEL_GIT_COMMIT_REF) {
			return process.env.VERCEL_GIT_COMMIT_REF;
		}
		// NETLIFY need this:
		if (process.env.BRANCH) {
			return process.env.BRANCH;
		}
		try {
			return execSync('git rev-parse --abbrev-ref HEAD', {encoding: 'utf8'}).trim();
		} catch (error: any) {
			console.error('Error getting Git branch:', error.message);
			return null;
		}
	}

	const branchName = getGitBranch();
	if (branchName) {
		if (branchName.indexOf('/') !== -1) {
			const splitted = branchName.split('/');
			defaultMode = splitted[splitted.length - 1];
		} else {
			defaultMode = branchName;
		}
	}
}

// now we process each arg in turn to find the lone @@
// this allow executor to specify the mode via a simple arg at any position
for (let i = 0; i < commandArgs.length; i++) {
	const arg = commandArgs[i];
	if (arg === '@@') {
		const nextArg = commandArgs[i + 1];
		if (nextArg && nextArg != '--') {
			mode = nextArg;
		}
		commandArgs.splice(i, 2);
		i--;

		if (!mode && !defaultMode) {
			error(`error: expect to be provided a mode as last argument, or have an expliclty defined defaultMode`);
		}
	}
}

if (typeof mode === 'string' && mode.length === 0) {
	error(`error: mode has been specified as argument, but it is empty`);
}

if (verbose) {
	console.log(`using defaultMode: ${defaultMode}, mode: ${mode} and use mode env name: ${mode_env_name}`);
}

// we are now ready to load the environment
loadEnv({
	defaultMode,
	mode,
	useModeEnv: mode_env_name,
});

function parseArguments(commandArgs: string[]) {
	const newArgs = commandArgs
		.map((arg) => {
			const [prefix, ...list_to_parse] = arg.split('@@');
			let newArg;
			if (list_to_parse.length > 0) {
				// if there are ny @@ we process them in turn
				// we also ensure we save the prefix (could be "")
				// Note that ldenv will not allow you to use @@
				// TODO allow to escape  @@
				const combined = list_to_parse
					.map((to_parse) => {
						// we get the var_name as first value by splitting via '@:'
						// the rest is the default value / suffix pair
						const [var_name, potential_default_value, potential_suffix] = to_parse.split('@:');

						if (var_name.length === 0) {
							error(`error: this is not valid : '@@${to_parse}' please specify an ENV var name after '@@'`);
						}

						const hasSuffix = typeof potential_suffix !== 'undefined';
						const suffix = hasSuffix ? potential_suffix : potential_default_value;
						const default_value = hasSuffix ? potential_default_value : undefined;

						// fallback var_name is allowed, they are separated by ","
						const var_names = var_name.split(',');

						let value;
						for (const name of var_names) {
							// each of these var_name can be composed of other env value (no recursion, just one level)
							const splitted_by_colon = name.split(':');
							// console.log({ splitted_by_colon })
							const actual_name = splitted_by_colon
								.map((v, index) => {
									if (index % 2 == 0) {
										return v;
									} else {
										return process.env[v];
									}
								})
								.join('');
							// console.log({ actual_name })
							value = process.env[actual_name];
							if (value) {
								// if we find one of the comma separated list matching, we exit
								break;
							}
						}
						value = value || default_value;
						if (!hasSuffix && !value) {
							error(`
error: @@${to_parse} was specified in the command but there is no env variable named ${var_name}.
To prevent this error you can provide a default value with '@@${var_name}@:<default value>@:'
An empty default can be specified with '@@${var_name}@:@:'
						`);
						}
						// console.log({ prefix, var_name, default_value, suffix, value })
						return value + (suffix || '');
					})
					.join('');
				newArg = prefix + combined;
			} else {
				newArg = arg;
			}
			if (newArg.startsWith('@=')) {
				const definition = newArg.slice(2).split('=');
				if (definition.length != 2) {
					error(`
error: defintions need exactly 2 component, env variable name and value. '@=<var name>=<value>'
					`);
				}
				const envVarName = definition[0];
				const value = definition[1];
				process.env[envVarName] = value;
				return null; // skip it
			}
			return newArg;
		})
		.filter((v) => !!v) as string[];
	return newArgs;
}

function parseMultipleCommands(args: string[]) {
	let firstCommandArgs: string[] | undefined;
	let moreCommandArrays: string[][] = [];
	let buffer: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '~~') {
			if (!firstCommandArgs) {
				firstCommandArgs = buffer;
			} else {
				moreCommandArrays.push(buffer);
			}
			buffer = [];
		} else {
			buffer.push(arg);
		}
	}

	if (!firstCommandArgs) {
		firstCommandArgs = args;
	} else {
		if (buffer.length > 0) {
			// moreCommandArrays.push(buffer);
			for (const extra_arg of buffer) {
				firstCommandArgs.push(extra_arg);
			}
			buffer = [];
		}
	}

	const extra_commands: {command: string; args: string[]}[] = [];
	for (const arr of moreCommandArrays) {
		if (arr[0]) {
			extra_commands.push({
				command: arr[0],
				args: arr.slice(1),
			});
		}
	}

	return {firstCommandArgs, extra_commands};
}

if (parse) {
	const commands = parseMultipleCommands(commandArgs);

	// console.log({ commands })

	const firstCommandArgs = parseArguments(commands.firstCommandArgs);
	try {
		if (verbose) {
			console.log(`executing (parsed): ${command} ${firstCommandArgs.join(' ')}`);
		}
		execFileSync(command!, firstCommandArgs, {stdio: 'inherit'});
		if (commands.extra_commands.length > 0) {
			let i = 0;
			for (const extra_command of commands.extra_commands) {
				const parsedArgs = parseArguments(extra_command.args || []);
				if (verbose) {
					console.log(`executing:${i} (parsed): ${extra_command.command} ${parsedArgs.join(' ')}`);
				}
				execFileSync(extra_command.command, parsedArgs, {stdio: 'inherit'});
				i++;
			}
		}
	} catch {}
} else {
	try {
		if (verbose) {
			console.log(`executing (no parsing): ${command} ${commandArgs.join(' ')}`);
		}
		execFileSync(command!, commandArgs, {stdio: 'inherit'});
	} catch {}
}
