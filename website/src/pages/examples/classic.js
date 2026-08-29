import ExamplePage from '../../components/ExamplePage';
import ClassicPlayground from '../../components/ClassicPlayground';

export default function ClassicExamplePage() {
  return (
    <ExamplePage
      title="Classic Tangram playground"
      description="Edit and explore Tangram scene YAML in the classic playground."
    >
      <h1>Classic Tangram playground</h1>
      <p>Edit scene YAML and explore the original Tangram styling model.</p>
      <ClassicPlayground />
    </ExamplePage>
  );
}
