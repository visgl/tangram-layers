import ExampleDeviceTabs from '../../components/ExampleDeviceTabs';
import ExamplePage from '../../components/ExamplePage';
import DeckExample from '../../components/DeckExample';

export default function DeckExamplePage() {
  return (
    <ExamplePage
      title="Deck + TangramLayer"
      description="A deck.gl basemap integration powered by Tangram."
    >
      <h1>Deck + TangramLayer</h1>
      <p>Compare a Tangram basemap and deck.gl overlays on WebGPU or WebGL.</p>
      <ExampleDeviceTabs />
      <DeckExample />
    </ExamplePage>
  );
}
