# Motion Canvas CORS Proxy

A Vite Plugin to proxy remote content to circumvent `Tainted canvas` errors.

## Why is this needed

While Motion Canvas has no issues displaying remote content (content not loaded
via vite from localhost) during the preview, it will throw an error when you try
to render the video. (see
[motion-canvas#338](https://github.com/motion-canvas/motion-canvas/issues/338))

This is because remote content "taints" the canvas. Trying to read a tainted
canvas is disallowed due to security concerns. You can read more about it here:
https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image

This Plugin circumvents this issue by getting the requested resource from the
local server that is used to run Motion Canvas.

Use the `viaProxy`-Function to access remote data.

Example:

```tsx
scene.add(
  <Image src={viaProxy('https://via.placeholder.com/300.png/09f/fff')} />,
);
// gets rewritten with viaProxy to
scene.add(
  <Image
    src={'/cors-proxy/https%3A%2F%2Fvia.placeholder.com%2F300.png%2F09f%2Ffff'}
  />,
);
```

## Installation

`npm i ????????????????`

Add the Plugin in your `vite.config.js` or `vite.config.ts`

```diff
+ import {motionCanvasCorsProxyPlugin} from '???????????????';
  export default defineConfig({
    plugins: [
      tsconfigPaths(),
      motionCanvas({
        project: ['./test/src/project.ts'],
      }),
+     motionCanvasCorsProxyPlugin({}),
    ],
  });

```

## Usage

Simply wrap the remote resource in the `viaProxy` Function

```diff
+  import {viaProxy} from '???????????????????????'
   scene.add(
-      <Image src={https://via.placeholder.com/300.png/09f/fff"} />
+      <Image src={viaProxy("https://via.placeholder.com/300.png/09f/fff")} />
   )
```

## Configuration

The plugin accepts a config object which can be passed as an argument

```ts
// example
motionCanvasCorsProxyPlugin({
  allowedMimeTypes: ['image/png', 'image/webp'],
  whiteListHosts: ['imgur.com'],
});
```

### allowedMimeTypes

Defines which types of resources are allowed

**default**: `["image/*", "video/*"]`

Passing an empty array will allow any resource type.  
All entries in the array _must_ have a left and right segment, separated by a
`/`.

### whiteListHosts

Defines which Hosts are allowed be proxied.

**default**: `[]`

Passing an empty array will allow all hosts.  
Note that the host is anything between the protocol (e.g. `https://`) and the
first `/`.

For `https://via.placeholder.com/300.png/09f/fff"` `via.placeholder.com` is the
host.
