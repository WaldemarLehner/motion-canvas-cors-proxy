import {viaProxy} from '@components/viaProxy';
import {Image} from '@motion-canvas/2d/lib/components';
import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {waitFor} from '@motion-canvas/core/lib/flow';

export default makeScene2D(function* (view) {
  // Create your animations here

  view.add(
    <Image
      src={viaProxy(
        'https://fastly.picsum.photos/id/20/3670/2462.jpg?hmac=CmQ0ln-k5ZqkdtLvVO23LjVAEabZQx2wOaT4pyeG10I',
      )}
      scale={0.2}
      fill={'red'}
    />,
  );
  yield* waitFor(5);
});
