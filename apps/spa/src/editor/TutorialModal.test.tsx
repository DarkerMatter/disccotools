import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TutorialModal } from './TutorialModal.js';

describe('<TutorialModal />', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <TutorialModal open={false} onClose={() => {}} onStartTour={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the steps when open', () => {
    render(<TutorialModal open onClose={() => {}} onStartTour={() => {}} />);
    expect(screen.getByRole('dialog', { name: /tutorial/i })).toBeInTheDocument();
    expect(screen.getByText(/Pick a background/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a shape/i)).toBeInTheDocument();
    expect(screen.getByText(/Add layers/i)).toBeInTheDocument();
    expect(screen.getByText(/Adjust each layer/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a resolution/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in with Discord/i)).toBeInTheDocument();
  });

  it('calls onClose when "Got it" is clicked', async () => {
    const onClose = vi.fn();
    render(<TutorialModal open onClose={onClose} onStartTour={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onStartTour when "Take the guided tour" is clicked', async () => {
    const onStartTour = vi.fn();
    render(<TutorialModal open onClose={() => {}} onStartTour={onStartTour} />);
    await userEvent.click(screen.getByRole('button', { name: /take the guided tour/i }));
    expect(onStartTour).toHaveBeenCalled();
  });
});
