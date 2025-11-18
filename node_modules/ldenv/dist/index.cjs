"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  loadEnv: () => loadEnv
});
module.exports = __toCommonJS(src_exports);
var import_dotenv = require("dotenv");
var import_dotenv_expand = require("dotenv-expand");
var import_node_fs2 = __toESM(require("fs"), 1);

// src/utils.ts
var import_node_fs = __toESM(require("fs"), 1);
var import_node_path = __toESM(require("path"), 1);
function lookupFile(dir, formats, options) {
  const dirFullPath = import_node_path.default.resolve(dir);
  for (const format of formats) {
    const fullPath = import_node_path.default.join(dir, format);
    if (import_node_fs.default.existsSync(fullPath) && import_node_fs.default.statSync(fullPath).isFile()) {
      const result = (options == null ? void 0 : options.pathOnly) ? fullPath : import_node_fs.default.readFileSync(fullPath, "utf-8");
      if (!(options == null ? void 0 : options.predicate) || options.predicate(result)) {
        return result;
      }
    }
  }
  const parentDir = import_node_path.default.dirname(dirFullPath);
  const absoluteRootDir = (options == null ? void 0 : options.rootDir) ? import_node_path.default.resolve(options.rootDir) : void 0;
  if (parentDir !== dir && (!absoluteRootDir || parentDir.startsWith(absoluteRootDir))) {
    return lookupFile(parentDir, formats, options);
  }
}
function _lookupMultipleFiles(dir, formats, files, options) {
  const dirFullPath = import_node_path.default.resolve(dir);
  for (const format of formats) {
    const fullPath = import_node_path.default.join(dir, format);
    if (import_node_fs.default.existsSync(fullPath) && import_node_fs.default.statSync(fullPath).isFile()) {
      const result = (options == null ? void 0 : options.pathOnly) ? fullPath : import_node_fs.default.readFileSync(fullPath, "utf-8");
      if (!(options == null ? void 0 : options.predicate) || options.predicate(result)) {
        files.push(result);
      }
    }
  }
  const parentDir = import_node_path.default.dirname(dirFullPath);
  const absoluteRootDir = (options == null ? void 0 : options.rootDir) ? import_node_path.default.resolve(options.rootDir) : void 0;
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
        const parsed2 = (0, import_dotenv.parse)(import_node_fs2.default.readFileSync(".env", { encoding: "utf-8" }));
        Object.entries(parsed2).forEach(function([key, value]) {
          if (key === "ENV_ROOT_FOLDER") {
            folder = value;
          }
        });
      } catch (e) {
      }
      try {
        const parsed2 = (0, import_dotenv.parse)(import_node_fs2.default.readFileSync(".env.local", { encoding: "utf-8" }));
        Object.entries(parsed2).forEach(function([key, value]) {
          if (key === "ENV_ROOT_FOLDER") {
            folder = value;
          }
        });
      } catch (e) {
      }
      try {
        folder = import_node_fs2.default.readFileSync(".root.env", { encoding: "utf-8" });
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
          const parsed2 = (0, import_dotenv.parse)(content);
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
          const parsed2 = (0, import_dotenv.parse)(content);
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
        const newEntries = Object.entries((0, import_dotenv.parse)(import_node_fs2.default.readFileSync(path2)));
        result.push(...newEntries);
      }
      return result;
    })
  );
  (0, import_dotenv_expand.expand)({ parsed });
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  loadEnv
});
//# sourceMappingURL=index.cjs.map