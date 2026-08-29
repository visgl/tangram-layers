import {useEffect} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function ClassicExample() {
  const classicExampleUrl = useBaseUrl('/examples/classic/');

  useEffect(() => {
    window.location.replace(classicExampleUrl);
  }, [classicExampleUrl]);

  return (
    <main style={{padding: '3rem'}}>
      <p>Opening the classic Tangram example…</p>
      <a href={classicExampleUrl}>Open the classic Tangram example</a>
    </main>
  );
}
