import awsParamStore from 'aws-param-store';

export default function retrieveSecret (secretName: string, region: string, timeout: number) {

    try {
        const secret = awsParamStore.getParameterSync(`/aws/reference/secretsmanager/${secretName}`, {
          region,
          httpOptions: {
            timeout,
          },
        });
    
        if (secret.Value)
            return JSON.parse(secret.Value);
      }
      
    catch (error) {
        console.error('ERROR: Unable to get secret from AWS Secrets Manager', {
          secretName,
          region,
          timeout,
        });
    
        console.error(error);
    
        return {};
      }
};
