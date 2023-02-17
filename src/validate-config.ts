import { ConfigObject } from '.';

export default function validateConfig (config: ConfigObject): ConfigObject {
    Object.keys(config).forEach(key => {
        const value = config[key];
    
        if (value === undefined || value === null || value === 'undefined' || value === '')
          console.log(`WARNING: Found undefined config value for ${key}`);
    
        if (typeof value === 'string' && new RegExp('^[ \\s]+|[ \\s]+$').test(value))
          console.log(`WARNING: Found leading and/or trailing whitespace within config value for ${key}`);
      });
    
    return config;
};
