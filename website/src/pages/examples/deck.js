import {useEffect} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function DeckExample() {
  const deckExampleUrl = useBaseUrl('/examples/deck/');

  useEffect(() => {
    window.location.replace(deckExampleUrl);
  }, [deckExampleUrl]);

  return (
    <main style={{padding: '3rem'}}>
      <p>Opening the deck.gl example…</p>
      <a href={deckExampleUrl}>Open the deck.gl example</a>
    </main>
  );
}
