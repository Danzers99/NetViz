import { useAppStore } from './store';
import { CursorManager } from './components/CursorManager';
import { Layout } from './components/Layout';
import { WizardContainer } from './components/wizard/WizardContainer';
import { Sandbox } from './components/Sandbox';

function App() {
  const step = useAppStore((state) => state.step);

  return (
    <Layout>
      <CursorManager />
      {step === 'wizard' ? <WizardContainer /> : <Sandbox />}
    </Layout>
  );
}

export default App;
