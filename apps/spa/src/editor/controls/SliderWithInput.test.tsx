import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SliderWithInput } from './SliderWithInput.js';

describe('<SliderWithInput />', () => {
  it('renders a slider and a numeric input synced to the value', () => {
    render(
      <SliderWithInput
        label="Opacity"
        value={42}
        min={0}
        max={100}
        onChange={() => {}}
      />,
    );
    const slider = screen.getByLabelText(/^opacity$/i) as HTMLInputElement;
    const number = screen.getByLabelText(/opacity value/i) as HTMLInputElement;
    expect(slider.value).toBe('42');
    expect(number.value).toBe('42');
  });

  it('calls onChange when the slider moves', () => {
    const onChange = vi.fn();
    render(
      <SliderWithInput label="Opacity" value={0} min={0} max={100} onChange={onChange} />,
    );
    const slider = screen.getByLabelText(/^opacity$/i);
    fireEvent.change(slider, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('commits a typed value on blur, clamping to min/max', () => {
    const onChange = vi.fn();
    render(
      <SliderWithInput label="Opacity" value={0} min={0} max={100} onChange={onChange} />,
    );
    const number = screen.getByLabelText(/opacity value/i);
    fireEvent.change(number, { target: { value: '250' } });
    fireEvent.blur(number);
    expect(onChange).toHaveBeenCalledWith(100); // clamped
  });

  it('commits negative values when within min/max', () => {
    const onChange = vi.fn();
    render(
      <SliderWithInput label="Angle" value={0} min={-180} max={180} onChange={onChange} />,
    );
    const number = screen.getByLabelText(/angle value/i);
    fireEvent.change(number, { target: { value: '-90' } });
    fireEvent.blur(number);
    expect(onChange).toHaveBeenCalledWith(-90);
  });

  it('reverts to the controlled value if blurred with garbage', () => {
    render(
      <SliderWithInput label="X" value={50} min={0} max={100} onChange={() => {}} />,
    );
    const number = screen.getByLabelText(/x value/i) as HTMLInputElement;
    fireEvent.change(number, { target: { value: 'abc' } });
    fireEvent.blur(number);
    expect(number.value).toBe('50');
  });

  it('updates the input when the controlled value changes externally', () => {
    const { rerender } = render(
      <SliderWithInput label="X" value={10} min={0} max={100} onChange={() => {}} />,
    );
    const number = screen.getByLabelText(/x value/i) as HTMLInputElement;
    expect(number.value).toBe('10');
    rerender(
      <SliderWithInput label="X" value={80} min={0} max={100} onChange={() => {}} />,
    );
    expect(number.value).toBe('80');
  });

  it('renders a unit suffix when provided', () => {
    render(
      <SliderWithInput label="X" value={5} min={0} max={10} unit="%" onChange={() => {}} />,
    );
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('Enter blurs the input to trigger commit', () => {
    const onChange = vi.fn();
    render(
      <SliderWithInput label="Y" value={0} min={0} max={100} onChange={onChange} />,
    );
    const number = screen.getByLabelText(/y value/i);
    fireEvent.change(number, { target: { value: '40' } });
    fireEvent.keyDown(number, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(40);
  });
});
