const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="text-center space-y-3">
      <div className="text-5xl font-bold text-slate-200">404</div>
      <h1 className="text-lg font-semibold text-slate-700">Page not found</h1>
      <p className="text-sm text-slate-400">
        This page doesn't exist. Booking links look like{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">book.v3ro.co.uk/book/your-slug</code>
      </p>
    </div>
  </div>
);

export default NotFound;
