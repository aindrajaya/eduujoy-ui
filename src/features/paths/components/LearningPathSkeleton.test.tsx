import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearningPathSkeleton from './LearningPathSkeleton';

describe('LearningPathSkeleton', () => {
  it('renders one placeholder card per module and stays hidden from assistive tech', () => {
    const { container } = render(<LearningPathSkeleton modules={4} />);
    expect(container.querySelectorAll('.h-24')).toHaveLength(4);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
