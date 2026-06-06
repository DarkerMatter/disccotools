import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TutorialTour } from './TutorialTour.js';

function renderTour(open: boolean, onClose = vi.fn()) {
  document.body.innerHTML = `
    <div data-tour-id="shape" style="width:100px;height:50px"></div>
    <div data-tour-id="background"></div>
  `;
  const steps = [
    { target: 'shape', title: 'Pick a shape', body: 'shapes' },
    { target: 'background', title: 'Pick a background', body: 'bgs' },
  ];
  return render(<TutorialTour open={open} steps={steps} onClose={onClose} />);
}

describe('<TutorialTour />', () => {
  it('renders nothing when closed', () => {
    renderTour(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the first step title when open', () => {
    renderTour(true);
    expect(screen.getByText(/pick a shape/i)).toBeInTheDocument();
  });

  it('advances on Next', async () => {
    renderTour(true);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/pick a background/i)).toBeInTheDocument();
  });

  it('the last Next button reads Finish and triggers onClose', async () => {
    const onClose = vi.fn();
    renderTour(true, onClose);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('Skip closes immediately', async () => {
    const onClose = vi.fn();
    renderTour(true, onClose);
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
