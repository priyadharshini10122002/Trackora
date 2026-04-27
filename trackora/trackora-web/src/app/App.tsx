import { ErrorBoundary } from '@/shared/components/error-boundary';
import { Providers } from '@/app/Providers';

function App() {
  return (
    <ErrorBoundary>
      <Providers />
    </ErrorBoundary>
  );
}

export default App;
