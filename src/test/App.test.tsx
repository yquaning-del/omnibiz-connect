import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

describe('App smoke test', () => {
  it('should render ErrorBoundary without crashing', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(container).toBeTruthy();
  });

  it('should render test content inside ErrorBoundary', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(getByText('Test content')).toBeInTheDocument();
  });
});
