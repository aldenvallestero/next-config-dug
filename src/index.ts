import fs from 'fs';
import path from 'path';

import retrieveSecret from './retrieve-secrets';
import validateConfig from './validate-config';

export interface ConfigObject {
  [key: string]: string | boolean | number;
}

interface LoadSecretsArgs {
  AWS_SECRETS_MANAGER_NAME?: string;
  AWS_SECRETS_MANAGER_NAMES?: string;
  AWS_SECRETS_MANAGER_REGION?: string;
  AWS_SECRETS_MANAGER_TIMEOUT?: number;
  awsSecretsManagerName?: string;
  awsSecretsManagerNames?: string;
  awsSecretsManagerRegion?: string;
  awsSecretsManagerTimeout?: number;
}

export interface SecretObject {
  [key: string]: string;
}

// parse non-strings
const convertString = (value: string): string | number | boolean => {
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  if (value.match(/^\d+\.\d+$/)) return Number.parseFloat(value);
  if (value.match(/^\d+$/)) return Number.parseInt(value, 10);

  return value;
};

// RETRIEVE ALL SECRETS NEEDED
const loadSecrets = (config: LoadSecretsArgs, overrides: LoadSecretsArgs): Record<string, unknown> => {
    
    // RETRIEVING ALL SECRETS MANAGERS FROM CONFIG.DEFAULT
    const secretNames: string = overrides.AWS_SECRETS_MANAGER_NAMES || overrides.AWS_SECRETS_MANAGER_NAMES || '';
    const secretName: string = overrides.AWS_SECRETS_MANAGER_NAME || config.AWS_SECRETS_MANAGER_NAME || '';
    const region: string = overrides.AWS_SECRETS_MANAGER_REGION || config.AWS_SECRETS_MANAGER_REGION || '';
    const timeout: number = overrides.AWS_SECRETS_MANAGER_TIMEOUT || config.AWS_SECRETS_MANAGER_TIMEOUT || 5000;

    const mergedSecretNames = new Set<string>(); // create a SET of strings eg: Set(3) { 'hi', 'hello', 'how are you?' }

    if (secretName)
        mergedSecretNames.add(secretName);

    if (secretNames) {
        secretNames.split(',').map(i => i.trim()).filter(i => !!i).forEach(secretName => {
            mergedSecretNames.add(secretName);
        });
    }
    
    // RETRIEVE ALL SECRETS FOR EACH SECRETS MANAGERS
    const secrets = [...mergedSecretNames].map((name) => {
        return retrieveSecret(name, region, timeout);
    });

    const mergedSecrets: SecretObject = {};

    secrets.forEach((secret) => {
        Object.assign(mergedSecrets, secret);
    });
    
    return Object.entries(mergedSecrets).reduce((result: ConfigObject, [key, value]): ConfigObject => {
        result[key] = convertString(value);
        return result;
    }, {});
};

const loadEnvironment = (): Record<string, unknown> => {
  return Object.entries(process.env).reduce((result: ConfigObject, [key, value]): ConfigObject => {
    result[key] = convertString(value);
    return result;
  }, {});
};

const loadFile = (appDirectory: string, configPath: string, fileName: string) => {

  var filePath: string | void;

  if (fs.existsSync(path.resolve(appDirectory, configPath, `${fileName}.js`)))
    filePath = path.resolve(appDirectory, configPath, `${fileName}.js`);

  if (filePath) {

    try {
      const config = require(filePath); // filePath attached to config const

      if (filePath.match(/config.+local/)) {
        const fileName = filePath.split('/').pop();
        console.log(`WARNING: Found a local config file ${fileName}`);
      }

      return config.default ? config.default : config;
    } catch (error) {
      console.error(`ERROR: Unable to load config file: ${filePath}`);
      console.error(error);
    }
  }
};

const loadConfig = (configPath = ''): ConfigObject => {

    // GET CURRENT WORKING DIRECTORY
    const appDirectory = fs.realpathSync(process.cwd());

    // GET CURRENT APP ENVIRONMENT
    const environment: string = process.env.NODE_ENV || 'development';

    // GET CONFIG.DEFAULT
    const defaultConfig = loadFile(appDirectory, configPath, 'config.default');

    // GET CONFIG.[NODE_ENV]
    const environmentConfig = loadFile(appDirectory, configPath, `config.${environment}`);

    // GET CONFIG.[NODE_ENV].LOCAL
    const localEnvironmentConfig = loadFile(appDirectory, configPath, `config.${environment}.local`);

    // GET CONFIG.LOCAL
    const localConfig = loadFile(appDirectory, configPath, 'config.local');

    const fileConfig = Object.assign({}, defaultConfig, environmentConfig, localEnvironmentConfig, localConfig);

    const environmentVars = loadEnvironment();

    const config = Object.assign({}, fileConfig, loadSecrets(fileConfig, environmentVars), environmentVars);

    if (environment === 'test' || environment === 'development') return config;
    else return validateConfig(config);
};

export default function init () {
    return loadConfig();
}; export { loadConfig };