import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { Main } from './main';

const renderAtRoute = (route: string) => {
  window.history.pushState({}, 'Test route', route);
  return render(<Main />);
};

describe('Main routing', () => {
  test('renders the home page with the launch CTAs', async () => {
    renderAtRoute('/');

    expect(
      await screen.findByRole('heading', { name: /build faster with ai\./i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email Adam' })).toHaveAttribute(
      'href',
      'mailto:adam@adamyuras.com'
    );
    expect(screen.getAllByRole('link', { name: 'LinkedIn' })[0]).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/adam-yuras-ai'
    );
  });

  test('keeps the wedding route available', async () => {
    renderAtRoute('/wedding');

    expect(await screen.findByText('Shannon & Adam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP' })).toBeInTheDocument();
  });

  test('keeps the resume route available', async () => {
    renderAtRoute('/resume');

    expect(await screen.findByText('Save as PDF')).toBeInTheDocument();
    expect(
      screen.getByText(/product designer and developer for ai tools at comcast/i)
    ).toBeInTheDocument();
  });

  test('redirects /mindmeld to the home page', async () => {
    renderAtRoute('/mindmeld');

    expect(
      await screen.findByRole('heading', { name: /build faster with ai\./i })
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});
