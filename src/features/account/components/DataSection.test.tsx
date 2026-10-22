import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import DataSection from './DataSection';

// jsdom's Blob has no text(); FileReader works.
const readText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('read failed'));
    };
    reader.readAsText(blob);
  });

function renderData() {
  const onSave = vi.fn();
  const Wrapper = withQueryClient(createTestQueryClient());
  const utils = render(
    <MemoryRouter>
      <Wrapper>
        <DataSection onSave={onSave} />
      </Wrapper>
    </MemoryRouter>,
  );
  return { onSave, ...utils };
}

describe('DataSection (contract 0.6.0 export)', () => {
  it('downloads the export with the name the API gives it', async () => {
    const { onSave, container } = renderData();
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    expect(await screen.findByText('Downloaded eduujoy-export.json.')).toBeInTheDocument();
    const [blob, filename] = onSave.mock.calls[0] as [Blob, string];
    expect(filename).toBe('eduujoy-export.json');
    expect(JSON.parse(await readText(blob))).toMatchObject({ user: { email: 'jane.doe@example.com' } });
  });

  it('falls back to a dated name when the filename header is not readable', async () => {
    server.use(http.get('/v1/me/export', ({ response }) => response(200).json({ user: {} })));
    const { onSave } = renderData();
    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    await screen.findByText(/^Downloaded eduujoy-export-\d{4}-\d{2}-\d{2}\.json\.$/);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('says when the export is rate-limited', async () => {
    server.use(
      http.get('/v1/me/export', ({ response }) =>
        response.untyped(new HttpResponse(null, { status: 429, headers: { 'Retry-After': '1200' } })),
      ),
    );
    const { onSave } = renderData();
    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You downloaded your data recently. Try again in about 20 minutes.');
    expect(onSave).not.toHaveBeenCalled();
  });
});
