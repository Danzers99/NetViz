import { useAppStore } from './store';
import { Layout } from './components/Layout';
import { WizardContainer } from './components/wizard/WizardContainer';
import { Sandbox } from './components/Sandbox';

function App() {
  const step = useAppStore((state) => state.step);

  return (
    <Layout>
      {step === 'wizard' ? <WizardContainer /> : <Sandbox />}
    </Layout>
  );
}

export default App;
