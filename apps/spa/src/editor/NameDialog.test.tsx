import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NameDialog } from './NameDialog.js';

describe('<NameDialog />', () => {
  it('renders the title and submit button', () => {
    render(<NameDialog onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('dialog', { name: /name this save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  });

  it('disables submit when input is empty', () => {
    render(<NameDialog onSubmit={() => {}} onCancel={() => {}} />);
    const btn = screen.getByRole('button', { name: /^save$/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls onSubmit with trimmed value on submit', async () => {
    const onSubmit = vi.fn();
    render(<NameDialog onSubmit={onSubmit} onCancel={() => {}} />);
    const input = screen.getByLabelText(/save name/i);
    await userEvent.type(input, '  hello  ');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<NameDialog onSubmit={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
