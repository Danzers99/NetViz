import { useAppStore } from './store';
import { Layout } from './components/Layout';
import { Wizard } from './components/Wizard';
import { Sandbox } from './components/Sandbox';

function App() {
  const step = useAppStore((state) => state.step);

  return (
    <Layout>
      {step === 'wizard' ? <Wizard /> : <Sandbox />}
    </Layout>
  );
}

export default App;
