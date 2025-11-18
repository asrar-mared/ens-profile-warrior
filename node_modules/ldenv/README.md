This module is both a module to be imported and a command line utility that load environment variables from dot env files

# Use as a command-line

ldenv is a simple yet very powerful command line tool

Its basic purpose is to load .env file and execute a command with the environment set for it

## Basic usage:

```bash
ldenv <command> [...args]
```

This will provide to `command` the environment variable set in the `.env`, `.env.local`, etc... (see [#import-as-module](#import-as-module) for details.

## ldenv can resolve variable in the command line itself:

ldenv also support resolving variable in the command and args provided.

the following will display the content of the environment variable "GREETINGS" if it is defined in one of the `.env` files

```bash
ldenv echo @@GREETINGS
```

contract this with using the shell (where GREETINGS will not be resolved unless the dotenv file was injected in the environment to begin with):

```bash
echo $GREETINGS
```

## default values

By default, if a env variable requested is missing, ldenv will abort with an error

```bash
ldenv echo @@GREETINGS
```

You can instead provide a default value, including the empty string (which is equivalent to not setting the variable):

```bash
ldenv echo @@GREETINGS@:<default value>@:
```

You can also use the commas seperated list of env variable to fallback on

```bash
ldenv echo @@NON_EXISTENT,GREETINGS
```

note that you can still provide prefix and suffix (note the need for `@:` to let ldenv know where the env name stop)

```bash
ldenv echo _@@NON_EXISTENT,GREETINGS@:_
```

## env variable name based on another env variable

ldenv allow you to resolve env variable whose name depends on another env variable too.

Here we construct the env var name `TARGET_<mode>` where mode is the mode used by ldenv (see [#import-as-module](#import-as-module) ) and is specified by `-m bonjour`. this result in the env var `TARGET_bonjour`

```bash
ldenv -m bonjour echo @@GREETINGS @@TARGET_:MODE
```

## sequential execution

ldenv also support executing multiple commands by wrapping further command using `~~`

```bash
ldenv echo @@NON_EXISTENT,GREETINGS ~~ echo next ~~
```

```bash
ldenv echo @@NON_EXISTENT,GREETINGS ~~ echo next ~~ echo again ~~
```

# Import As Module

This module expose a single function that uses [dotenv](https://github.com/motdotla/dotenv) and [dotenv-expand](https://github.com/motdotla/dotenv-expand) to load additional environment variables from the following files in your environment directory:

```
.env                # loaded in all cases
.env.local          # loaded in all cases, ignored by git
.env.[mode]         # only loaded in specified mode
.env.[mode].local   # only loaded in specified mode, ignored by git
```

> Env Loading Priorities
>
> An env file for a specific mode (e.g. `.env.production`) will take higher priority than a generic one (e.g. `.env`).
>
> In addition, environment variables that already exist when the function is executed have the highest priority and will not be overwritten by `.env` files.
>
> `.env` files are loaded at soon as the function is invoked.

Also, because the module also uses [dotenv-expand](https://github.com/motdotla/dotenv-expand) it expand variables out of the box. To learn more about the syntax, check out their docs.

Note that if you want to use $ inside your environment value, you have to escape it with `\.`

```
KEY=123
NEW_KEY1=test$foo   # test
NEW_KEY2=test\$foo  # test$foo
NEW_KEY3=test$KEY   # test123
```

> SECURITY NOTES
>
> `.env.*.local` files are local-only and can contain sensitive variables. You should add `*.local` to your `.gitignore` to avoid them being checked into git.
