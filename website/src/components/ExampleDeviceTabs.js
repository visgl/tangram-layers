import useBaseUrl from '@docusaurus/useBaseUrl';
import {useLocation} from '@docusaurus/router';

export default function ExampleDeviceTabs() {
  const location = useLocation();
  const deckExampleUrl = useBaseUrl('/examples/deck/');
  const requestedDevice = new URLSearchParams(location.search).get('device');
  const activeDevice = requestedDevice === 'webgl' ? 'webgl' : 'webgpu';
  const createDeviceUrl = (device) => {
    const query = new URLSearchParams(location.search);
    query.set('device', device);
    return `${deckExampleUrl}?${query.toString()}`;
  };

  return (
    <div className="example-device-tabs" role="tablist" aria-label="Rendering device">
      <a
        className={
          activeDevice === 'webgpu'
            ? 'example-device-tab example-device-tab--active'
            : 'example-device-tab'
        }
        href={createDeviceUrl('webgpu')}
        role="tab"
        aria-selected={activeDevice === 'webgpu'}
      >
        WebGPU
      </a>
      <a
        className={
          activeDevice === 'webgl'
            ? 'example-device-tab example-device-tab--active'
            : 'example-device-tab'
        }
        href={createDeviceUrl('webgl')}
        role="tab"
        aria-selected={activeDevice === 'webgl'}
      >
        WebGL
      </a>
    </div>
  );
}
