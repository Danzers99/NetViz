import { useAppStore } from './store';
import { CursorManager } from './components/CursorManager';
import { Layout } from './components/Layout';
import { WizardContainer } from './components/wizard/WizardContainer';
import { Sandbox } from './components/Sandbox';
import { IntroModal } from './components/onboarding/IntroModal';


function App() {
  const step = useAppStore((state) => state.step);
  const settings = useAppStore((state) => state.settings);
  // Default to false if undefined (new users see intro)
  // Wait, persistence loader defaults it.
  const showIntro = !settings.hasSeenIntro;

  return (
    <Layout>
      <CursorManager />
      {showIntro && <IntroModal />}
      {step === 'wizard' ? <WizardContainer /> : <Sandbox />}
    </Layout>
  );

}

export default App;
