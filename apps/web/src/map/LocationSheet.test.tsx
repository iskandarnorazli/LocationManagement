import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocationSheet, sheetGesture } from './LocationSheet';

afterEach(cleanup);

function Harness({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <LocationSheet
      open={open}
      onOpenChange={setOpen}
      count={3}
      form={<p>the form</p>}
      list={<p>the list</p>}
    />
  );
}

const handle = () => screen.getByRole('button', { name: /locations/i });

describe('sheetGesture (D23)', () => {
  it('opens on a swipe up past 40 px, closes on a swipe down past 40 px, toggles otherwise', () => {
    expect(sheetGesture(-41)).toBe('open');
    expect(sheetGesture(41)).toBe('close');
    expect(sheetGesture(-40)).toBe('toggle');
    expect(sheetGesture(40)).toBe('toggle');
    expect(sheetGesture(0)).toBe('toggle');
  });
});

describe('LocationSheet (D23)', () => {
  it('shows the form and hides the list until opened', () => {
    render(<Harness />);
    expect(screen.getByText('the form')).toBeInTheDocument();
    expect(screen.queryByText('the list')).not.toBeInTheDocument();
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
    expect(handle()).toHaveTextContent('Swipe up for your locations (3)');
  });

  it('toggles on click (and so on Enter or Space, which a button turns into a click)', () => {
    render(<Harness />);
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('the list')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your locations (3)' })).toBeInTheDocument();
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on a swipe up and closes on a swipe down, ignoring the click the swipe ends with', () => {
    render(<Harness />);
    fireEvent.pointerDown(handle(), { clientY: 500 });
    fireEvent.pointerUp(handle(), { clientY: 400 });
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerDown(handle(), { clientY: 400 });
    fireEvent.pointerUp(handle(), { clientY: 480 });
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('a short drag is a tap: the click toggles once', () => {
    render(<Harness />);
    fireEvent.pointerDown(handle(), { clientY: 500 });
    fireEvent.pointerUp(handle(), { clientY: 490 });
    fireEvent.click(handle());
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });
});
