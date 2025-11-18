var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/index.ts
import { parse as dotenvParse } from "dotenv";
import { expand } from "dotenv-expand";
import fs2 from "fs";

// src/utils.ts
import fs from "fs";
import path from "path";
function lookupFile(dir, formats, options) {
  const dirFullPath = path.resolve(dir);
  for (const format of formats) {
    const fullPath = path.join(dir, format);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const result = (options == null ? void 0 : options.pathOnly) ? fullPath : fs.readFileSync(fullPath, "utf-8");
      if (!(options == null ? void 0 : options.predicate) || options.predicate(result)) {
        return result;
      }
    }
  }
  const parentDir = path.dirname(dirFullPath);
  const absoluteRootDir = (options == null ? void 0 : options.rootDir) ? path.resolve(options.rootDir) : void 0;
  if (parentDir !== dir && (!absoluteRootDir || parentDir.startsWith(absoluteRootDir))) {
    return lookupFile(parentDir, formats, options);
  }
}
function _lookupMultipleFiles(dir, formats, files, options) {
  const dirFullPath = path.resolve(dir);
  for (const format of formats) {
    const fullPath = path.join(dir, format);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const result = (options == null ? void 0 : options.pathOnly) ? fullPath : fs.readFileSync(fullPath, "utf-8");
      if (!(options == null ? void 0 : options.predicate) || options.predicate(result)) {
        files.push(result);
      }
    }
  }
  const parentDir = path.dirname(dirFullPath);
  const absoluteRootDir = (options == null ? void 0 : options.rootDir) ? path.resolve(options.rootDir) : void 0;
  if (parentDir !== dir && (!absoluteRootDir || parentDir.startsWith(absoluteRootDir))) {
    _lookupMultipleFiles(parentDir, formats, files, options);
  }
}
function lookupMultipleFiles(dir, formats, options) {
  const files = [];
  _lookupMultipleFiles(dir, formats, files, options);
  return files;
}

// src/index.ts
function loadEnv(config) {
  const resolvedConfig = __spreadValues({}, config);
  let { mode, folder, useModeEnv } = resolvedConfig;
  if (!folder) {
    folder = process.env["ENV_ROOT_FOLDER"];
    if (!folder) {
      try {
        const parsed2 = dotenvParse(fs2.readFileSync(".env", { encoding: "utf-8" }));
        Object.entries(parsed2).forEach(function([key, value]) {
          if (key === "ENV_ROOT_FOLDER") {
            folder = value;
          }
        });
      } catch (e) {
      }
      try {
        const parsed2 = dotenvParse(fs2.readFileSync(".env.local", { encoding: "utf-8" }));
        Object.entries(parsed2).forEach(function([key, value]) {
          if (key === "ENV_ROOT_FOLDER") {
            folder = value;
          }
        });
      } catch (e) {
      }
      try {
        folder = fs2.readFileSync(".root.env", { encoding: "utf-8" });
      } catch (e) {
      }
    }
  }
  const env_root = folder || ".";
  if (!useModeEnv) {
    let mode_env_name = process.env["MODE_ENV"];
    if (!mode_env_name) {
      try {
        const content = lookupFile(".", [".env"], { rootDir: env_root });
        if (content) {
          const parsed2 = dotenvParse(content);
          Object.entries(parsed2).forEach(function([key, value]) {
            if (key === "MODE_ENV") {
              mode_env_name = value;
            }
          });
        }
      } catch (e) {
      }
      try {
        const content = lookupFile(".", [".env.local"], { rootDir: env_root });
        if (content) {
          const parsed2 = dotenvParse(content);
          Object.entries(parsed2).forEach(function([key, value]) {
            if (key === "MODE_ENV") {
              mode_env_name = value;
            }
          });
        }
      } catch (e) {
      }
    }
    useModeEnv = mode_env_name || "MODE";
  }
  if (!mode) {
    if (typeof useModeEnv === "string") {
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
    mode = (config == null ? void 0 : config.defaultMode) || "local";
  }
  const env = {};
  const envFiles = [
    /** default file */
    `.env`,
    /** local file */
    `.env.local`
  ];
  if (config == null ? void 0 : config.defaultEnvFile) {
    envFiles.unshift(config.defaultEnvFile);
  }
  if (mode && mode !== "local") {
    envFiles.push(
      /** mode file */
      `.env.${mode}`,
      /** mode local file */
      `.env.${mode}.local`
    );
  }
  const parsed = Object.fromEntries(
    envFiles.flatMap((file) => {
      const paths = lookupMultipleFiles("", [file], {
        pathOnly: true,
        rootDir: env_root
      });
      if (paths.length === 0)
        return [];
      const result = [];
      for (const path2 of paths.reverse()) {
        const newEntries = Object.entries(dotenvParse(fs2.readFileSync(path2)));
        result.push(...newEntries);
      }
      return result;
    })
  );
  expand({ parsed });
  for (const [key, value] of Object.entries(parsed)) {
    env[key] = value;
  }
  if (typeof useModeEnv === "string") {
    process.env[useModeEnv] = mode;
    env[useModeEnv] = mode;
  } else {
    for (const v of useModeEnv) {
      process.env[v] = mode;
      env[v] = mode;
    }
  }
  return env;
}

export {
  loadEnv
};
//# sourceMappingURL=chunk-IKMYIQG6.js.map