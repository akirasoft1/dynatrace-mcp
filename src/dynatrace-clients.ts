import { _OAuthHttpClient } from '@dynatrace-sdk/http-client';
import { getSSOUrl } from 'dt-app';

/** Create an Oauth Client based on clientId, clientSecret, environmentUrl and scopes */
export const createOAuthClient = async (
  clientId: string,
  clientSecret: string,
  environmentUrl: string,
  scopes: string[]
): Promise<_OAuthHttpClient> => {
  const baseUrl = await getSSOUrl(environmentUrl);

  if (!clientId) {
    throw new Error('Failed to retrieve OAuth client id from env "DT_APP_OAUTH_CLIENT_ID"');
  }
  if (!clientSecret) {
    throw new Error('Failed to retrieve OAuth client secret from env "DT_APP_OAUTH_CLIENT_SECRET"');
  }
  console.error(`baseUrl=${baseUrl}`);

  const client = new _OAuthHttpClient({
    scopes,
    clientId,
    secret: clientSecret,
    environmentUrl,
    authUrl: new URL('/sso/oauth2/token', baseUrl).toString(),
  });

  // Wrap the send method to log the URL, response code, and first 10 lines of the response body
  const originalSend = client.send.bind(client);
  client.send = async (options) => {
    
    // Log the full URL (handle both relative and absolute URLs)
    const url = options.url.startsWith('http')
      ? options.url
      : `${environmentUrl.replace(/\/$/, '')}${options.url.startsWith('/') ? '' : '/'}${options.url}`;
    console.error('############################################');  
    console.error(`HTTP Request URL: ${url}`);
    // Log the request method
    console.error(`HTTP Request Method: ${options.method}`);
    //log the oauth bearer token
    //console.error(`HTTP Request Bearer Token: ${options.headers['Authorization']}`);
    // Log the request headers
    console.error(`HTTP Request Headers: ${JSON.stringify(options.headers)}`);
    // Log the request body 
    console.error(`HTTP Request Body: ${JSON.stringify(options.body)}`);
    // Log the oauth scopes
    console.error(`OAuth Scopes: ${JSON.stringify(scopes)}`);
    console.error('############################################');
      console.error(options);
    let response;
    try {
      response = await originalSend(options);
      // Log the response status code
      console.error(`HTTP Response Status: ${response.status}`);

      // // Try to read and log the first 10 lines of the response body (as text)
      // try {
      //   const bodyText = await response.body('text');
      //   const lines = bodyText.split('\n').slice(0, 10).join('\n');
      //   console.error(`HTTP Response Body (first 10 lines):\n${lines}`);
      // } catch (err) {
      //   console.error('Could not read response body:', err);
      // }
    } catch (err) {
      if (err && typeof err === 'object') {
        console.error('Error properties and values, shallow object:', { ...err });
      } else {
        console.error('Error properties and values:', err);
      }
      console.error('*************************************');
      console.error();
      // Log the error if the request failss
      console.error('#############################################');
      console.error('HTTP Request failed:', err);
      throw err; // rethrow to preserve error handling
    }

    return response;
  };

  return client;
};

/** Helper function to call an app-function via platform-api */
export const callAppFunction = async (dtClient: _OAuthHttpClient, appId: string, functionName: string, payload: any) => {
  console.error(`Sending payload ${JSON.stringify(payload)}`);

  const response = await dtClient.send({
    url: `/platform/app-engine/app-functions/v1/apps/${appId}/api/${functionName}`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: payload,
    statusValidator: (status: number) => {
      return [200].includes(status);
    },
  });

  return await response.body('json');
}
