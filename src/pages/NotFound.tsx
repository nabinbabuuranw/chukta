import { PublicNav } from '../components/PublicNav';
export function NotFound() {
  return (
    <>
      <PublicNav />
      <main id="main" className="wrap py-24 text-center">
        <p className="num text-muted">404</p>
        <h1 className="text-[36px] mt-2">This page isn't on the books</h1>
        <p className="text-ink-2 mt-3">The link may be old or mistyped.</p>
        <a href="/" className="btn-primary mt-8">Go to the homepage</a>
      </main>
    </>
  );
}
