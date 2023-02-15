import {Plugin} from 'vite';
import axios from 'axios';
import {ServerResponse, IncomingMessage} from 'http';

export interface MotionCanvasCorsProxyPluginOptions {
  /**
   * Set which types of resources are allowed by default.
   *
   * @summary
   * Catchall on the right side is supported.
   * Pass an empty Array to allow all types of resources, although this is not recommended.
   *
   * @default ["image/*", "video/*"]
   */
  allowedMimeTypes?: string[];

  /**
   * Set which hosts are allowed
   *
   *
   * @summary Note that the host if everything to the left of the first `/`, and to the right of the protocol `https://`
   * Whitelist is not used by default, although you should consider setting up just the relevant hosts.
   */
  whiteListHosts?: string[];
}

/**
 * Takes entire path and extracts the remote URL to be called
 */
function extractDestinationUrl(
  url: string,
): [URL, undefined] | [undefined, string] {
  try {
    const withoutPrefix = url.replace('/cors-proxy/', '');
    const asUrl = new URL(decodeURIComponent(withoutPrefix));
    if (asUrl.protocol !== 'http:' && asUrl.protocol !== 'https:') {
      throw new Error('Only supported protocols are http and https'); // TODO: Is this enough to prevent access to file:// ?
    }

    return [asUrl, undefined];
  } catch (err) {
    return [undefined, err + ''];
  }
}

function writeError(
  message: string,
  res: ServerResponse<IncomingMessage>,
  statusCode = 400,
) {
  res.writeHead(statusCode, message);
  res.end();
}

export const motionCanvasCorsProxyPlugin = (
  config: MotionCanvasCorsProxyPluginOptions = {},
): Plugin => {
  const defaultConfig: MotionCanvasCorsProxyPluginOptions = {
    allowedMimeTypes: ['image/*', 'video/*'],
    whiteListHosts: [],
  };

  // Apply defaults if nothing is set
  config.allowedMimeTypes ??= defaultConfig.allowedMimeTypes;
  config.whiteListHosts ??= defaultConfig.whiteListHosts;

  // Check config
  if ((config.allowedMimeTypes ?? []).some(e => e.split('/').length !== 2)) {
    throw new Error(
      "Invalid config for motion-canvas-cors-proxy:\n All Entries must have the following format: 'leftPart/rightPart' where rightPart may be '*'",
    );
  }

  return {
    name: 'motion-canvas-cors-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/cors-proxy/')) {
          // url does not start with /cors-proxy/, as a result
          // this plugin doesn't care about the request
          return next();
        }

        // Only GET is allowed for now.
        if (req.method !== 'GET') {
          const msg = 'Only GET requests are allowed';
          return writeError(msg, res, 405);
        }

        const [sourceUrl, error] = extractDestinationUrl(req.url);

        if (
          !isReceivedUrlInAllowedHosts(
            sourceUrl.hostname,
            config.whiteListHosts,
          )
        ) {
          return writeError(
            'Blocked by Proxy: ' +
              sourceUrl.hostname +
              ' is not on Hosts whitelist',
            res,
          );
        }

        if (error || !sourceUrl) {
          return writeError(error, res);
        }

        return tryGetResource(res, sourceUrl, config);
      });
    },
  };
};

/**
 * Try to get the resource with the help of Axios. This assumes the data is an array buffer.
 */
async function tryGetResource(
  res: ServerResponse<IncomingMessage>,
  sourceUrl: URL,
  config: MotionCanvasCorsProxyPluginOptions,
): Promise<void> {
  try {
    const result = await axios.get(sourceUrl.toString(), {
      responseType: 'arraybuffer',
      maxRedirects: 3,
    });
    if (result.status >= 300) {
      return writeError('Status is ' + result.status, res);
    }

    const contentType = result.headers['content-type'];
    const contentLength = result.headers['content-length'];

    if (!contentType) {
      return writeError('Proxied response does not contain content-type', res);
    }
    if (!contentLength) {
      return writeError(
        'Proxies response does not contain content-length',
        res,
      );
    }

    if (
      !isResultOfAllowedResourceType(
        contentType.toString(),
        config.allowedMimeTypes,
      )
    ) {
      return writeError(
        'Proxied response has blocked content-type: ' +
          result.headers['content-type'],
        res,
        406,
      );
    }

    res.setHeader('content-type', contentType.toString());
    res.setHeader('content-length', contentLength.toString());
    res.setHeader('X-Proxy-Target', sourceUrl.toString());

    res.write(result.data);
    res.end();
  } catch (err) {
    console.log(err);
    return writeError(err, res);
  }
}

function isReceivedUrlInAllowedHosts(
  hostname: string,
  whiteListHosts: string[],
) {
  if (!whiteListHosts || whiteListHosts.length === 0) {
    // No White List, so we allow all requests
    return true;
  }

  return whiteListHosts.some(
    e => hostname.toLowerCase() === e.trim().toLowerCase(),
  );
}

function isResultOfAllowedResourceType(
  foundMimeType: string,
  allowedMimeTypes: string[],
) {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return true; // no filters set
  }

  if (foundMimeType.split('/').length !== 2) {
    return false; // invalid mime structure
  }

  const [leftSegment, rightSegment] = foundMimeType
    .split('/')
    .map(e => e.trim().toLowerCase());

  const leftSegmentMatches = allowedMimeTypes.filter(
    e => e.trim().toLowerCase().split('/')[0] === leftSegment,
  );
  if (leftSegmentMatches.length === 0) {
    return false; // No matches at all, not even catchall
  }

  const rightSegmentOfLeftSegmentMatches = leftSegmentMatches.map(
    e => e.split('/')[1],
  );

  if (
    rightSegmentOfLeftSegmentMatches.some(e => e === '*' || e === rightSegment)
  ) {
    return true; // There is a catchall OR the exact resource was matched
  }
}
